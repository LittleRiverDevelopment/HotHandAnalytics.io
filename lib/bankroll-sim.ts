import { americanToDecimal } from './odds-utils'

export type StakeMode = 'flat' | 'percent'

export interface SimulationParams {
  startingBankroll: number
  /** 0–1 */
  winProbability: number
  /** Average American odds per bet (assumes a single representative price for simplicity) */
  americanOdds: number
  stakeMode: StakeMode
  /** Dollar amount per bet when stakeMode is 'flat' */
  stakeFlatUnits: number
  /** 0–1 of *current* bankroll per bet when stakeMode is 'percent' (compounds) */
  stakePercent: number
  numBets: number
  numSimulations: number
  /** Fraction of starting bankroll that counts as "ruin" if ever touched, e.g. 0.2 */
  ruinThreshold: number
}

export interface SimulationResult {
  /** Bankroll percentile trajectories, one value per bet index (0..numBets) */
  p10: number[]
  p50: number[]
  p90: number[]
  endingBankrolls: number[]
  medianEnding: number
  meanEnding: number
  probabilityOfProfit: number
  probabilityOfRuin: number
  bestCase: number
  worstCase: number
  startingBankroll: number
}

function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0
  const idx = (sortedAscending.length - 1) * p
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sortedAscending[lower]
  const weight = idx - lower
  return sortedAscending[lower] * (1 - weight) + sortedAscending[upper] * weight
}

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  startingBankroll: 1000,
  winProbability: 0.524,
  americanOdds: -110,
  stakeMode: 'percent',
  stakeFlatUnits: 25,
  stakePercent: 0.02,
  numBets: 150,
  numSimulations: 400,
  ruinThreshold: 0.2,
}

/**
 * Monte Carlo bankroll projection assuming independent bets at a fixed win rate and price.
 * Real results vary bet-to-bet (different odds/edges), so treat this as a directional risk/reward
 * picture rather than a precise forecast.
 */
export function runBankrollSimulation(params: SimulationParams): SimulationResult {
  const {
    startingBankroll,
    winProbability,
    americanOdds,
    stakeMode,
    stakeFlatUnits,
    stakePercent,
    numBets,
    numSimulations,
    ruinThreshold,
  } = params

  const decimalOdds = americanToDecimal(americanOdds)
  const ruinFloor = startingBankroll * ruinThreshold

  const paths: number[][] = []
  let ruinCount = 0

  for (let sim = 0; sim < numSimulations; sim++) {
    let bankroll = startingBankroll
    const path = new Array<number>(numBets + 1)
    path[0] = bankroll
    let hitRuin = false

    for (let bet = 0; bet < numBets; bet++) {
      const stake = stakeMode === 'flat' ? stakeFlatUnits : bankroll * stakePercent
      const cappedStake = Math.min(stake, bankroll)
      const win = Math.random() < winProbability
      const profit = win ? cappedStake * (decimalOdds - 1) : -cappedStake
      bankroll = Math.max(0, bankroll + profit)
      path[bet + 1] = bankroll
      if (bankroll <= ruinFloor) hitRuin = true
    }

    if (hitRuin) ruinCount++
    paths.push(path)
  }

  const p10: number[] = new Array(numBets + 1)
  const p50: number[] = new Array(numBets + 1)
  const p90: number[] = new Array(numBets + 1)

  for (let idx = 0; idx <= numBets; idx++) {
    const values = paths.map(p => p[idx]).sort((a, b) => a - b)
    p10[idx] = percentile(values, 0.1)
    p50[idx] = percentile(values, 0.5)
    p90[idx] = percentile(values, 0.9)
  }

  const endingBankrolls = paths.map(p => p[p.length - 1])
  const sortedEndings = [...endingBankrolls].sort((a, b) => a - b)
  const medianEnding = percentile(sortedEndings, 0.5)
  const meanEnding = endingBankrolls.reduce((a, b) => a + b, 0) / endingBankrolls.length
  const probabilityOfProfit =
    endingBankrolls.filter(b => b > startingBankroll).length / endingBankrolls.length
  const probabilityOfRuin = ruinCount / numSimulations
  const bestCase = Math.max(...endingBankrolls)
  const worstCase = Math.min(...endingBankrolls)

  return {
    p10,
    p50,
    p90,
    endingBankrolls,
    medianEnding,
    meanEnding,
    probabilityOfProfit,
    probabilityOfRuin,
    bestCase,
    worstCase,
    startingBankroll,
  }
}
