'use client';

import React, { useState } from 'react';
import {
  Play,
  UserPlus,
  CheckCircle,
  Code,
  Send,
  WifiOff,
  Flag,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
  Radio,
  Clock
} from 'lucide-react';
import { Room } from '../../../shared/src/types';

interface SimulationBarProps {
  room: Room | null;
  mode: 'mock' | 'live';
  onToggleMode: (mode: 'mock' | 'live') => void;
  onSimulateOpponentJoin: () => void;
  onSimulateOpponentReady: () => void;
  onSimulateCountdown: () => void;
  onSimulateOpponentTyping: () => void;
  onSimulateOpponentRun: () => void;
  onSimulateOpponentSubmit: (accepted: boolean) => void;
  onSimulateMySubmit: (accepted: boolean) => void;
  onSimulateStale: () => void;
  onSimulateSurrender: () => void;
  onSimulateRematch: () => void;
}

export function SimulationBar({
  room,
  mode,
  onToggleMode,
  onSimulateOpponentJoin,
  onSimulateOpponentReady,
  onSimulateCountdown,
  onSimulateOpponentTyping,
  onSimulateOpponentRun,
  onSimulateOpponentSubmit,
  onSimulateMySubmit,
  onSimulateStale,
  onSimulateSurrender,
  onSimulateRematch,
}: SimulationBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none p-3">
      <div className="max-w-5xl mx-auto pointer-events-auto rounded-2xl border border-zinc-800 bg-black/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-200">
        {/* Dock Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-950/70 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">MÔ PHỎNG PROTOTYPE</span>
            </span>
            <span className="text-zinc-500 hidden sm:inline text-[11px]">
              Kịch bản kiểm thử luồng nhanh không cần chờ đối thủ thật
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-[11px]">
              <button
                onClick={() => onToggleMode('mock')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                  mode === 'mock'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Mock Demo</span>
              </button>
              <button
                onClick={() => onToggleMode('live')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                  mode === 'live'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>Live Server</span>
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dock Controls */}
        {isExpanded && (
          <div className="p-3 bg-black flex flex-wrap items-center gap-2 text-xs">
            {/* Lobby Phase Controls */}
            {(!room || room.status === 'waiting' || room.status === 'ready') && (
              <>
                <button
                  onClick={onSimulateOpponentJoin}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                  <span>1. Đối thủ vào phòng</span>
                </button>
                <button
                  onClick={onSimulateOpponentReady}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Đối thủ sẵn sàng</span>
                </button>
                <button
                  onClick={onSimulateCountdown}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-black font-bold transition shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-black" />
                  <span>3. Đếm ngược (3s)</span>
                </button>
              </>
            )}

            {/* In-Match Phase Controls */}
            {room && (room.status === 'running' || room.status === 'judging') && (
              <>
                <button
                  onClick={onSimulateOpponentTyping}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <Code className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gõ code realtime</span>
                </button>
                <button
                  onClick={onSimulateOpponentRun}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>Run Test</span>
                </button>
                <button
                  onClick={() => onSimulateOpponentSubmit(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đối thủ Submit (Accepted)</span>
                </button>
                <button
                  onClick={() => onSimulateMySubmit(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition font-semibold"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bạn Submit (Thắng)</span>
                </button>
                <button
                  onClick={onSimulateStale}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mạng giật (Stale)</span>
                </button>
                <button
                  onClick={onSimulateSurrender}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>Đầu hàng</span>
                </button>
              </>
            )}

            {/* Finished Phase Controls */}
            {room && room.status === 'finished' && (
              <button
                onClick={onSimulateRematch}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-black" />
                <span>Mô phỏng Đấu lại (Rematch)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
