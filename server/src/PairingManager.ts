import { PairingSession } from '../../shared/src/types.js';

export class PairingManager {
  private pairings: Map<string, PairingSession> = new Map(); // pairingCode -> PairingSession
  private sessionToCode: Map<string, string> = new Map();     // appSessionId -> pairingCode
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Create or refresh a pairing request for an app session.
   */
  public createPairingRequest(appSessionId: string, nickname: string): { code: string; expiresAt: number } {
    // Invalidate existing if any
    const existingCode = this.sessionToCode.get(appSessionId);
    if (existingCode) {
      this.pairings.delete(existingCode);
      this.sessionToCode.delete(appSessionId);
    }

    const code = this.generateCode();
    const now = Date.now();
    const expiresAt = now + this.TTL_MS;

    const session: PairingSession = {
      pairingCode: code,
      appSessionId,
      nickname,
      createdAt: now,
      expiresAt,
      status: 'pending',
    };

    this.pairings.set(code, session);
    this.sessionToCode.set(appSessionId, code);

    return { code, expiresAt };
  }

  /**
   * Confirm pairing from Chrome Extension with the one-time code.
   */
  public confirmPairing(
    code: string,
    extensionId?: string,
    leetcodeUsername?: string
  ): { success: boolean; session?: PairingSession; error?: string } {
    const formattedCode = code.trim().replace(/\s+/g, '-');
    const session = this.pairings.get(formattedCode);

    if (!session) {
      return { success: false, error: 'Mã ghép nối không hợp lệ hoặc đã hết hạn.' };
    }

    if (Date.now() > session.expiresAt) {
      this.pairings.delete(formattedCode);
      this.sessionToCode.delete(session.appSessionId);
      return { success: false, error: 'Mã ghép nối đã quá hạn 5 phút. Vui lòng tạo mã mới trên Web.' };
    }

    if (session.status === 'paired') {
      return { success: false, error: 'Mã ghép nối này đã được sử dụng.' };
    }

    session.status = 'paired';
    session.extensionId = extensionId;
    if (leetcodeUsername && leetcodeUsername.trim()) {
      session.leetcodeUsername = leetcodeUsername.trim();
    }

    return { success: true, session };
  }

  public getSessionByCode(code: string): PairingSession | undefined {
    const session = this.pairings.get(code.trim());
    if (session && Date.now() > session.expiresAt) {
      this.pairings.delete(code.trim());
      this.sessionToCode.delete(session.appSessionId);
      return undefined;
    }
    return session;
  }

  public getSessionByAppSessionId(appSessionId: string): PairingSession | undefined {
    const code = this.sessionToCode.get(appSessionId);
    if (!code) return undefined;
    return this.getSessionByCode(code);
  }

  public revokePairing(appSessionId: string): boolean {
    const code = this.sessionToCode.get(appSessionId);
    if (!code) return false;
    this.pairings.delete(code);
    this.sessionToCode.delete(appSessionId);
    return true;
  }

  private generateCode(): string {
    const part1 = Math.floor(100 + Math.random() * 900);
    const part2 = Math.floor(100 + Math.random() * 900);
    return `${part1}-${part2}`;
  }
}
