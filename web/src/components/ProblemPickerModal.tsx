'use client';

import React, { useState } from 'react';
import { X, Dices, Search, Check, Sparkles, BookOpen } from 'lucide-react';
import { CURATED_PROBLEMS, ProblemInfo, getRandomProblem } from '../data/problems';

interface ProblemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (problem: ProblemInfo) => void;
}

export function ProblemPickerModal({
  isOpen,
  onClose,
  onSelect,
}: ProblemPickerModalProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredProblems = CURATED_PROBLEMS.filter((p) => {
    const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
    const matchesQuery =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiff && matchesQuery;
  });

  const handleRandomPick = () => {
    const random = getRandomProblem(selectedDifficulty);
    onSelect(random);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-800 bg-black p-6 shadow-2xl text-zinc-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-200 border border-zinc-800">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Kho Đề Thi Đấu LeetCode</h3>
              <p className="text-xs text-zinc-500">Tuyển chọn các bài toán kinh điển từ Blind 75 / NeetCode 150</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Random button + Difficulty filters + Search */}
        <div className="py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Random Button */}
            <button
              onClick={handleRandomPick}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-md transition active:scale-95"
            >
              <Dices className="w-4 h-4 text-black" />
              <span>
                {selectedDifficulty === 'All'
                  ? '🎲 Bốc đề ngẫu nhiên'
                  : `🎲 Bốc ngẫu nhiên (${selectedDifficulty})`}
              </span>
            </button>

            {/* Difficulty Tabs */}
            <div className="flex items-center rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs">
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    selectedDifficulty === diff
                      ? diff === 'Easy'
                        ? 'bg-emerald-500 text-black'
                        : diff === 'Medium'
                        ? 'bg-amber-400 text-black'
                        : diff === 'Hard'
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {diff === 'All' ? 'Tất cả' : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài hoặc tag (Array, DP, Two Pointers, Tree)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition font-sans"
            />
          </div>
        </div>

        {/* Problems List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredProblems.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">
              Không tìm thấy bài toán phù compliance với từ khóa.
            </div>
          ) : (
            filteredProblems.map((p) => (
              <div
                key={p.slug}
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-700 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-zinc-200 group-hover:text-white transition">
                      {p.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        p.difficulty === 'Easy'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.difficulty === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-500 font-mono">
                    <span>{p.slug}</span>
                    <span>•</span>
                    <span>{p.recommendedMinutes} phút</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold">
                  Chọn đề này →
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <span>Kho đề gồm các bài phổ biến thường gặp khi phỏng vấn</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
