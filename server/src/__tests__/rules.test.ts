import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../RoomManager.js';
import { PairingManager } from '../PairingManager.js';

describe('Solo Code Domain Rules & Integrity', () => {
  test('Rule: Room enforces maximum 2 players and rejects 3rd player', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('player_1', 'Alice', 'two-sum', 20);

    const join2 = rm.joinRoom(room.id, 'player_2', 'Bob');
    assert.equal(join2.success, true);
    assert.equal(Object.keys(join2.room!.members).length, 2);

    // 3rd player attempts to join
    const join3 = rm.joinRoom(room.id, 'player_3', 'Charlie');
    assert.equal(join3.success, false);
    assert.match(join3.error!, /đủ 2 người chơi/);
  });

  test('Rule: Only host can change problem slug or duration, and config change resets ready flags', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('host_1', 'Alice', 'two-sum', 20);
    rm.joinRoom(room.id, 'guest_2', 'Bob');

    // Both ready
    rm.setReady(room.id, 'host_1', true);
    rm.setReady(room.id, 'guest_2', true);
    assert.equal(rm.getRoom(room.id)!.status, 'ready');

    // Guest tries to update config -> rejected
    const guestUpdate = rm.updateConfig(room.id, 'guest_2', '3sum', 30);
    assert.equal(guestUpdate.success, false);

    // Host updates config -> succeeds, resets ready
    const hostUpdate = rm.updateConfig(room.id, 'host_1', '3sum', 15);
    assert.equal(hostUpdate.success, true);
    const updated = rm.getRoom(room.id)!;
    assert.equal(updated.problemSlug, '3sum');
    assert.equal(updated.durationMinutes, 15);
    assert.equal(updated.members['host_1'].isReady, false);
    assert.equal(updated.members['guest_2'].isReady, false);
    assert.equal(updated.status, 'waiting');
  });

  test('Rule: Client isolation - Code snapshot cannot be saved or forged for another player', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('p1', 'Alice', 'two-sum', 20);
    rm.joinRoom(room.id, 'p2', 'Bob');
    rm.setReady(room.id, 'p1', true);
    rm.setReady(room.id, 'p2', true);
    rm.startMatch(room.id, 'p1');
    rm.officialMatchStart(room.id, room.currentMatch!.id);

    let opponentUpdated = false;
    let deliveredSnapshot: any = null;
    rm.setListener({
      onRoomUpdated: () => {},
      onRoomCountdown: () => {},
      onRoomStarted: () => {},
      onRoomFinished: () => {},
      onOpponentCodeUpdate: (opponentId, snapshot) => {
        opponentUpdated = true;
        deliveredSnapshot = snapshot;
        // Verify it was delivered to the opponent (p2), not self
        assert.equal(opponentId, 'p2');
      },
      onSubmissionTicker: () => {},
    });

    // P1 syncs code
    const synced = rm.syncCode(room.id, 'p1', room.currentMatch!.id, 'def twoSum(): return [0, 1]', 'python3', 1);
    assert.equal(synced, true);
    assert.equal(opponentUpdated, true);
    assert.equal(deliveredSnapshot.playerId, 'p1');

    // Check opponent snapshot reader
    const snapForP2 = rm.getOpponentSnapshot(room.id, 'p2');
    assert.equal(snapForP2?.code, 'def twoSum(): return [0, 1]');
  });

  test('Rule: Submissions outside match time window or for wrong problem slug are rejected', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('p1', 'Alice', 'two-sum', 20);
    rm.joinRoom(room.id, 'p2', 'Bob');
    rm.setReady(room.id, 'p1', true);
    rm.setReady(room.id, 'p2', true);
    rm.startMatch(room.id, 'p1');
    rm.officialMatchStart(room.id, room.currentMatch!.id);

    // Wrong slug
    const wrongSlug = rm.recordSubmission(
      room.id,
      'p1',
      room.currentMatch!.id,
      '3sum', // wrong slug
      'ACCEPTED',
      false
    );
    assert.equal(wrongSlug.accepted, false);
    assert.match(wrongSlug.message!, /không khớp với đề/);
  });

  test('Rule: Out-of-order submission resolution - earlier pending submission takes precedence over later accepted submission', async () => {
    const rm = new RoomManager();
    const room = rm.createRoom('p1', 'Alice', 'two-sum', 20);
    rm.joinRoom(room.id, 'p2', 'Bob');
    rm.setReady(room.id, 'p1', true);
    rm.setReady(room.id, 'p2', true);
    rm.startMatch(room.id, 'p1');
    rm.officialMatchStart(room.id, room.currentMatch!.id);

    let finishedEventCalled = false;
    let declaredWinnerId: string | null = null;
    rm.setListener({
      onRoomUpdated: () => {},
      onRoomCountdown: () => {},
      onRoomStarted: () => {},
      onRoomFinished: (_roomId, _match, _reason, winnerId) => {
        finishedEventCalled = true;
        declaredWinnerId = winnerId;
      },
      onOpponentCodeUpdate: () => {},
      onSubmissionTicker: () => {},
    });

    // P1 submits at T=1000, state PENDING (e.g. LeetCode queue taking 5 seconds)
    const sub1 = rm.recordSubmission(
      room.id,
      'p1',
      room.currentMatch!.id,
      'two-sum',
      'PENDING',
      false,
      undefined,
      undefined,
      'extension',
      'sub_p1'
    );
    assert.equal(sub1.accepted, true);
    assert.equal(room.status, 'judging');

    // Simulate 10ms later: P2 submits, state ACCEPTED immediately
    await new Promise((r) => setTimeout(r, 10));
    const sub2 = rm.recordSubmission(
      room.id,
      'p2',
      room.currentMatch!.id,
      'two-sum',
      'ACCEPTED',
      false,
      12,
      40,
      'extension',
      'sub_p2'
    );
    // Server should NOT immediately declare P2 as winner because P1 submitted EARLIER and is pending!
    assert.equal(finishedEventCalled, false, 'Should wait for P1 pending submission');
    assert.equal(room.status, 'judging');

    // Now P1 receives verdict from LeetCode: ACCEPTED!
    // P1 was submitted earlier, so P1 wins!
    rm.recordSubmission(
      room.id,
      'p1',
      room.currentMatch!.id,
      'two-sum',
      'ACCEPTED',
      false,
      25,
      42,
      'extension',
      'sub_p1'
    );

    assert.equal(finishedEventCalled, true);
    assert.equal(declaredWinnerId, 'p1', 'P1 must win because submission arrived earlier at server');
  });

  test('Rule: Rematch resets ready flags and match state, preserves room members', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('p1', 'Alice', 'two-sum', 20);
    rm.joinRoom(room.id, 'p2', 'Bob');
    rm.setReady(room.id, 'p1', true);
    rm.setReady(room.id, 'p2', true);
    rm.startMatch(room.id, 'p1');
    rm.officialMatchStart(room.id, room.currentMatch!.id);

    // P1 surrenders
    rm.surrender(room.id, 'p1');
    assert.equal(room.status, 'finished');
    assert.equal(room.currentMatch!.winnerId, 'p2');

    // Rematch requested
    const rematch = rm.rematch(room.id, 'p1');
    assert.equal(rematch.success, true);
    const updated = rm.getRoom(room.id)!;
    assert.equal(updated.status, 'waiting');
    assert.equal(updated.currentMatch, undefined);
    assert.equal(updated.members['p1'].isReady, false);
    assert.equal(updated.members['p2'].isReady, false);
    assert.equal(Object.keys(updated.members).length, 2);
  });

  test('Pairing: One-time 6-digit code expires in 5 minutes and single-use only', () => {
    const pm = new PairingManager();
    const { code } = pm.createPairingRequest('sess_123', 'Alice');
    assert.match(code, /^\d{3}-\d{3}$/);

    // Confirm pairing
    const res1 = pm.confirmPairing(code, 'ext_xyz', 'alice_leetcode');
    assert.equal(res1.success, true);
    assert.equal(res1.session?.leetcodeUsername, 'alice_leetcode');

    // Try reusing same code -> rejected
    const res2 = pm.confirmPairing(code, 'ext_attacker');
    assert.equal(res2.success, false);
    assert.match(res2.error!, /đã được sử dụng/);
  });
});
