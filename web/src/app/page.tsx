'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Chrome,
  Plus,
  LogIn,
  CheckCircle2,
  Copy,
  ExternalLink,
  Users,
  Settings,
  ShieldCheck,
  Sparkles,
  Radio,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Room, Submission, CodeSnapshot } from '../../../shared/src/types';
import { MockAdapter } from '../services/mockAdapter';
import { SocketService } from '../services/socketService';
import { CodeViewer } from '../components/CodeViewer';
import { MatchHeader } from '../components/MatchHeader';
import { PairingModal } from '../components/PairingModal';
import { SimulationBar } from '../components/SimulationBar';
import { ResultScreen } from '../components/ResultScreen';
import { ProblemPickerModal } from '../components/ProblemPickerModal';
import { getRandomProblem, ProblemInfo } from '../data/problems';
import { Dices, BookOpen, RefreshCw } from 'lucide-react';

export default function SoloCodeApp() {
  // App state
  const [mode, setMode] = useState<'mock' | 'live'>('mock');
  const [nickname, setNickname] = useState('Dev_Bạn');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  // Pairing Modal state
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState(0);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState<string | undefined>(undefined);

  // Room config inputs
  const [inputSlug, setInputSlug] = useState('two-sum');
  const [inputDuration, setInputDuration] = useState(20);
  const [inputRoomId, setInputRoomId] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false);

  // Active match state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [myCode, setMyCode] = useState(
    'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Viết giải thuật của bạn ở tab LeetCode\n        pass'
  );
  const [opponentSnapshot, setOpponentSnapshot] = useState<CodeSnapshot | null>(null);
  const [recentSubmission, setRecentSubmission] = useState<Submission | undefined>(undefined);

  // Services
  const mockAdapterRef = useRef<MockAdapter>(new MockAdapter());
  const socketServiceRef = useRef<SocketService>(new SocketService());

  const myId = mode === 'mock' ? mockAdapterRef.current.myId : socketServiceRef.current.sessionId || 'my_session';
  const opponentId = room
    ? Object.keys(room.members).find((id) => id !== myId)
    : undefined;

  // Initialize Mock Adapter listeners
  useEffect(() => {
    const mock = mockAdapterRef.current;
    mock.initSession(nickname);

    mock.setListener({
      onRoomUpdated: (updatedRoom) => {
        setRoom({ ...updatedRoom });
      },
      onOpponentCode: (snapshot) => {
        setOpponentSnapshot(snapshot);
      },
      onSubmission: (sub) => {
        setRecentSubmission(sub);
      },
      onCountdown: (seconds) => {
        setCountdown(seconds);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(timer);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      },
      onMatchStarted: () => {
        setCountdown(null);
      },
      onMatchFinished: () => {},
    });
  }, [nickname]);

  // Handle Mode Toggle (Mock <-> Live)
  const handleToggleMode = async (newMode: 'mock' | 'live') => {
    setMode(newMode);
    setRoom(null);
    setOpponentSnapshot(null);
    setRecentSubmission(undefined);

    if (newMode === 'live') {
      const socket = socketServiceRef.current;
      await socket.connect();
      await socket.initSession(nickname);

      socket.setListener({
        onRoomUpdated: (updatedRoom) => setRoom({ ...updatedRoom }),
        onRoomCountdown: (seconds) => {
          setCountdown(seconds);
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev === null || prev <= 1) {
                clearInterval(timer);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        },
        onRoomStarted: () => setCountdown(null),
        onRoomFinished: () => {},
        onOpponentCodeUpdate: (snapshot) => setOpponentSnapshot(snapshot),
        onSubmissionTicker: (sub) => setRecentSubmission(sub),
        onPairingSuccess: (lcUser) => {
          setIsExtensionConnected(true);
          setLeetcodeUsername(lcUser);
        },
        onSessionUpdated: (data) => {
          setIsExtensionConnected(data.isExtensionConnected);
          setLeetcodeUsername(data.leetcodeUsername);
        },
        onConnectionChange: () => {},
      });
    }
  };

  // Open Pairing Modal
  const handleOpenPairing = async () => {
    if (mode === 'mock') {
      const { code, expiresAt } = mockAdapterRef.current.simulatePairing();
      setPairingCode(code);
      setPairingExpiresAt(expiresAt);
      setIsPairingModalOpen(true);
    } else {
      const { code, expiresAt } = await socketServiceRef.current.requestPairing();
      setPairingCode(code);
      setPairingExpiresAt(expiresAt);
      setIsPairingModalOpen(true);
    }
  };

  const handleDisconnectPairing = async () => {
    if (mode === 'mock') {
      mockAdapterRef.current.isExtensionConnected = false;
      mockAdapterRef.current.leetcodeUsername = undefined;
      setIsExtensionConnected(false);
      setLeetcodeUsername(undefined);
    } else {
      await socketServiceRef.current.disconnectPairing();
      setIsExtensionConnected(false);
      setLeetcodeUsername(undefined);
    }
  };

  // Create Room
  const handleCreateRoom = async () => {
    setRoomError(null);
    if (mode === 'mock') {
      const newRoom = mockAdapterRef.current.createRoom(inputSlug, inputDuration);
      setRoom(newRoom);
    } else {
      const res = await socketServiceRef.current.createRoom(inputSlug, inputDuration);
      if (res.success && res.room) {
        setRoom(res.room);
      } else {
        setRoomError(res.error || 'Không thể tạo phòng');
      }
    }
  };

  // Quick Random Problem
  const handleQuickRandom = () => {
    const p = getRandomProblem();
    if (room && room.status === 'waiting') {
      handleUpdateRoomProblem(p);
    } else {
      setInputSlug(p.slug);
      setInputDuration(p.recommendedMinutes);
    }
  };

  const handleSelectProblem = (p: ProblemInfo) => {
    if (room && room.status === 'waiting') {
      handleUpdateRoomProblem(p);
    } else {
      setInputSlug(p.slug);
      setInputDuration(p.recommendedMinutes);
    }
  };

  const handleUpdateRoomProblem = async (p: ProblemInfo) => {
    if (!room) return;
    if (mode === 'mock') {
      const mock = mockAdapterRef.current;
      if (mock.room) {
        mock.room.problemSlug = p.slug;
        mock.room.problemTitle = p.title;
        mock.room.durationMinutes = p.recommendedMinutes;
        for (const id of Object.keys(mock.room.members)) {
          mock.room.members[id].isReady = false;
        }
        mock.room.status = 'waiting';
        setRoom({ ...mock.room });
      }
    } else {
      await socketServiceRef.current.updateConfig(room.id, p.slug, p.recommendedMinutes);
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    setRoomError(null);
    if (!inputRoomId.trim()) {
      setRoomError('Vui lòng nhập mã phòng');
      return;
    }
    if (mode === 'mock') {
      const newRoom = mockAdapterRef.current.createRoom('two-sum', 20);
      newRoom.id = inputRoomId.toUpperCase();
      setRoom(newRoom);
    } else {
      const res = await socketServiceRef.current.joinRoom(inputRoomId.toUpperCase());
      if (res.success && res.room) {
        setRoom(res.room);
      } else {
        setRoomError(res.error || 'Không thể vào phòng');
      }
    }
  };

  // Toggle Ready
  const handleToggleReady = async () => {
    if (!room) return;
    const currentMember = room.members[myId];
    const nextReady = !currentMember?.isReady;

    if (mode === 'mock') {
      mockAdapterRef.current.toggleReady(nextReady);
    } else {
      await socketServiceRef.current.setReady(room.id, nextReady);
    }
  };

  // Host Start Match
  const handleStartMatch = async () => {
    if (!room) return;
    if (mode === 'mock') {
      mockAdapterRef.current.startCountdown();
    } else {
      const res = await socketServiceRef.current.startMatch(room.id);
      if (!res.success) {
        setRoomError(res.error || 'Chưa thể bắt đầu trận đấu');
      }
    }
  };

  // Surrender
  const handleSurrender = async () => {
    if (!room) return;
    if (mode === 'mock') {
      mockAdapterRef.current.simulateSurrender();
    } else {
      if (room.currentMatch) {
        await socketServiceRef.current.surrender(room.id, room.currentMatch.id);
      }
    }
  };

  // Rematch
  const handleRematch = async () => {
    if (!room) return;
    if (mode === 'mock') {
      mockAdapterRef.current.simulateRematch();
    } else {
      await socketServiceRef.current.rematch(room.id);
    }
  };

  const copyRoomCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.id);
      alert(`Đã chép mã phòng: ${room.id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 pb-24 selection:bg-white selection:text-black">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-900 bg-black/90 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white font-mono">SOLO CODE</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                1v1 Duel
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">Đấu code realtime trực tiếp trên LeetCode</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Extension Pairing Badge Button */}
          <button
            onClick={handleOpenPairing}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition shadow-sm ${
              isExtensionConnected
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Chrome className={`w-3.5 h-3.5 ${isExtensionConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className="font-mono">
              {isExtensionConnected
                ? `@${leetcodeUsername || 'Đã kết nối'}`
                : 'Kết nối Extension'}
            </span>
          </button>

          {/* Nickname pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <span className="text-zinc-500">Tên:</span>
            {isEditingNickname ? (
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={() => setIsEditingNickname(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingNickname(false)}
                autoFocus
                className="bg-black text-white px-2 py-0.5 rounded border border-zinc-700 text-xs w-28 outline-none font-mono"
              />
            ) : (
              <span
                onClick={() => setIsEditingNickname(true)}
                className="font-bold text-zinc-200 cursor-pointer hover:text-white transition font-mono"
                title="Bấm để đổi tên"
              >
                {nickname}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: Home / Room Setup (when no room selected) */}
        {!room && (
          <div className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center space-y-8 animate-in fade-in duration-200">
            {/* Hero Banner */}
            <div className="text-center space-y-3 pt-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Thi đấu trực tiếp trên LeetCode • Không cần chấm qua server</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                Đấu Code 1v1 Cùng Bạn Bè
              </h1>
              <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Mỗi người giải bài trên chính tài khoản LeetCode của mình. Xem code đối thủ realtime từng ký tự ở chế độ chỉ xem, bảo vệ thao tác copy.
              </p>
            </div>

            {/* Error Message */}
            {roomError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{roomError}</span>
              </div>
            )}

            {/* Room Creation & Join Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Tạo phòng mới */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-7 flex flex-col justify-between space-y-5 hover:border-zinc-700 transition">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-zinc-900 text-white border border-zinc-800">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white tracking-tight">Tạo phòng đấu mới</h3>
                      <p className="text-xs text-zinc-500">Bốc ngẫu nhiên hoặc chọn bài toán LeetCode</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Quick Select & Random Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleQuickRandom}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition active:scale-95"
                      >
                        <Dices className="w-3.5 h-3.5 text-amber-400" />
                        <span>🎲 Bốc ngẫu nhiên</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsProblemPickerOpen(true)}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                        <span>📚 Kho đề chọn lọc</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1">
                        Link hoặc Slug bài toán:
                      </label>
                      <input
                        type="text"
                        value={inputSlug}
                        onChange={(e) => setInputSlug(e.target.value)}
                        placeholder="two-sum hoặc https://leetcode.com/problems/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1">
                        Thời lượng trận đấu:
                      </label>
                      <select
                        value={inputDuration}
                        onChange={(e) => setInputDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-100 outline-none font-mono"
                      >
                        <option value={10}>10 phút (Chớp nhoáng)</option>
                        <option value={15}>15 phút</option>
                        <option value={20}>20 phút (Tiêu chuẩn)</option>
                        <option value={30}>30 phút</option>
                        <option value={45}>45 phút</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs tracking-wide transition shadow-lg shadow-white/5 flex items-center justify-center space-x-2"
                >
                  <span>Tạo phòng & Lấy mã mời</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: Vào phòng bằng mã */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-7 flex flex-col justify-between space-y-5 hover:border-zinc-700 transition">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-zinc-900 text-white border border-zinc-800">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white tracking-tight">Vào phòng bạn bè</h3>
                      <p className="text-xs text-zinc-500">Nhập mã phòng 6-8 ký tự từ bạn bè</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1">
                        Mã phòng:
                      </label>
                      <input
                        type="text"
                        value={inputRoomId}
                        onChange={(e) => setInputRoomId(e.target.value)}
                        placeholder="Ví dụ: SOLO-4821"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-500 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none font-mono uppercase transition"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl bg-black border border-zinc-900 text-[11px] text-zinc-500">
                      💡 Phòng đấu tối đa 2 người. Người thứ 3 tham gia sẽ tự động bị từ chối.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleJoinRoom}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-bold text-xs tracking-wide transition flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Tham gia phòng</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Lobby View (waiting or ready) */}
        {room && (room.status === 'waiting' || room.status === 'ready' || room.status === 'countdown') && (
          <div className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center space-y-6 animate-in fade-in duration-200">
            {/* Lobby Header Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500">
                  Phòng chờ đấu 1v1
                </span>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h2 className="text-2xl font-black text-white tracking-tight">{room.problemTitle || room.problemSlug}</h2>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-black text-zinc-400 border border-zinc-800">
                    {room.durationMinutes} phút
                  </span>
                  {room.members[myId]?.isHost && room.status === 'waiting' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleQuickRandom}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-semibold transition flex items-center space-x-1"
                        title="Bốc ngẫu nhiên đề khác"
                      >
                        <Dices className="w-3 h-3 text-amber-400" />
                        <span>🎲 Đổi ngẫu nhiên</span>
                      </button>
                      <button
                        onClick={() => setIsProblemPickerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-semibold transition flex items-center space-x-1"
                        title="Chọn đề từ kho đề"
                      >
                        <BookOpen className="w-3 h-3 text-sky-400" />
                        <span>📚 Chọn đề khác</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Code Badge */}
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono font-semibold text-zinc-500">Mã phòng</div>
                  <div className="font-mono font-black text-lg text-white tracking-wider">{room.id}</div>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
                  title="Chép mã phòng"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2-Player Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player 1 Card (Host/Self) */}
              {(() => {
                const p1 = room.members[myId];
                return (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-bold">
                          {p1?.nickname.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                            <span>{p1?.nickname} (Bạn)</span>
                            {p1?.isHost && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {p1?.leetcodeUsername ? `@${p1.leetcodeUsername}` : 'Chưa gắn LeetCode'}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                          p1?.isReady
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {p1?.isReady ? 'READY' : 'WAITING'}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900">
                      <span>Extension: {p1?.isExtensionConnected ? 'Đã bật' : 'Chưa bật'}</span>
                      <button
                        onClick={handleToggleReady}
                        className={`px-4 py-2 rounded-xl font-bold transition shadow-sm ${
                          p1?.isReady
                            ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                            : 'bg-white hover:bg-zinc-200 text-black font-extrabold'
                        }`}
                      >
                        {p1?.isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Player 2 Card (Opponent or Empty slot) */}
              {(() => {
                const p2 = opponentId ? room.members[opponentId] : undefined;
                if (!p2) {
                  return (
                    <div className="rounded-3xl border border-dashed border-zinc-800 bg-black p-6 flex flex-col items-center justify-center space-y-3 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-zinc-400">Đang chờ bạn bè tham gia...</div>
                        <div className="text-xs text-zinc-600 mt-1 font-mono">Gửi mã phòng <b className="text-zinc-400">{room.id}</b> để mời</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-bold">
                          {p2.nickname.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                            <span>{p2.nickname} (Đối thủ)</span>
                            {p2.isHost && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {p2.leetcodeUsername ? `@${p2.leetcodeUsername}` : 'Đã vào phòng'}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                          p2.isReady
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {p2.isReady ? 'READY' : 'WAITING'}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900">
                      <span>Trạng thái: {p2.connectionStatus === 'connected' ? 'Trực tuyến' : 'Mất kết nối'}</span>
                      <span className="text-zinc-600 text-[11px]">Đối thủ tự bấm sẵn sàng</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Launch Problem CTA */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ExternalLink className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">
                  Mở bài tập trên LeetCode để chuẩn bị môi trường:
                </span>
              </div>
              <a
                href={`https://leetcode.com/problems/${room.problemSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-semibold transition"
              >
                Mở {room.problemSlug} trên LeetCode ↗
              </a>
            </div>

            {/* Start Match CTA (Host only) */}
            {room.members[myId]?.isHost && (
              <div className="pt-4 text-center">
                <button
                  onClick={handleStartMatch}
                  disabled={room.status !== 'ready'}
                  className={`px-10 py-4 rounded-2xl font-black text-sm tracking-widest transition shadow-2xl ${
                    room.status === 'ready'
                      ? 'bg-white hover:bg-zinc-200 text-black shadow-white/10 cursor-pointer animate-pulse'
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  {room.status === 'ready'
                    ? 'BẮT ĐẦU TRẬN ĐẤU (3s)'
                    : 'CHỜ CẢ HAI BẤM SẴN SÀNG...'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Countdown Modal Overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in">
            <div className="text-center space-y-4">
              <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono font-bold">
                Trận đấu sắp bắt đầu
              </div>
              <div className="font-mono text-9xl font-black text-white animate-ping">
                {countdown}
              </div>
              <div className="text-zinc-600 text-xs font-mono">Chuyển sang tab LeetCode để sẵn sàng gõ code!</div>
            </div>
          </div>
        )}

        {/* VIEW 4: Active Duel Watcher (running or judging) */}
        {room && (room.status === 'running' || room.status === 'judging') && (
          <div className="flex-1 flex flex-col bg-black">
            <MatchHeader
              room={room}
              myId={myId}
              opponentId={opponentId}
              recentSubmission={recentSubmission}
              onSurrender={handleSurrender}
              isMock={mode === 'mock'}
            />

            {/* Dual Code Panes View */}
            <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[550px] bg-black">
              {/* Left Pane: My Code */}
              <CodeViewer
                code={myCode}
                language="python3"
                playerName={`${room.members[myId]?.nickname || 'Bạn'} (Code của bạn)`}
                isOpponent={false}
                lastUpdated={Date.now()}
                connectionStatus={room.members[myId]?.connectionStatus}
              />

              {/* Right Pane: Opponent Code (Read-only, copy-protected) */}
              <CodeViewer
                code={
                  opponentSnapshot?.code ||
                  (mode === 'mock'
                    ? mockAdapterRef.current.getOpponentCode()
                    : '// Đang chờ đối thủ gõ code trên LeetCode...')
                }
                language={opponentSnapshot?.language || 'python3'}
                playerName={`${opponentId ? room.members[opponentId]?.nickname : 'Đối thủ'} (Chỉ xem)`}
                isOpponent={true}
                isStale={opponentId ? room.members[opponentId]?.connectionStatus === 'stale' : false}
                lastUpdated={opponentSnapshot?.updatedAt}
                connectionStatus={opponentId ? room.members[opponentId]?.connectionStatus : 'connected'}
              />
            </div>
          </div>
        )}

        {/* VIEW 5: Match Result Screen */}
        {room && room.status === 'finished' && (
          <ResultScreen
            room={room}
            myId={myId}
            opponentId={opponentId}
            onRematch={handleRematch}
            onHome={() => setRoom(null)}
          />
        )}
      </main>

      {/* Problem Picker Modal */}
      <ProblemPickerModal
        isOpen={isProblemPickerOpen}
        onClose={() => setIsProblemPickerOpen(false)}
        onSelect={handleSelectProblem}
      />

      {/* Extension Pairing Modal */}
      <PairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        pairingCode={pairingCode}
        expiresAt={pairingExpiresAt}
        isConnected={isExtensionConnected}
        leetcodeUsername={leetcodeUsername}
        onRefreshCode={handleOpenPairing}
        onDisconnect={handleDisconnectPairing}
        isMock={mode === 'mock'}
      />

      {/* Floating Simulation Dock for Prototype Demonstration */}
      <SimulationBar
        room={room}
        mode={mode}
        onToggleMode={handleToggleMode}
        onSimulateOpponentJoin={() => mockAdapterRef.current.simulateOpponentJoin()}
        onSimulateOpponentReady={() => mockAdapterRef.current.simulateOpponentReady()}
        onSimulateCountdown={() => mockAdapterRef.current.startCountdown()}
        onSimulateOpponentTyping={() => mockAdapterRef.current.simulateOpponentTyping()}
        onSimulateOpponentRun={() => mockAdapterRef.current.simulateOpponentRun()}
        onSimulateOpponentSubmit={(acc) => mockAdapterRef.current.simulateOpponentSubmit(acc)}
        onSimulateMySubmit={(acc) => mockAdapterRef.current.simulateMySubmit(acc)}
        onSimulateStale={() => mockAdapterRef.current.simulateOpponentConnection('stale')}
        onSimulateSurrender={() => mockAdapterRef.current.simulateSurrender()}
        onSimulateRematch={() => mockAdapterRef.current.simulateRematch()}
      />
    </div>
  );
}
