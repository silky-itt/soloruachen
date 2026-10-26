import {
  Room,
  Match,
  RoomMember,
  CodeSnapshot,
  Submission,
  RoomStatus,
  MatchFinishReason,
} from '../../../shared/src/types';

export interface MockEventListener {
  onRoomUpdated: (room: Room) => void;
  onOpponentCode: (snapshot: CodeSnapshot) => void;
  onSubmission: (sub: Submission) => void;
  onCountdown: (seconds: number) => void;
  onMatchStarted: (match: Match) => void;
  onMatchFinished: (match: Match, reason: MatchFinishReason, winnerId: string | null) => void;
}

const SAMPLE_PYTHON_SNIPPETS = [
  `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Bắt đầu suy nghĩ thuật toán...`,
  `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Dùng hashmap lưu giá trị đã duyệt\n        seen = {}`,
  `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Dùng hashmap lưu giá trị đã duyệt\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num`,
  `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Dùng hashmap lưu giá trị đã duyệt\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []`,
];

export class MockAdapter {
  private listener?: MockEventListener;
  public room: Room | null = null;
  public myId = 'player_mock_user';
  public opponentId = 'player_mock_opponent';
  public myNickname = 'Dev_Bạn';
  public opponentNickname = 'Opponent_Pro';
  public isExtensionConnected = false;
  public leetcodeUsername: string | undefined = undefined;

  private typingIndex = 0;
  private opponentCode = SAMPLE_PYTHON_SNIPPETS[0];
  private myCode = 'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass';
  private countdownTimer?: any;
  private matchTimer?: any;

  public setListener(listener: MockEventListener) {
    this.listener = listener;
  }

  public initSession(nickname: string) {
    this.myNickname = nickname;
  }

  public simulatePairing(): { code: string; expiresAt: number } {
    const code = '582-194';
    const expiresAt = Date.now() + 5 * 60 * 1000;
    setTimeout(() => {
      this.isExtensionConnected = true;
      this.leetcodeUsername = `${this.myNickname.toLowerCase()}_lc`;
      if (this.room && this.room.members[this.myId]) {
        this.room.members[this.myId].isExtensionConnected = true;
        this.room.members[this.myId].leetcodeUsername = this.leetcodeUsername;
        this.listener?.onRoomUpdated(this.room);
      }
    }, 1500);
    return { code, expiresAt };
  }

  public createRoom(problemSlug: string = 'two-sum', durationMinutes: number = 20): Room {
    const now = Date.now();
    const myMember: RoomMember = {
      id: this.myId,
      nickname: this.myNickname,
      isHost: true,
      leetcodeUsername: this.leetcodeUsername,
      isExtensionConnected: this.isExtensionConnected,
      isReady: false,
      hasProblemOpened: false,
      connectionStatus: 'connected',
      lastSeenAt: now,
    };

    this.room = {
      id: 'SOLO-8821',
      problemSlug,
      problemTitle: 'Two Sum',
      durationMinutes,
      members: {
        [this.myId]: myMember,
      },
      hostId: this.myId,
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
    };

    this.listener?.onRoomUpdated(this.room);
    return this.room;
  }

  public simulateOpponentJoin() {
    if (!this.room) return;
    const now = Date.now();
    this.room.members[this.opponentId] = {
      id: this.opponentId,
      nickname: this.opponentNickname,
      isHost: false,
      leetcodeUsername: 'algo_master_99',
      isExtensionConnected: true,
      isReady: false,
      hasProblemOpened: true,
      connectionStatus: 'connected',
      lastSeenAt: now,
    };
    this.room.updatedAt = now;
    this.listener?.onRoomUpdated(this.room);
  }

  public toggleReady(isReady: boolean) {
    if (!this.room || !this.room.members[this.myId]) return;
    this.room.members[this.myId].isReady = isReady;

    const allReady = Object.values(this.room.members).length === 2 &&
      Object.values(this.room.members).every((m) => m.isReady);

    this.room.status = allReady ? 'ready' : 'waiting';
    this.room.updatedAt = Date.now();
    this.listener?.onRoomUpdated(this.room);
  }

  public simulateOpponentReady(ready: boolean = true) {
    if (!this.room || !this.room.members[this.opponentId]) return;
    this.room.members[this.opponentId].isReady = ready;
    this.room.members[this.opponentId].hasProblemOpened = true;

    const allReady = Object.values(this.room.members).length === 2 &&
      Object.values(this.room.members).every((m) => m.isReady);

    this.room.status = allReady ? 'ready' : 'waiting';
    this.room.updatedAt = Date.now();
    this.listener?.onRoomUpdated(this.room);
  }

  public startCountdown() {
    if (!this.room) return;
    this.room.status = 'countdown';
    const countdownSeconds = 3;
    const startsAt = Date.now() + 3000;
    const duration = this.room.durationMinutes * 60;

    const match: Match = {
      id: 'match_mock_1',
      roomId: this.room.id,
      problemSlug: this.room.problemSlug,
      durationSeconds: duration,
      countdownStartedAt: Date.now(),
      startedAt: startsAt,
      expiresAt: startsAt + duration * 1000,
      status: 'countdown',
    };
    this.room.currentMatch = match;
    this.listener?.onRoomUpdated(this.room);
    this.listener?.onCountdown(countdownSeconds);

    this.countdownTimer = setTimeout(() => {
      if (!this.room || !this.room.currentMatch) return;
      this.room.status = 'running';
      this.room.currentMatch.status = 'running';
      this.room.currentMatch.startedAt = Date.now();
      this.room.currentMatch.expiresAt = Date.now() + duration * 1000;
      this.listener?.onRoomUpdated(this.room);
      this.listener?.onMatchStarted(this.room.currentMatch);
    }, 3000);
  }

  public simulateOpponentTyping() {
    this.typingIndex = (this.typingIndex + 1) % SAMPLE_PYTHON_SNIPPETS.length;
    this.opponentCode = SAMPLE_PYTHON_SNIPPETS[this.typingIndex];

    const snapshot: CodeSnapshot = {
      playerId: this.opponentId,
      roomId: this.room?.id || 'SOLO-8821',
      matchId: this.room?.currentMatch?.id || 'match_mock_1',
      code: this.opponentCode,
      language: 'python3',
      version: this.typingIndex + 1,
      updatedAt: Date.now(),
    };
    this.listener?.onOpponentCode(snapshot);
  }

  public simulateOpponentRun() {
    if (!this.room || !this.room.currentMatch) return;
    const sub: Submission = {
      id: `sub_run_${Date.now()}`,
      playerId: this.opponentId,
      roomId: this.room.id,
      matchId: this.room.currentMatch.id,
      problemSlug: this.room.problemSlug,
      submittedAtServer: Date.now(),
      status: 'ACCEPTED',
      runtimeMs: 42,
      isRunOnly: true,
      reportedBy: 'mock',
    };
    this.listener?.onSubmission(sub);
  }

  public simulateOpponentSubmit(accepted: boolean = true) {
    if (!this.room || !this.room.currentMatch) return;
    const now = Date.now();

    // First emit PENDING
    const pendingSub: Submission = {
      id: `sub_submit_${now}`,
      playerId: this.opponentId,
      roomId: this.room.id,
      matchId: this.room.currentMatch.id,
      problemSlug: this.room.problemSlug,
      submittedAtServer: now,
      status: 'PENDING',
      isRunOnly: false,
      reportedBy: 'mock',
    };
    this.room.status = 'judging';
    this.room.currentMatch.status = 'judging';
    this.listener?.onRoomUpdated(this.room);
    this.listener?.onSubmission(pendingSub);

    // After 2.5s resolve verdict
    setTimeout(() => {
      if (!this.room || !this.room.currentMatch) return;
      const finalStatus = accepted ? 'ACCEPTED' : 'WRONG_ANSWER';
      const resolvedSub: Submission = {
        ...pendingSub,
        status: finalStatus,
        runtimeMs: accepted ? 14 : undefined,
        memoryMb: accepted ? 16.5 : undefined,
      };
      this.listener?.onSubmission(resolvedSub);

      if (accepted) {
        this.room.status = 'finished';
        this.room.currentMatch.status = 'finished';
        this.room.currentMatch.winnerId = this.opponentId;
        this.room.currentMatch.finishReason = 'accepted_submission';
        this.room.currentMatch.endedAt = Date.now();
        this.listener?.onMatchFinished(this.room.currentMatch, 'accepted_submission', this.opponentId);
        this.listener?.onRoomUpdated(this.room);
      } else {
        this.room.status = 'running';
        this.room.currentMatch.status = 'running';
        this.listener?.onRoomUpdated(this.room);
      }
    }, 2500);
  }

  public simulateMySubmit(accepted: boolean = true) {
    if (!this.room || !this.room.currentMatch) return;
    const now = Date.now();

    const pendingSub: Submission = {
      id: `sub_my_${now}`,
      playerId: this.myId,
      roomId: this.room.id,
      matchId: this.room.currentMatch.id,
      problemSlug: this.room.problemSlug,
      submittedAtServer: now,
      status: 'PENDING',
      isRunOnly: false,
      reportedBy: 'mock',
    };
    this.room.status = 'judging';
    this.room.currentMatch.status = 'judging';
    this.listener?.onRoomUpdated(this.room);
    this.listener?.onSubmission(pendingSub);

    setTimeout(() => {
      if (!this.room || !this.room.currentMatch) return;
      const resolvedSub: Submission = {
        ...pendingSub,
        status: accepted ? 'ACCEPTED' : 'WRONG_ANSWER',
        runtimeMs: accepted ? 8 : undefined,
      };
      this.listener?.onSubmission(resolvedSub);

      if (accepted) {
        this.room.status = 'finished';
        this.room.currentMatch.status = 'finished';
        this.room.currentMatch.winnerId = this.myId;
        this.room.currentMatch.finishReason = 'accepted_submission';
        this.room.currentMatch.endedAt = Date.now();
        this.listener?.onMatchFinished(this.room.currentMatch, 'accepted_submission', this.myId);
        this.listener?.onRoomUpdated(this.room);
      }
    }, 2000);
  }

  public simulateSurrender() {
    if (!this.room || !this.room.currentMatch) return;
    this.room.status = 'finished';
    this.room.currentMatch.status = 'finished';
    this.room.currentMatch.winnerId = this.opponentId;
    this.room.currentMatch.finishReason = 'surrender';
    this.room.currentMatch.surrenderedById = this.myId;
    this.room.currentMatch.endedAt = Date.now();
    this.listener?.onMatchFinished(this.room.currentMatch, 'surrender', this.opponentId);
    this.listener?.onRoomUpdated(this.room);
  }

  public simulateRematch() {
    if (!this.room) return;
    this.room.status = 'waiting';
    this.room.currentMatch = undefined;
    for (const id of Object.keys(this.room.members)) {
      this.room.members[id].isReady = false;
    }
    this.opponentCode = SAMPLE_PYTHON_SNIPPETS[0];
    this.typingIndex = 0;
    this.listener?.onRoomUpdated(this.room);
  }

  public simulateOpponentConnection(status: 'connected' | 'stale' | 'disconnected') {
    if (!this.room || !this.room.members[this.opponentId]) return;
    this.room.members[this.opponentId].connectionStatus = status;
    this.room.members[this.opponentId].lastSeenAt = Date.now() - (status === 'stale' ? 12000 : 0);
    this.listener?.onRoomUpdated(this.room);
  }

  public updateMyCode(code: string) {
    this.myCode = code;
  }

  public getMyCode(): string {
    return this.myCode;
  }

  public getOpponentCode(): string {
    return this.opponentCode;
  }
}
