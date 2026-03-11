'use client'

import dynamic from 'next/dynamic'

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-800 rounded-full animate-spin border-t-green-400" />
        <p className="mt-4 text-slate-400">Loading HotHand...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <Dashboard />
}
