'use client'

import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  Dice5,
  Play,
  Wand2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Skull,
} from 'lucide-react'
import {
  runBankrollSimulation,
  DEFAULT_SIM_PARAMS,
  type SimulationParams,
  type SimulationResult,
  type StakeMode,
} from '@/lib/bankroll-sim'
import { computeSummary, computeAverageOdds } from '@/lib/bet-tracker-utils'
import { formatOdds } from '@/lib/odds-utils'
import { BET_HISTORY } from '@/lib/bet-history'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend)

function historyDefaults(): Partial<SimulationParams> {
  const summary = computeSummary(BET_HISTORY)
  if (summary.settledBets === 0) return {}
  return {
    winProbability: Math.min(0.95, Math.max(0.05, summary.winRate / 100)),
    americanOdds: Math.round(computeAverageOdds(BET_HISTORY)),
  }
}

function formatDollars(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function BankrollSimulator() {
  const [params, setParams] = useState<SimulationParams>(() => ({
    ...DEFAULT_SIM_PARAMS,
    ...historyDefaults(),
  }))
  const [result, setResult] = useState<SimulationResult>(() =>
    runBankrollSimulation({ ...DEFAULT_SIM_PARAMS, ...historyDefaults() })
  )

  const runSimulation = () => setResult(runBankrollSimulation(params))
  const useHistoricalStats = () => setParams(p => ({ ...p, ...historyDefaults() }))

  const chartData = useMemo(() => {
    const labels = result.p50.map((_, i) => (i === 0 ? 'Start' : `${i}`))
    return {
      labels,
      datasets: [
        {
          label: '10th percentile',
          data: result.p10,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.2,
        },
        {
          label: 'Median',
          data: result.p50,
          borderColor: '#22c55e',
          pointRadius: 0,
          borderWidth: 2.5,
          fill: false,
          tension: 0.2,
        },
        {
          label: '90th percentile',
          data: result.p90,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderDash: [4, 4],
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          pointRadius: 0,
          fill: 0,
          tension: 0.2,
        },
      ],
    }
  }, [result])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            if (value === null) return ''
            return `${context.dataset.label}: ${formatDollars(value)}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        title: { display: true, text: 'Bet #', color: '#64748b' },
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', callback: (v: number | string) => formatDollars(Number(v)) },
      },
    },
  }

  const netMedian = result.medianEnding - result.startingBankroll
  const stakeMode: StakeMode = params.stakeMode

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Dice5 className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Bankroll Simulator</h2>
          <span className="text-sm text-slate-400 ml-2">
            Monte Carlo projection · {params.numSimulations} simulated paths
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={useHistoricalStats}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-600 bg-slate-800/50 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            title="Fill win rate and average odds from your Bet Tracker history"
          >
            <Wand2 className="w-4 h-4" />
            Use my Bet Tracker stats
          </button>
          <button
            type="button"
            onClick={runSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            Run Simulation
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Starting Bankroll</label>
            <input
              type="number"
              value={params.startingBankroll}
              onChange={e => setParams(p => ({ ...p, startingBankroll: Number(e.target.value) }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              min="10"
              step="50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Win Rate %</label>
            <input
              type="number"
              value={(params.winProbability * 100).toFixed(1)}
              onChange={e =>
                setParams(p => ({ ...p, winProbability: Math.min(0.99, Math.max(0.01, Number(e.target.value) / 100)) }))
              }
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              min="1"
              max="99"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Avg Odds (American)</label>
            <input
              type="number"
              value={params.americanOdds}
              onChange={e => setParams(p => ({ ...p, americanOdds: Number(e.target.value) }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              step="5"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Number of Bets</label>
            <input
              type="number"
              value={params.numBets}
              onChange={e => setParams(p => ({ ...p, numBets: Math.max(1, Math.min(1000, Number(e.target.value))) }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              min="1"
              max="1000"
              step="10"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Stake Mode</label>
            <select
              value={stakeMode}
              onChange={e => setParams(p => ({ ...p, stakeMode: e.target.value as StakeMode }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="percent">% of bankroll (compounds)</option>
              <option value="flat">Flat $ per bet</option>
            </select>
          </div>
          {stakeMode === 'percent' ? (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Stake % of Bankroll</label>
              <input
                type="number"
                value={(params.stakePercent * 100).toFixed(1)}
                onChange={e =>
                  setParams(p => ({ ...p, stakePercent: Math.min(1, Math.max(0.001, Number(e.target.value) / 100)) }))
                }
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
                min="0.1"
                max="100"
                step="0.5"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Flat Stake $</label>
              <input
                type="number"
                value={params.stakeFlatUnits}
                onChange={e => setParams(p => ({ ...p, stakeFlatUnits: Number(e.target.value) }))}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
                min="1"
                step="5"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Ruin Threshold %</label>
            <input
              type="number"
              value={(params.ruinThreshold * 100).toFixed(0)}
              onChange={e =>
                setParams(p => ({ ...p, ruinThreshold: Math.min(0.99, Math.max(0, Number(e.target.value) / 100)) }))
              }
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              min="0"
              max="99"
              step="5"
              title="Considered 'ruin' if bankroll ever drops to this % of the starting amount"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Simulated Paths</label>
            <input
              type="number"
              value={params.numSimulations}
              onChange={e =>
                setParams(p => ({ ...p, numSimulations: Math.max(50, Math.min(2000, Number(e.target.value))) }))
              }
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 mono"
              min="50"
              max="2000"
              step="50"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Assumes {formatOdds(params.americanOdds)} average odds and independent bets at a fixed{' '}
          {(params.winProbability * 100).toFixed(1)}% win rate. Click <span className="text-slate-300">Run Simulation</span>{' '}
          again to see a fresh random draw with the same settings.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 card-hover">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Median Ending</span>
            {netMedian >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 mono ${netMedian >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatDollars(result.medianEnding)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {netMedian >= 0 ? '+' : ''}
            {formatDollars(netMedian)} vs start
          </p>
        </div>

        <div className="card p-4 card-hover">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Probability of Profit</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold mt-1 mono text-cyan-400">
            {(result.probabilityOfProfit * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">of simulated paths end above start</p>
        </div>

        <div className="card p-4 card-hover">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Risk of Ruin</span>
            <Skull className={`w-4 h-4 ${result.probabilityOfRuin > 0.15 ? 'text-red-400' : 'text-slate-500'}`} />
          </div>
          <p className={`text-2xl font-bold mt-1 mono ${result.probabilityOfRuin > 0.15 ? 'text-red-400' : 'text-slate-200'}`}>
            {(result.probabilityOfRuin * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ever drop to {(params.ruinThreshold * 100).toFixed(0)}% of start
          </p>
        </div>

        <div className="card p-4 card-hover">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">90% Range</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-lg font-bold mt-1 mono">
            {formatDollars(result.p10[result.p10.length - 1])} – {formatDollars(result.p90[result.p90.length - 1])}
          </p>
          <p className="text-xs text-slate-500 mt-1">10th–90th percentile ending</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="font-medium">Simulated Bankroll Trajectories</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Best: <span className="text-green-400 mono">{formatDollars(result.bestCase)}</span>
            </span>
            <span>
              Worst: <span className="text-red-400 mono">{formatDollars(result.worstCase)}</span>
            </span>
          </div>
        </div>
        <div className="h-[320px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">How to read this</h3>
            <p className="text-sm text-slate-400 mt-1">
              Each of the {params.numSimulations} lines is a randomly simulated betting career at your win
              rate and odds; the chart shows the 10th, 50th (median), and 90th percentile bankroll at
              each bet number. Percent-of-bankroll staking compounds (grows/shrinks your stake as your
              bankroll changes) while flat staking keeps the dollar amount constant. This assumes every
              bet has the same win probability and price, and that outcomes are independent — real
              betting careers involve varying edges, odds, and streaks, so treat this as a risk/reward
              sanity check rather than a precise forecast.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Info className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Why this matters for sizing</h3>
            <p className="text-sm text-slate-400 mt-1">
              Betting a large % of bankroll per play grows the median outcome fastest but also sharply
              raises the risk of ruin — try bumping the stake % up and watch the red &quot;Risk of Ruin&quot;
              number move. This is the same tension Kelly Criterion sizing (used in the +EV Finder) is
              built to manage: bet enough to compound growth, not so much that a normal losing streak
              wipes you out.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
