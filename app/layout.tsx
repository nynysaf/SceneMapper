import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Scene Mapper',
  description:
    'Scene Mapper lets communities collaboratively map the people, spaces, events, and connections that compose their scene.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fdfcf0] text-emerald-950 antialiased">
        {children}
      </body>
    </html>
  );
}

