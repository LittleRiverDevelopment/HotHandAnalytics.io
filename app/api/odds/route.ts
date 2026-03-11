import { NextRequest, NextResponse } from 'next/server'
import { fetchOdds } from '@/lib/odds-api'
import { MOCK_EVENTS } from '@/lib/mock-data'
import { SportKey } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sport = (searchParams.get('sport') || 'basketball_nba') as SportKey
  const forceRefresh = searchParams.get('refresh') === 'true'
  const useMock = process.env.USE_MOCK_DATA === 'true' || !process.env.ODDS_API_KEY

  if (useMock) {
    return NextResponse.json({
      data: MOCK_EVENTS,
      mock: true,
      cached: false,
      message: 'Using mock data. Set ODDS_API_KEY to use live data.'
    })
  }

  const result = await fetchOdds(sport, ['h2h', 'spreads', 'totals'], forceRefresh)

  if (result.error) {
    // Return mock data as fallback but include error
    return NextResponse.json({ 
      data: MOCK_EVENTS,
      error: result.error, 
      mock: true,
      cached: false
    })
  }

  return NextResponse.json({
    data: result.data,
    remainingRequests: result.remainingRequests,
    cached: result.cached,
    mock: false
  })
}
