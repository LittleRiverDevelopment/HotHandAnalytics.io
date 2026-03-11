import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HotHand Analytics | Sports Betting Edge Finder',
  description: 'Find edges in sports betting lines. Line discrepancies, +EV bets, and player prop analysis.',
}

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="grid-bg min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
