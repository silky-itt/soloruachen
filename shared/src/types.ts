/**
 * Shared Types for Solo Code (Web + Server + Extension)
 * 1v1 Code Duel Platform connected with LeetCode
 */

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'stale'
  | 'error';

export type RoomStatus =
  | 'waiting'      // Waiting for 2nd player or problem setup
  | 'ready'        // Both players marked ready
  | 'countdown'    // 3-second countdown before match starts
  | 'running'      // Match in progress, code sync active
  | 'judging'      // Time expired or submission waiting for verdict
  | 'finished'     // Winner decided, match over
  | 'cancelled';   // Room closed or cancelled before start

export type SubmissionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'UNKNOWN';

export type MatchFinishReason =
  | 'accepted_submission'  // One player got Accepted first
  | 'surrender'            // A player surrendered
  | 'timeout_draw'         // Match ended with no accepted submissions
  | 'draw_simultaneous'    // Submissions accepted at the exact same server millisecond
  | 'cancelled';

export interface RoomMember {
  id: string;                      // Unique player session ID
  nickname: string;                // Chosen app nickname
  isHost: boolean;
  leetcodeUsername?: string;       // Verified or self-reported from extension
  isExtensionConnected: boolean;
  isReady: boolean;
  hasProblemOpened: boolean;
  connectionStatus: ConnectionStatus;
  lastSeenAt: number;              // Timestamp (ms)
}

export interface CodeSnapshot {
  playerId: string;
  roomId: string;
  matchId: string;
  code: string;
  language: string;
  version: number;
  updatedAt: number;               // Server timestamp (ms)
  isStale?: boolean;
}

export interface Submission {
  id: string;                      // Server assigned or submission ID
  playerId: string;
  roomId: string;
  matchId: string;
  problemSlug: string;
  submittedAtServer: number;       // Authoritative server timestamp (ms)
  clientTimestamp?: number;
  status: SubmissionStatus;
  runtimeMs?: number;
  memoryMb?: number;
  isRunOnly: boolean;              // Run test (not scored) vs Submit (scored)
  errorMessage?: string;
  reportedBy: 'extension' | 'mock' | 'server';
}

export interface Match {
  id: string;
  roomId: string;
  problemSlug: string;
  durationSeconds: number;
  startedAt?: number;              // Authoritative start timestamp (ms)
  countdownStartedAt?: number;     // Authoritative countdown timestamp (ms)
  expiresAt?: number;              // Authoritative expiration timestamp (ms)
  endedAt?: number;
  status: RoomStatus;
  winnerId?: string | null;        // null if draw or unfinished
  finishReason?: MatchFinishReason;
  surrenderedById?: string;
  acceptedSubmissionId?: string;
}

export interface Room {
  id: string;                      // 6-8 char room code (e.g., "SOLO-4921")
  problemSlug: string;             // Normalized LeetCode slug, e.g. "two-sum"
  problemTitle?: string;
  durationMinutes: number;         // Default 20 mins
  members: Record<string, RoomMember>; // Max 2 members: [playerId]: RoomMember
  hostId: string;
  status: RoomStatus;
  currentMatch?: Match;
  createdAt: number;
  updatedAt: number;
}

export interface PairingSession {
  pairingCode: string;             // 6-digit one-time code (e.g., "734-921")
  appSessionId: string;
  nickname: string;
  createdAt: number;
  expiresAt: number;               // 5 minutes TTL
  status: 'pending' | 'paired' | 'expired';
  extensionId?: string;
  leetcodeUsername?: string;
}

// Socket Events Definition
export interface ClientToServerEvents {
  // Session & Pairing
  'session:init': (data: { sessionId?: string; nickname: string }, callback: (res: { sessionId: string; success: boolean }) => void) => void;
  'pairing:request': (callback: (res: { code: string; expiresAt: number }) => void) => void;
  'pairing:confirm': (data: { code: string; leetcodeUsername?: string }, callback: (res: { success: boolean; message?: string }) => void) => void;
  'pairing:disconnect': (callback: (res: { success: boolean }) => void) => void;

  // Room Management
  'room:create': (data: { problemSlug: string; durationMinutes?: number }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:join': (data: { roomId: string }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:leave': (data: { roomId: string }, callback: (res: { success: boolean }) => void) => void;
  'room:update_config': (data: { roomId: string; problemSlug?: string; durationMinutes?: number }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:ready': (data: { roomId: string; isReady: boolean }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'room:opened_problem': (data: { roomId: string; opened: boolean }, callback: (res: { success: boolean }) => void) => void;
  'room:start': (data: { roomId: string }, callback: (res: { success: boolean; error?: string }) => void) => void;

  // In-Match Realtime Sync
  'code:sync': (data: { roomId: string; matchId: string; code: string; language: string; version: number }) => void;
  'match:submission': (data: {
    roomId: string;
    matchId: string;
    problemSlug: string;
    status: SubmissionStatus;
    isRunOnly: boolean;
    runtimeMs?: number;
    memoryMb?: number;
    submissionId?: string;
  }, callback?: (res: { accepted: boolean; message?: string }) => void) => void;
  'match:surrender': (data: { roomId: string; matchId: string }, callback: (res: { success: boolean }) => void) => void;
  'match:rematch': (data: { roomId: string }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
}

export interface ServerToClientEvents {
  'session:updated': (data: { sessionId: string; nickname: string; isExtensionConnected: boolean; leetcodeUsername?: string }) => void;
  'pairing:success': (data: { leetcodeUsername?: string }) => void;
  'pairing:expired': (data: { code: string }) => void;

  'room:updated': (data: { room: Room }) => void;
  'room:countdown': (data: { countdownSeconds: number; startsAt: number }) => void;
  'room:started': (data: { match: Match }) => void;
  'room:finished': (data: { match: Match; reason: MatchFinishReason; winnerId: string | null }) => void;
  'room:error': (data: { message: string; code: string }) => void;

  'code:opponent_update': (data: CodeSnapshot) => void;
  'submission:ticker': (data: Submission) => void;
  'opponent:connection_change': (data: { playerId: string; status: ConnectionStatus; lastSeenAt: number }) => void;
}
