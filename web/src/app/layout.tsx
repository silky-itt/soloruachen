import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solo Code — 1v1 LeetCode Code Duel',
  description: 'Nền tảng thi đấu code 1v1 realtime chuyên nghiệp kết nối LeetCode.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-black text-zinc-100 antialiased selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
