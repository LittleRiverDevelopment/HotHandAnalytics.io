import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTrendsError, parseTrendsPayload, todayTrendsPath } from './trendscenter'

test('today trends query asks for one sport sorted by score', () => {
  assert.equal(todayTrendsPath('NBA'), '/trends/today?sport=NBA&limit=25&sort=score')
})

test('payload keeps the trend, the pick, and the attribution link', () => {
  const payload = parseTrendsPayload({
    data: {
      trends: [
        {
          id: 't1',
          name: 'Home favorites',
          sport: 'NBA',
          betType: 'spread',
          description: 'Home favorite against the spread.',
          performance: { record: '5-3-0', winRate: 62.5, units: 1.64, roi: 18.6, streak: 2 },
          activeGames: [
            {
              team: 'Charlotte Hornets',
              opponent: 'Memphis Grizzlies',
              site: 'home',
              startTime: 1710,
              pick: { market: 'spread', side: 'Charlotte Hornets', line: -3.5 },
            },
          ],
        },
      ],
    },
    meta: {
      requestId: '01TEST',
      sandbox: true,
      attribution: {
        text: 'Data by TrendsCenter',
        url: 'https://trendscenterapp.com/?ref=test',
      },
    },
  })

  assert.equal(payload.sandbox, true)
  assert.equal(payload.attributionText, 'Data by TrendsCenter')
  assert.equal(payload.attributionUrl, 'https://trendscenterapp.com/?ref=test')
  assert.equal(payload.trends.length, 1)
  assert.equal(payload.trends[0].record, '5-3-0')
  assert.equal(payload.trends[0].games[0].matchup, 'Memphis Grizzlies @ Charlotte Hornets')
  assert.equal(payload.trends[0].games[0].pick, 'Charlotte Hornets -3.5')
  assert.equal(payload.trends[0].games[0].startLabel, '5:10 PM ET')
})

test('error body uses the API message', () => {
  const message = parseTrendsError(
    {
      error: {
        code: 'missing_api_key',
        message: 'Send your API key in the Authorization header.',
        requestId: '01ERR',
      },
    },
    401
  )
  assert.equal(message, 'Send your API key in the Authorization header.')
})
