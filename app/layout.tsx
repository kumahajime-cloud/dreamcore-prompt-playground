import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'System Prompt Playground',
  description: 'Experiment with AI system prompts and test different scenarios',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
