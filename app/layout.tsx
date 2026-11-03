import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LineSnipe | Positive EV, Line Shop, Arbitrage',
  description: 'Shop sportsbook lines, find positive expected value, and spot arbitrage.',
}

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="grid-bg relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
