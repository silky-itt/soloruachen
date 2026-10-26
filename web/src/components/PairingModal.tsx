'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Chrome, RefreshCw, Unlink } from 'lucide-react';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingCode: string;
  expiresAt: number;
  isConnected: boolean;
  leetcodeUsername?: string;
  onRefreshCode: () => void;
  onDisconnect: () => void;
  isMock?: boolean;
}

export function PairingModal({
  isOpen,
  onClose,
  pairingCode,
  expiresAt,
  isConnected,
  leetcodeUsername,
  onRefreshCode,
  onDisconnect,
  isMock = false,
}: PairingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = Date.now() > expiresAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-black p-6 shadow-2xl text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200">
              <Chrome className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Kết nối LeetCode Extension</h3>
              <p className="text-xs text-zinc-500">Ghép nối trình duyệt an toàn không thu thập mật khẩu/cookie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 space-y-6">
          {isConnected ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-emerald-300 text-sm">Đã kết nối Chrome Extension</div>
                <div className="text-xs text-zinc-400 mt-1 font-mono">
                  LeetCode Account: <span className="text-emerald-400 font-semibold">{leetcodeUsername || 'Trình duyệt đã ghép nối'}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                Extension đang lắng nghe editor trên <code className="text-zinc-300 font-mono">leetcode.com/problems/*</code>. Bạn có thể sẵn sàng vào trận!
              </p>
              <div className="pt-2">
                <button
                  onClick={onDisconnect}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Ngắt kết nối phiên này</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Pairing Code Box */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 text-center space-y-3">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono text-[10px]">
                  Mã ghép nối 1 lần (Hiệu lực 5 phút)
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <div className="font-mono text-3xl font-black tracking-widest text-white bg-black px-6 py-2.5 rounded-2xl border border-zinc-800 shadow-inner">
                    {pairingCode || '--- ---'}
                  </div>
                  <button
                    onClick={copyCode}
                    disabled={!pairingCode}
                    className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition border border-zinc-800"
                    title="Sao chép mã"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {isExpired ? (
                  <div className="text-xs text-rose-400 flex items-center justify-center space-x-1">
                    <span>Mã đã hết hạn.</span>
                    <button onClick={onRefreshCode} className="underline text-white hover:text-zinc-300">
                      Tạo mã mới
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 text-xs text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Đang chờ extension nhập mã...</span>
                    <button
                      onClick={onRefreshCode}
                      className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                      title="Làm mới mã"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Steps Guide */}
              <div className="space-y-3 text-xs text-zinc-400">
                <div className="font-semibold text-zinc-200 flex items-center space-x-1.5">
                  <span>3 bước kết nối nhanh:</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold">1</span>
                    <div>
                      Cài đặt extension: Mở <code className="text-zinc-200 font-mono">chrome://extensions</code>, bật <b>Developer mode</b> và chọn <b>Load unpacked</b> trỏ vào thư mục <code className="text-zinc-200 font-mono">soloruachen/extension</code>.
                    </div>
                  </div>
                  <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold">2</span>
                    <div>
                      Mở tab <a href="https://leetcode.com" target="_blank" rel="noreferrer" className="text-white underline hover:text-zinc-300">leetcode.com</a> và đăng nhập tài khoản của bạn tại đó.
                    </div>
                  </div>
                  <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px] font-bold">3</span>
                    <div>
                      Bấm vào biểu tượng extension trên thanh trình duyệt, nhập mã 6 số ở trên rồi bấm <b>Ghép nối</b>.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 text-[11px] text-zinc-500 space-y-1">
            <div className="font-semibold text-zinc-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chính sách bảo mật tài khoản:</span>
            </div>
            <p>
              Hệ thống không thu thập mật khẩu, cookie hay session token LeetCode về server. Mọi thao tác Run/Submit diễn ra trên trang LeetCode của chính bạn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
