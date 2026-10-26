import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager.js';
import { PairingManager } from './PairingManager.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  Match,
  MatchFinishReason,
  CodeSnapshot,
  Submission
} from '../../shared/src/types.js';

interface SocketData {
  sessionId: string;
  nickname: string;
  roomId?: string;
  isExtension: boolean;
  leetcodeUsername?: string;
}

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();
const pairingManager = new PairingManager();

// Map sessionId -> Socket ID
const sessionSockets = new Map<string, string>();

// Wire RoomManager events to Socket.IO broadcasts
roomManager.setListener({
  onRoomUpdated: (room: Room) => {
    io.to(room.id).emit('room:updated', { room });
  },
  onRoomCountdown: (roomId: string, countdownSeconds: number, startsAt: number) => {
    io.to(roomId).emit('room:countdown', { countdownSeconds, startsAt });
  },
  onRoomStarted: (roomId: string, match: Match) => {
    io.to(roomId).emit('room:started', { match });
  },
  onRoomFinished: (roomId: string, match: Match, reason: MatchFinishReason, winnerId: string | null) => {
    io.to(roomId).emit('room:finished', { match, reason, winnerId });
  },
  onOpponentCodeUpdate: (opponentId: string, snapshot: CodeSnapshot) => {
    const socketId = sessionSockets.get(opponentId);
    if (socketId) {
      io.to(socketId).emit('code:opponent_update', snapshot);
    }
  },
  onSubmissionTicker: (roomId: string, submission: Submission) => {
    io.to(roomId).emit('submission:ticker', submission);
  },
});

// REST Endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

app.get('/api/room/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Phòng không tồn tại' });
  }
  return res.json(room);
});

app.post('/api/pairing/verify', (req, res) => {
  const { code, extensionId, leetcodeUsername } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Thiếu mã ghép nối' });
  }
  const result = pairingManager.confirmPairing(code, extensionId, leetcodeUsername);
  if (!result.success || !result.session) {
    return res.status(400).json({ error: result.error });
  }

  // Notify web client socket about successful pairing
  const webSocketId = sessionSockets.get(result.session.appSessionId);
  if (webSocketId) {
    io.to(webSocketId).emit('pairing:success', { leetcodeUsername: result.session.leetcodeUsername });
    io.to(webSocketId).emit('session:updated', {
      sessionId: result.session.appSessionId,
      nickname: result.session.nickname,
      isExtensionConnected: true,
      leetcodeUsername: result.session.leetcodeUsername,
    });
  }

  return res.json({ success: true, session: result.session });
});

// Socket.IO Handling
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
  // Session Init
  socket.on('session:init', (data, callback) => {
    const sessionId = data.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nickname = data.nickname || `Player_${sessionId.slice(-4)}`;

    socket.data.sessionId = sessionId;
    socket.data.nickname = nickname;
    sessionSockets.set(sessionId, socket.id);

    const pairedSession = pairingManager.getSessionByAppSessionId(sessionId);

    socket.emit('session:updated', {
      sessionId,
      nickname,
      isExtensionConnected: pairedSession?.status === 'paired',
      leetcodeUsername: pairedSession?.leetcodeUsername,
    });

    if (callback) {
      callback({ sessionId, success: true });
    }
  });

  // Pairing: Request Code
  socket.on('pairing:request', (callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) {
      return callback({ code: '', expiresAt: 0 });
    }
    const result = pairingManager.createPairingRequest(sessionId, socket.data.nickname);
    callback(result);
  });

  // Pairing: Confirm Code (called from Extension or Web)
  socket.on('pairing:confirm', (data, callback) => {
    const result = pairingManager.confirmPairing(data.code, socket.id, data.leetcodeUsername);
    if (!result.success || !result.session) {
      return callback({ success: false, message: result.error });
    }

    // Notify the web socket of the owner session
    const targetSocketId = sessionSockets.get(result.session.appSessionId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('pairing:success', { leetcodeUsername: result.session.leetcodeUsername });
      io.to(targetSocketId).emit('session:updated', {
        sessionId: result.session.appSessionId,
        nickname: result.session.nickname,
        isExtensionConnected: true,
        leetcodeUsername: result.session.leetcodeUsername,
      });
    }

    callback({ success: true });
  });

  // Pairing: Disconnect
  socket.on('pairing:disconnect', (callback) => {
    const sessionId = socket.data.sessionId;
    if (sessionId) {
      pairingManager.revokePairing(sessionId);
      socket.emit('session:updated', {
        sessionId,
        nickname: socket.data.nickname,
        isExtensionConnected: false,
      });
    }
    callback({ success: true });
  });

  // Room: Create
  socket.on('room:create', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) {
      return callback({ success: false, error: 'Chưa khởi tạo phiên.' });
    }

    const pairedSession = pairingManager.getSessionByAppSessionId(sessionId);
    const room = roomManager.createRoom(
      sessionId,
      socket.data.nickname,
      data.problemSlug,
      data.durationMinutes || 20,
      pairedSession?.leetcodeUsername,
      pairedSession?.status === 'paired'
    );

    socket.data.roomId = room.id;
    socket.join(room.id);

    callback({ success: true, room });
  });

  // Room: Join
  socket.on('room:join', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) {
      return callback({ success: false, error: 'Chưa khởi tạo phiên.' });
    }

    const pairedSession = pairingManager.getSessionByAppSessionId(sessionId);
    const result = roomManager.joinRoom(
      data.roomId,
      sessionId,
      socket.data.nickname,
      pairedSession?.leetcodeUsername,
      pairedSession?.status === 'paired'
    );

    if (!result.success || !result.room) {
      return callback({ success: false, error: result.error });
    }

    socket.data.roomId = result.room.id;
    socket.join(result.room.id);

    // Send latest opponent snapshot if reconnecting mid-match
    if (result.room.status === 'running' || result.room.status === 'judging') {
      const snap = roomManager.getOpponentSnapshot(result.room.id, sessionId);
      if (snap) {
        socket.emit('code:opponent_update', snap);
      }
    }

    callback({ success: true, room: result.room });
  });

  // Room: Leave
  socket.on('room:leave', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (sessionId && data.roomId) {
      roomManager.leaveRoom(data.roomId, sessionId);
      socket.leave(data.roomId);
      socket.data.roomId = undefined;
    }
    callback({ success: true });
  });

  // Room: Update Config
  socket.on('room:update_config', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false, error: 'Không có phiên hợp lệ' });

    const result = roomManager.updateConfig(
      data.roomId,
      sessionId,
      data.problemSlug,
      data.durationMinutes
    );
    callback(result);
  });

  // Room: Ready toggle
  socket.on('room:ready', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false, error: 'Không có phiên hợp lệ' });

    const result = roomManager.setReady(data.roomId, sessionId, data.isReady);
    callback(result);
  });

  // Room: Problem Opened toggle
  socket.on('room:opened_problem', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false });

    const result = roomManager.setProblemOpened(data.roomId, sessionId, data.opened);
    callback(result);
  });

  // Room: Start Match
  socket.on('room:start', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false, error: 'Không có phiên hợp lệ' });

    const result = roomManager.startMatch(data.roomId, sessionId);
    callback(result);
  });

  // In-Match: Sync Code
  socket.on('code:sync', (data) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return;
    // Client cannot overwrite code as another player: socket.data.sessionId is enforced!
    roomManager.syncCode(data.roomId, sessionId, data.matchId, data.code, data.language, data.version);
  });

  // In-Match: Submission Reported
  socket.on('match:submission', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback?.({ accepted: false, message: 'Chưa xác thực' });

    const result = roomManager.recordSubmission(
      data.roomId,
      sessionId,
      data.matchId,
      data.problemSlug,
      data.status,
      data.isRunOnly,
      data.runtimeMs,
      data.memoryMb,
      'extension'
    );
    callback?.(result);
  });

  // In-Match: Surrender
  socket.on('match:surrender', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false });

    const result = roomManager.surrender(data.roomId, sessionId);
    callback(result);
  });

  // In-Match: Rematch
  socket.on('match:rematch', (data, callback) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return callback({ success: false, error: 'Chưa xác thực' });

    const result = roomManager.rematch(data.roomId, sessionId);
    callback(result);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const sessionId = socket.data.sessionId;
    const roomId = socket.data.roomId;

    if (sessionId) {
      sessionSockets.delete(sessionId);
      if (roomId) {
        roomManager.setMemberConnection(roomId, sessionId, 'disconnected');
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Solo Code Server] running on http://localhost:${PORT}`);
});
