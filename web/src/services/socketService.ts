import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  Match,
  CodeSnapshot,
  Submission,
  MatchFinishReason,
  SubmissionStatus,
} from '../../../shared/src/types';

export interface SocketEventListener {
  onRoomUpdated: (room: Room) => void;
  onRoomCountdown: (countdownSeconds: number, startsAt: number) => void;
  onRoomStarted: (match: Match) => void;
  onRoomFinished: (match: Match, reason: MatchFinishReason, winnerId: string | null) => void;
  onOpponentCodeUpdate: (snapshot: CodeSnapshot) => void;
  onSubmissionTicker: (sub: Submission) => void;
  onPairingSuccess: (leetcodeUsername?: string) => void;
  onSessionUpdated: (data: { sessionId: string; nickname: string; isExtensionConnected: boolean; leetcodeUsername?: string }) => void;
  onConnectionChange: (connected: boolean) => void;
}

export class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private listener: SocketEventListener | null = null;
  public sessionId: string = '';
  public nickname: string = '';
  public isExtensionConnected: boolean = false;
  public leetcodeUsername?: string;

  public setListener(listener: SocketEventListener) {
    this.listener = listener;
  }

  public connect(url: string = 'http://localhost:3001'): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket && this.socket.connected) {
        return resolve(true);
      }

      this.socket = io(url, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.listener?.onConnectionChange(true);
        resolve(true);
      });

      this.socket.on('disconnect', () => {
        this.listener?.onConnectionChange(false);
      });

      this.socket.on('room:updated', (data) => {
        this.listener?.onRoomUpdated(data.room);
      });

      this.socket.on('room:countdown', (data) => {
        this.listener?.onRoomCountdown(data.countdownSeconds, data.startsAt);
      });

      this.socket.on('room:started', (data) => {
        this.listener?.onRoomStarted(data.match);
      });

      this.socket.on('room:finished', (data) => {
        this.listener?.onRoomFinished(data.match, data.reason, data.winnerId);
      });

      this.socket.on('code:opponent_update', (data) => {
        this.listener?.onOpponentCodeUpdate(data);
      });

      this.socket.on('submission:ticker', (data) => {
        this.listener?.onSubmissionTicker(data);
      });

      this.socket.on('pairing:success', (data) => {
        this.isExtensionConnected = true;
        this.leetcodeUsername = data.leetcodeUsername;
        this.listener?.onPairingSuccess(data.leetcodeUsername);
      });

      this.socket.on('session:updated', (data) => {
        this.sessionId = data.sessionId;
        this.nickname = data.nickname;
        this.isExtensionConnected = data.isExtensionConnected;
        this.leetcodeUsername = data.leetcodeUsername;
        this.listener?.onSessionUpdated(data);
      });
    });
  }

  public initSession(nickname: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve('');
      this.socket.emit('session:init', { nickname, sessionId: this.sessionId || undefined }, (res) => {
        this.sessionId = res.sessionId;
        this.nickname = nickname;
        resolve(res.sessionId);
      });
    });
  }

  public requestPairing(): Promise<{ code: string; expiresAt: number }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ code: '', expiresAt: 0 });
      this.socket.emit('pairing:request', (res) => {
        resolve(res);
      });
    });
  }

  public disconnectPairing(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('pairing:disconnect', (res) => {
        this.isExtensionConnected = false;
        resolve(res.success);
      });
    });
  }

  public createRoom(problemSlug: string, durationMinutes: number = 20): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Chưa kết nối server' });
      this.socket.emit('room:create', { problemSlug, durationMinutes }, (res) => {
        resolve(res);
      });
    });
  }

  public joinRoom(roomId: string): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Chưa kết nối server' });
      this.socket.emit('room:join', { roomId }, (res) => {
        resolve(res);
      });
    });
  }

  public leaveRoom(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('room:leave', { roomId }, (res) => {
        resolve(res.success);
      });
    });
  }

  public updateConfig(roomId: string, problemSlug?: string, durationMinutes?: number): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Chưa kết nối server' });
      this.socket.emit('room:update_config', { roomId, problemSlug, durationMinutes }, (res) => {
        resolve(res);
      });
    });
  }

  public setReady(roomId: string, isReady: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('room:ready', { roomId, isReady }, (res) => {
        resolve(res.success);
      });
    });
  }

  public setProblemOpened(roomId: string, opened: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('room:opened_problem', { roomId, opened }, (res) => {
        resolve(res.success);
      });
    });
  }

  public startMatch(roomId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Chưa kết nối server' });
      this.socket.emit('room:start', { roomId }, (res) => {
        resolve(res);
      });
    });
  }

  public syncCode(roomId: string, matchId: string, code: string, language: string, version: number) {
    if (!this.socket) return;
    this.socket.emit('code:sync', { roomId, matchId, code, language, version });
  }

  public submitResult(
    roomId: string,
    matchId: string,
    problemSlug: string,
    status: SubmissionStatus,
    isRunOnly: boolean,
    runtimeMs?: number,
    memoryMb?: number
  ) {
    if (!this.socket) return;
    this.socket.emit('match:submission', {
      roomId,
      matchId,
      problemSlug,
      status,
      isRunOnly,
      runtimeMs,
      memoryMb,
    });
  }

  public surrender(roomId: string, matchId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('match:surrender', { roomId, matchId }, (res) => {
        resolve(res.success);
      });
    });
  }

  public rematch(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(false);
      this.socket.emit('match:rematch', { roomId }, (res) => {
        resolve(res.success);
      });
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
