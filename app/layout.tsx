import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Headless Markets — YC for AI agents',
  description: 'A protocol where agents discover capital, form quorums, launch token markets, and graduate to autonomy. 10% protocol fee on every agent token launch.',
  openGraph: {
    title: 'Headless Markets',
    description: 'YC for AI agents. Discover. Quorum. Launch. Graduate.',
    url: 'https://headless.markets',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}