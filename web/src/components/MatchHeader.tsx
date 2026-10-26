'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, Flag, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Room, Submission } from '../../../shared/src/types';

interface MatchHeaderProps {
  room: Room;
  myId: string;
  opponentId?: string;
  recentSubmission?: Submission;
  onSurrender: () => void;
  isMock?: boolean;
}

export function MatchHeader({
  room,
  myId,
  opponentId,
  recentSubmission,
  onSurrender,
  isMock = false,
}: MatchHeaderProps) {
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const match = room.currentMatch;
  const myMember = room.members[myId];
  const opponentMember = opponentId ? room.members[opponentId] : undefined;

  useEffect(() => {
    if (!match?.expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((match.expiresAt! - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [match?.expiresAt]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const problemUrl = `https://leetcode.com/problems/${room.problemSlug}/`;

  return (
    <header className="border-b border-zinc-900 bg-black/95 backdrop-blur-xl px-6 py-3 sticky top-0 z-40">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Problem & LeetCode Action */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base tracking-tight">
                {room.problemTitle || room.problemSlug}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
                {room.problemSlug}
              </span>
            </div>
            <div className="text-xs text-zinc-500 flex items-center space-x-2 mt-0.5 font-mono">
              <span>Phòng: <b className="text-zinc-300">{room.id}</b></span>
              <span>•</span>
              <span>{room.durationMinutes}m duration</span>
            </div>
          </div>

          <a
            href={problemUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Mở LeetCode tab</span>
          </a>
        </div>

        {/* Center: Authoritative Countdown Clock */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-2 px-5 py-2 rounded-xl border font-mono text-xl font-bold tracking-widest shadow-inner ${
              remainingSeconds <= 60
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-400 animate-pulse'
                : 'bg-zinc-950 border-zinc-800 text-white'
            }`}
          >
            <Clock className={`w-4 h-4 ${remainingSeconds <= 60 ? 'text-rose-400' : 'text-zinc-500'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          {room.status === 'judging' && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>Đang chấm kết quả...</span>
            </div>
          )}
        </div>

        {/* Right: Opponent Status & Surrender */}
        <div className="flex items-center space-x-3">
          {recentSubmission && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  recentSubmission.status === 'ACCEPTED'
                    ? 'text-emerald-400'
                    : recentSubmission.status === 'PENDING'
                    ? 'text-amber-400 animate-spin'
                    : 'text-rose-400'
                }`}
              />
              <span className="text-zinc-300 font-mono text-[11px]">
                {recentSubmission.playerId === myId ? 'Bạn' : opponentMember?.nickname || 'Đối thủ'}:{' '}
                <b className="text-white">{recentSubmission.isRunOnly ? 'Run Test' : recentSubmission.status}</b>
              </span>
            </div>
          )}

          <button
            onClick={() => setShowSurrenderConfirm(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Đầu hàng</span>
          </button>
        </div>
      </div>

      {/* Surrender Confirmation Modal */}
      {showSurrenderConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-tight">Xác nhận đầu hàng?</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Trận đấu sẽ kết thúc ngay lập tức và chiến thắng thuộc về đối thủ của bạn.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
              >
                Tiếp tục đấu
              </button>
              <button
                onClick={() => {
                  setShowSurrenderConfirm(false);
                  onSurrender();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-950/50"
              >
                Chấp nhận đầu hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
