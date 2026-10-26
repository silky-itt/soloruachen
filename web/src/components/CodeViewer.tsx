'use client';

import React from 'react';
import { Lock, Code2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  playerName: string;
  isOpponent?: boolean;
  isStale?: boolean;
  lastUpdated?: number;
  connectionStatus?: string;
}

export function CodeViewer({
  code,
  language = 'python3',
  playerName,
  isOpponent = false,
  isStale = false,
  lastUpdated,
  connectionStatus = 'connected',
}: CodeViewerProps) {
  const lines = (code || '// Đang chờ đối thủ bắt đầu gõ code...').split('\n');

  const handleCopyAttempt = (e: React.ClipboardEvent) => {
    if (isOpponent) {
      e.preventDefault();
      alert('Chế độ chỉ xem: Không được sao chép code của đối thủ trong trận đấu.');
    }
  };

  const timeAgo = lastUpdated
    ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))
    : 0;

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
        isOpponent
          ? 'border-zinc-800 bg-black hover:border-zinc-700'
          : 'border-zinc-800 bg-black hover:border-zinc-700'
      }`}
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' && !isStale
                ? isOpponent
                  ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400'
            }`}
          />
          <span className="font-semibold text-xs tracking-wide text-zinc-100">
            {playerName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono uppercase tracking-wider">
            {language}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isStale && (
            <span className="inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span>Mất tín hiệu ({timeAgo}s trước)</span>
            </span>
          )}

          {isOpponent ? (
            <span className="inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 font-medium">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Chỉ xem • Chống copy</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span>Đồng bộ từ LeetCode</span>
            </span>
          )}
        </div>
      </div>

      {/* Code Body */}
      <div
        className={`relative flex-1 overflow-auto font-mono text-[13px] leading-6 p-4 select-text bg-black ${
          isOpponent ? 'opponent-code-pane opponent-watermark' : ''
        }`}
        onCopy={handleCopyAttempt}
        onContextMenu={(e) => {
          if (isOpponent) e.preventDefault();
        }}
      >
        {isOpponent && (
          <div className="absolute top-3 right-4 pointer-events-none opacity-25 text-[9px] uppercase font-mono tracking-widest text-zinc-500">
            SOLO CODE • PROTECTED VIEW
          </div>
        )}

        <div className="flex">
          {/* Line Numbers */}
          <div className="select-none pr-4 text-right text-zinc-600 border-r border-zinc-900 w-10 font-mono text-xs">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code Text Content */}
          <div className="pl-4 flex-1 text-zinc-200 whitespace-pre">
            {lines.map((line, i) => (
              <div key={i} className="hover:bg-zinc-900/40 px-1 rounded transition-colors">
                <span className={highlightSyntax(line)}>{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pane Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-950 text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center space-x-4">
          <span>{lines.length} lines</span>
          <span>{code ? code.length : 0} chars</span>
        </div>
        {lastUpdated ? (
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span>Sync: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>
        ) : (
          <span className="text-zinc-600">Sẵn sàng</span>
        )}
      </div>
    </div>
  );
}

function highlightSyntax(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return 'text-zinc-500 italic';
  }
  if (trimmed.startsWith('def ') || trimmed.startsWith('class ') || trimmed.startsWith('function ')) {
    return 'text-emerald-400 font-semibold';
  }
  if (trimmed.startsWith('return ') || trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
    return 'text-purple-400 font-medium';
  }
  if (trimmed.includes('if ') || trimmed.includes('else:') || trimmed.includes('for ') || trimmed.includes('while ')) {
    return 'text-sky-300';
  }
  return 'text-zinc-200';
}
