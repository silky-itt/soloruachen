'use client';

import React from 'react';
import { Trophy, Frown, Equal, RotateCcw, Home, Clock, Award, ShieldAlert } from 'lucide-react';
import { Room } from '../../../shared/src/types';

interface ResultScreenProps {
  room: Room;
  myId: string;
  opponentId?: string;
  onRematch: () => void;
  onHome: () => void;
}

export function ResultScreen({
  room,
  myId,
  opponentId,
  onRematch,
  onHome,
}: ResultScreenProps) {
  const match = room.currentMatch;
  const isWinner = match?.winnerId === myId;
  const isLoser = match?.winnerId && match?.winnerId !== myId;
  const isDraw = match?.winnerId === null;

  const opponentMember = opponentId ? room.members[opponentId] : undefined;
  const myMember = room.members[myId];

  return (
    <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-black p-8 shadow-2xl text-center space-y-6">
        {/* Result Icon & Heading */}
        <div>
          {isWinner && (
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Trophy className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                CHIẾN THẮNG
              </h2>
              <p className="text-sm text-zinc-400">
                Chúc mừng bạn đã giải quyết thành công bài toán trước đối thủ!
              </p>
            </div>
          )}

          {isLoser && (
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <Frown className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                THẤT BẠI
              </h2>
              <p className="text-sm text-zinc-400">
                {match?.finishReason === 'surrender'
                  ? match?.surrenderedById === myId
                    ? 'Bạn đã đầu hàng trận đấu.'
                    : 'Đối thủ đã vượt lên nộp bài Accepted trước.'
                  : `${opponentMember?.nickname || 'Đối thủ'} đã nộp bài Accepted trước.`}
              </p>
            </div>
          )}

          {isDraw && (
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center justify-center">
                <Equal className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                HÒA NHAU
              </h2>
              <p className="text-sm text-zinc-400">
                Hết thời gian thi đấu và cả hai người chơi chưa có bài nộp Accepted hợp lệ.
              </p>
            </div>
          )}
        </div>

        {/* Match Breakdown Stats Card */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 text-left space-y-4">
          <div className="text-[11px] uppercase tracking-widest font-mono text-zinc-500 border-b border-zinc-900 pb-2 flex items-center justify-between">
            <span>Chi tiết trận đấu</span>
            <span className="text-zinc-400">Phòng: {room.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500">Đề bài:</span>
              <div className="font-bold text-zinc-200">
                {room.problemTitle || room.problemSlug}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500">Kết quả:</span>
              <div className="font-bold text-zinc-200">
                {match?.finishReason === 'accepted_submission' && 'Accepted hợp lệ'}
                {match?.finishReason === 'surrender' && 'Đầu hàng'}
                {match?.finishReason === 'timeout_draw' && 'Hết giờ quy định'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500">Bạn:</span>
              <div className="font-semibold text-emerald-400 font-mono">
                {myMember?.nickname} {myMember?.leetcodeUsername && `(@${myMember.leetcodeUsername})`}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500">Đối thủ:</span>
              <div className="font-semibold text-zinc-300 font-mono">
                {opponentMember?.nickname || 'Chưa có'} {opponentMember?.leetcodeUsername && `(@${opponentMember.leetcodeUsername})`}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="text-[11px] text-zinc-500 flex items-center justify-center space-x-1.5 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
          <span>Kết quả ghi nhận qua Chrome Extension trên LeetCode</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={onHome}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>

          <button
            onClick={onRematch}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-white hover:bg-zinc-200 transition shadow-lg shadow-white/10"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đấu lại (Rematch)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
