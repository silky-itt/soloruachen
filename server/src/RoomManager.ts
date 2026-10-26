import {
  Room,
  RoomMember,
  Match,
  RoomStatus,
  CodeSnapshot,
  Submission,
  SubmissionStatus,
  MatchFinishReason,
  ConnectionStatus
} from '../../shared/src/types.js';

export interface RoomEventListener {
  onRoomUpdated: (room: Room) => void;
  onRoomCountdown: (roomId: string, countdownSeconds: number, startsAt: number) => void;
  onRoomStarted: (roomId: string, match: Match) => void;
  onRoomFinished: (roomId: string, match: Match, reason: MatchFinishReason, winnerId: string | null) => void;
  onOpponentCodeUpdate: (opponentId: string, snapshot: CodeSnapshot) => void;
  onSubmissionTicker: (roomId: string, submission: Submission) => void;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  // roomId -> { [playerId]: CodeSnapshot }
  private snapshots: Map<string, Map<string, CodeSnapshot>> = new Map();
  // roomId -> Submission[]
  private submissions: Map<string, Submission[]> = new Map();
  // Active countdown / timeout timer handles
  private timers: Map<string, NodeJS.Timeout> = new Map();

  private listener?: RoomEventListener;

  public setListener(listener: RoomEventListener) {
    this.listener = listener;
  }

  public normalizeProblemSlug(input: string): string {
    if (!input) return 'two-sum';
    const trimmed = input.trim();
    // Check if input is a full URL like https://leetcode.com/problems/two-sum/
    const match = trimmed.match(/leetcode\.com\/problems\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    // Clean up if it was entered with slashes
    return trimmed.replace(/^[/\s]+|[/\s]+$/g, '').toLowerCase();
  }

  public generateRoomId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `SOLO-${code}`;
  }

  public createRoom(
    hostSessionId: string,
    hostNickname: string,
    problemSlug: string,
    durationMinutes: number = 20,
    leetcodeUsername?: string,
    isExtensionConnected: boolean = false
  ): Room {
    const roomId = this.generateRoomId();
    const normalizedSlug = this.normalizeProblemSlug(problemSlug);
    const now = Date.now();

    const hostMember: RoomMember = {
      id: hostSessionId,
      nickname: hostNickname,
      isHost: true,
      leetcodeUsername,
      isExtensionConnected,
      isReady: false,
      hasProblemOpened: false,
      connectionStatus: 'connected',
      lastSeenAt: now,
    };

    const room: Room = {
      id: roomId,
      problemSlug: normalizedSlug,
      problemTitle: this.formatSlugToTitle(normalizedSlug),
      durationMinutes: Math.max(5, Math.min(120, durationMinutes)),
      members: {
        [hostSessionId]: hostMember,
      },
      hostId: hostSessionId,
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(roomId, room);
    this.snapshots.set(roomId, new Map());
    this.submissions.set(roomId, []);

    return room;
  }

  public joinRoom(
    roomId: string,
    sessionId: string,
    nickname: string,
    leetcodeUsername?: string,
    isExtensionConnected: boolean = false
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại hoặc đã đóng.' };
    }

    const memberIds = Object.keys(room.members);
    const isExisting = Boolean(room.members[sessionId]);

    // Capacity check: Max 2 players
    if (!isExisting && memberIds.length >= 2) {
      return {
        success: false,
        error: 'Phòng đã đủ 2 người chơi. Bạn không thể tham gia vào trận này.',
      };
    }

    const now = Date.now();
    if (isExisting) {
      // Reconnect existing player
      room.members[sessionId].connectionStatus = 'connected';
      room.members[sessionId].lastSeenAt = now;
      if (nickname) room.members[sessionId].nickname = nickname;
      if (leetcodeUsername) room.members[sessionId].leetcodeUsername = leetcodeUsername;
      if (typeof isExtensionConnected === 'boolean') {
        room.members[sessionId].isExtensionConnected = isExtensionConnected;
      }
    } else {
      // New member joining
      room.members[sessionId] = {
        id: sessionId,
        nickname,
        isHost: false,
        leetcodeUsername,
        isExtensionConnected,
        isReady: false,
        hasProblemOpened: false,
        connectionStatus: 'connected',
        lastSeenAt: now,
      };
    }

    room.updatedAt = now;
    this.listener?.onRoomUpdated(room);

    return { success: true, room };
  }

  public leaveRoom(roomId: string, sessionId: string): { success: boolean } {
    const room = this.rooms.get(roomId);
    if (!room || !room.members[sessionId]) {
      return { success: false };
    }

    delete room.members[sessionId];
    room.updatedAt = Date.now();

    // If host left and another player exists, transfer host
    const remainingIds = Object.keys(room.members);
    if (room.hostId === sessionId && remainingIds.length > 0) {
      room.hostId = remainingIds[0];
      room.members[remainingIds[0]].isHost = true;
    }

    // If no one is left, clean up
    if (remainingIds.length === 0) {
      this.clearTimers(roomId);
      this.rooms.delete(roomId);
      this.snapshots.delete(roomId);
      this.submissions.delete(roomId);
      return { success: true };
    }

    // If match was running, player leaving counts as surrender/cancel
    if (room.status === 'running' || room.status === 'countdown') {
      this.finishMatch(room, 'surrender', remainingIds[0], sessionId);
    } else {
      room.status = 'waiting';
      for (const id of remainingIds) {
        room.members[id].isReady = false;
      }
      this.listener?.onRoomUpdated(room);
    }

    return { success: true };
  }

  public updateConfig(
    roomId: string,
    sessionId: string,
    problemSlug?: string,
    durationMinutes?: number
  ): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== sessionId) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền thay đổi cấu hình phòng.' };
    }
    if (room.status === 'running' || room.status === 'countdown' || room.status === 'judging') {
      return { success: false, error: 'Không thể thay đổi đề hoặc thời gian khi trận đang diễn ra.' };
    }

    if (problemSlug && problemSlug.trim()) {
      room.problemSlug = this.normalizeProblemSlug(problemSlug);
      room.problemTitle = this.formatSlugToTitle(room.problemSlug);
    }
    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      room.durationMinutes = Math.max(5, Math.min(120, durationMinutes));
    }

    // Changing problem or duration invalidates ready states
    for (const id of Object.keys(room.members)) {
      room.members[id].isReady = false;
      room.members[id].hasProblemOpened = false;
    }
    room.status = 'waiting';
    room.updatedAt = Date.now();

    this.listener?.onRoomUpdated(room);
    return { success: true, room };
  }

  public setReady(
    roomId: string,
    sessionId: string,
    isReady: boolean
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.members[sessionId]) {
      return { success: false, error: 'Người chơi không ở trong phòng này.' };
    }
    if (room.status === 'running' || room.status === 'countdown') {
      return { success: false, error: 'Trận đấu đang diễn ra.' };
    }

    room.members[sessionId].isReady = isReady;
    const members = Object.values(room.members);

    if (members.length === 2 && members.every((m) => m.isReady)) {
      room.status = 'ready';
    } else {
      room.status = 'waiting';
    }

    room.updatedAt = Date.now();
    this.listener?.onRoomUpdated(room);
    return { success: true };
  }

  public setProblemOpened(
    roomId: string,
    sessionId: string,
    opened: boolean
  ): { success: boolean } {
    const room = this.rooms.get(roomId);
    if (!room || !room.members[sessionId]) return { success: false };

    room.members[sessionId].hasProblemOpened = opened;
    room.updatedAt = Date.now();
    this.listener?.onRoomUpdated(room);
    return { success: true };
  }

  public startMatch(
    roomId: string,
    sessionId: string
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };
    if (room.hostId !== sessionId) {
      return { success: false, error: 'Chỉ chủ phòng mới có thể bắt đầu trận đấu.' };
    }

    const members = Object.values(room.members);
    if (members.length < 2) {
      return { success: false, error: 'Cần đủ 2 người chơi trước khi bắt đầu.' };
    }
    if (!members.every((m) => m.isReady)) {
      return { success: false, error: 'Cả hai người chơi phải bấm Sẵn sàng trước khi bắt đầu.' };
    }

    // Initiate 3-second countdown
    room.status = 'countdown';
    const countdownSeconds = 3;
    const countdownStartsAt = Date.now();
    const matchStartsAt = countdownStartsAt + countdownSeconds * 1000;
    const durationSeconds = room.durationMinutes * 60;

    const match: Match = {
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: room.id,
      problemSlug: room.problemSlug,
      durationSeconds,
      countdownStartedAt: countdownStartsAt,
      startedAt: matchStartsAt,
      expiresAt: matchStartsAt + durationSeconds * 1000,
      status: 'countdown',
    };

    room.currentMatch = match;
    room.updatedAt = Date.now();

    this.listener?.onRoomUpdated(room);
    this.listener?.onRoomCountdown(room.id, countdownSeconds, matchStartsAt);

    // Schedule official match start after 3 seconds
    const countdownTimer = setTimeout(() => {
      this.officialMatchStart(room.id, match.id);
    }, countdownSeconds * 1000);

    this.timers.set(`${room.id}_countdown`, countdownTimer);

    return { success: true };
  }

  public officialMatchStart(roomId: string, matchId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch || room.currentMatch.id !== matchId) return;

    room.status = 'running';
    room.currentMatch.status = 'running';
    room.currentMatch.startedAt = Date.now();
    room.currentMatch.expiresAt = room.currentMatch.startedAt + room.currentMatch.durationSeconds * 1000;
    room.updatedAt = Date.now();

    this.listener?.onRoomStarted(room.id, room.currentMatch);
    this.listener?.onRoomUpdated(room);

    // Set server match expiration timer
    const remainingMs = room.currentMatch.expiresAt - Date.now();
    const expirationTimer = setTimeout(() => {
      this.handleMatchTimeout(roomId, matchId);
    }, Math.max(0, remainingMs));

    this.timers.set(`${roomId}_expiration`, expirationTimer);
  }

  public syncCode(
    roomId: string,
    sessionId: string,
    matchId: string,
    code: string,
    language: string,
    version: number
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch || room.currentMatch.id !== matchId) {
      return false;
    }
    // Only accept code when match is running
    if (room.status !== 'running' && room.status !== 'judging') {
      return false;
    }
    // Player must be a member
    if (!room.members[sessionId]) {
      return false;
    }

    // Code size guard (128 KB max)
    if (code.length > 131072) {
      code = code.slice(0, 131072);
    }

    const snapshot: CodeSnapshot = {
      playerId: sessionId,
      roomId,
      matchId,
      code,
      language: language || 'python3',
      version,
      updatedAt: Date.now(),
    };

    let roomSnapshots = this.snapshots.get(roomId);
    if (!roomSnapshots) {
      roomSnapshots = new Map();
      this.snapshots.set(roomId, roomSnapshots);
    }
    roomSnapshots.set(sessionId, snapshot);

    // Find opponent ID to broadcast (1v1)
    const opponentId = Object.keys(room.members).find((id) => id !== sessionId);
    if (opponentId) {
      this.listener?.onOpponentCodeUpdate(opponentId, snapshot);
    }

    return true;
  }

  public recordSubmission(
    roomId: string,
    sessionId: string,
    matchId: string,
    problemSlug: string,
    status: SubmissionStatus,
    isRunOnly: boolean,
    runtimeMs?: number,
    memoryMb?: number,
    reportedBy: 'extension' | 'mock' | 'server' = 'extension',
    submissionId?: string
  ): { accepted: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch || room.currentMatch.id !== matchId) {
      return { accepted: false, message: 'Trận đấu không tồn tại hoặc đã kết thúc.' };
    }

    // Must be in running or judging status
    if (room.status !== 'running' && room.status !== 'judging') {
      return { accepted: false, message: 'Trận đấu không nhận bài nộp vào thời điểm này.' };
    }

    const now = Date.now();
    const match = room.currentMatch;

    // Verify submission is within match window (with 10-second server grace period for judging lag)
    if (match.startedAt && now < match.startedAt) {
      return { accepted: false, message: 'Bài nộp trước giờ bắt đầu trận đấu không hợp lệ.' };
    }
    const gracePeriodMs = 10000;
    if (match.expiresAt && now > match.expiresAt + gracePeriodMs) {
      return { accepted: false, message: 'Bài nộp sau khi hết giờ trận đấu không được chấp nhận.' };
    }

    // Problem slug validation
    const normalizedSubSlug = this.normalizeProblemSlug(problemSlug);
    if (normalizedSubSlug !== room.problemSlug) {
      return {
        accepted: false,
        message: `Bài nộp cho đề "${normalizedSubSlug}" không khớp với đề của trận "${room.problemSlug}".`,
      };
    }

    let subList = this.submissions.get(roomId);
    if (!subList) {
      subList = [];
      this.submissions.set(roomId, subList);
    }

    // Check if updating an existing pending submission
    let targetSubmission: Submission | undefined;
    if (submissionId) {
      targetSubmission = subList.find((s) => s.id === submissionId);
    } else {
      targetSubmission = subList.find(
        (s) => s.playerId === sessionId && s.status === 'PENDING' && !s.isRunOnly
      );
    }

    if (targetSubmission) {
      targetSubmission.status = status;
      if (runtimeMs) targetSubmission.runtimeMs = runtimeMs;
      if (memoryMb) targetSubmission.memoryMb = memoryMb;
    } else {
      targetSubmission = {
        id: submissionId || `sub_${now}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: sessionId,
        roomId,
        matchId,
        problemSlug: normalizedSubSlug,
        submittedAtServer: now,
        status,
        runtimeMs,
        memoryMb,
        isRunOnly,
        reportedBy,
      };
      subList.push(targetSubmission);
    }

    // Broadcast ticker event
    this.listener?.onSubmissionTicker(roomId, targetSubmission);

    // If it was just a Run (test), it doesn't affect winning
    if (isRunOnly) {
      return { accepted: true, message: 'Chạy thử hoàn tất.' };
    }

    // Evaluation for official Submit:
    if (status === 'ACCEPTED') {
      // Check if there is an earlier pending submission from any player
      const pendingEarlier = subList.find(
        (s) =>
          !s.isRunOnly &&
          s.status === 'PENDING' &&
          s.id !== targetSubmission!.id &&
          s.submittedAtServer < targetSubmission!.submittedAtServer
      );

      if (pendingEarlier) {
        // We wait for the earlier pending submission verdict!
        room.status = 'judging';
        match.status = 'judging';
        this.listener?.onRoomUpdated(room);
        return {
          accepted: true,
          message: 'Accepted! Đang chờ kết quả bài nộp trước đó để công bố người thắng chính thức.',
        };
      }

      // Check if there is an earlier ACCEPTED submission in the list
      const earlierAccepted = subList
        .filter((s) => !s.isRunOnly && s.status === 'ACCEPTED')
        .sort((a, b) => a.submittedAtServer - b.submittedAtServer)[0];

      const winnerSubmission = earlierAccepted || targetSubmission;
      match.acceptedSubmissionId = winnerSubmission.id;
      this.finishMatch(room, 'accepted_submission', winnerSubmission.playerId);
      return { accepted: true, message: 'ACCEPTED! Trận đấu đã có người chiến thắng!' };
    } else if (status === 'PENDING') {
      room.status = 'judging';
      match.status = 'judging';
      this.listener?.onRoomUpdated(room);
    } else {
      // Submission failed / Wrong Answer
      // Check if there was an ACCEPTED submission waiting for this pending one to resolve
      if (room.status === 'judging') {
        const stillPending = subList.some((s) => !s.isRunOnly && s.status === 'PENDING');
        if (!stillPending) {
          const acceptedSubs = subList
            .filter((s) => !s.isRunOnly && s.status === 'ACCEPTED')
            .sort((a, b) => a.submittedAtServer - b.submittedAtServer);
          if (acceptedSubs.length > 0) {
            match.acceptedSubmissionId = acceptedSubs[0].id;
            this.finishMatch(room, 'accepted_submission', acceptedSubs[0].playerId);
          } else {
            room.status = 'running';
            match.status = 'running';
            this.listener?.onRoomUpdated(room);
          }
        }
      }
    }

    return { accepted: true };
  }

  public surrender(roomId: string, sessionId: string): { success: boolean } {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch) return { success: false };
    if (room.status !== 'running' && room.status !== 'judging') return { success: false };

    const opponentId = Object.keys(room.members).find((id) => id !== sessionId) || null;
    this.finishMatch(room, 'surrender', opponentId, sessionId);
    return { success: true };
  }

  private handleMatchTimeout(roomId: string, matchId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch || room.currentMatch.id !== matchId) return;
    if (room.status === 'finished' || room.status === 'cancelled') return;

    // Check if any submission is pending
    const subList = this.submissions.get(roomId) || [];
    const hasPending = subList.some((s) => !s.isRunOnly && s.status === 'PENDING');

    if (hasPending) {
      room.status = 'judging';
      room.currentMatch.status = 'judging';
      this.listener?.onRoomUpdated(room);

      // Max 15s judging wait before declaring draw
      const judgingTimeout = setTimeout(() => {
        this.resolveJudgingTimeout(roomId, matchId);
      }, 15000);
      this.timers.set(`${roomId}_judging`, judgingTimeout);
      return;
    }

    // No pending and no accepted -> Draw
    this.finishMatch(room, 'timeout_draw', null);
  }

  private resolveJudgingTimeout(roomId: string, matchId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentMatch || room.currentMatch.id !== matchId) return;
    if (room.status === 'finished') return;

    const subList = this.submissions.get(roomId) || [];
    const accepted = subList.find((s) => !s.isRunOnly && s.status === 'ACCEPTED');

    if (accepted) {
      this.finishMatch(room, 'accepted_submission', accepted.playerId);
    } else {
      this.finishMatch(room, 'timeout_draw', null);
    }
  }

  public finishMatch(
    room: Room,
    reason: MatchFinishReason,
    winnerId: string | null,
    surrenderedById?: string
  ) {
    this.clearTimers(room.id);
    room.status = 'finished';

    if (room.currentMatch) {
      room.currentMatch.status = 'finished';
      room.currentMatch.endedAt = Date.now();
      room.currentMatch.winnerId = winnerId;
      room.currentMatch.finishReason = reason;
      room.currentMatch.surrenderedById = surrenderedById;
    }

    room.updatedAt = Date.now();

    if (room.currentMatch) {
      this.listener?.onRoomFinished(room.id, room.currentMatch, reason, winnerId);
    }
    this.listener?.onRoomUpdated(room);
  }

  public rematch(roomId: string, sessionId: string): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };
    if (!room.members[sessionId]) return { success: false, error: 'Không thuộc phòng.' };

    this.clearTimers(roomId);

    // Reset ready flags
    for (const memberId of Object.keys(room.members)) {
      room.members[memberId].isReady = false;
    }

    room.status = 'waiting';
    room.currentMatch = undefined;
    room.updatedAt = Date.now();

    // Clear snapshots and submissions for fresh match
    this.snapshots.set(roomId, new Map());
    this.submissions.set(roomId, []);

    this.listener?.onRoomUpdated(room);
    return { success: true, room };
  }

  public setMemberConnection(
    roomId: string,
    sessionId: string,
    status: ConnectionStatus
  ) {
    const room = this.rooms.get(roomId);
    if (!room || !room.members[sessionId]) return;

    room.members[sessionId].connectionStatus = status;
    room.members[sessionId].lastSeenAt = Date.now();
    room.updatedAt = Date.now();

    this.listener?.onRoomUpdated(room);
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getOpponentSnapshot(roomId: string, sessionId: string): CodeSnapshot | undefined {
    const roomSnapshots = this.snapshots.get(roomId);
    if (!roomSnapshots) return undefined;
    const opponentId = Object.keys(this.getRoom(roomId)?.members || {}).find(
      (id) => id !== sessionId
    );
    if (!opponentId) return undefined;
    return roomSnapshots.get(opponentId);
  }

  private clearTimers(roomId: string) {
    const keys = [`${roomId}_countdown`, `${roomId}_expiration`, `${roomId}_judging`];
    for (const key of keys) {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    }
  }

  private formatSlugToTitle(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
