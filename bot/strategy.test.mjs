import test from 'node:test'
import assert from 'node:assert/strict'
import { ema, rsi } from './indicators.mjs'
import { evaluate } from './strategy.mjs'
import { buy, sell } from './paper.mjs'

const cfg = { emaFast: 3, emaSlow: 5, rsiPeriod: 3, rsiBuyMax: 101, rsiSellMin: -1, stopLossPct: 3, takeProfitPct: 6, tradeSizeUsdt: 100, feePct: 0.1 }

test('ema seeds with SMA', () => {
  assert.deepEqual(ema([1, 2, 3, 4], 3), [null, null, 2, 3])
})

test('rsi is 100 on only gains and 0 on only losses', () => {
  assert.equal(rsi([1, 2, 3, 4, 5], 3).at(-1), 100)
  assert.equal(rsi([5, 4, 3, 2, 1], 3).at(-1), 0)
})

test('buy on EMA cross up', () => {
  const closes = [10, 9, 8, 7, 6, 5, 5, 5, 9]
  assert.equal(evaluate(closes, null, cfg).action, 'BUY')
})

test('stop loss and take profit', () => {
  const flat = [10, 10, 10, 10, 10, 10, 10]
  assert.equal(evaluate([...flat, 9.6], { entryPrice: 10 }, cfg).action, 'SELL')
  assert.equal(evaluate([...flat, 10.7], { entryPrice: 10 }, cfg).action, 'SELL')
  assert.equal(evaluate([...flat, 10.1], { entryPrice: 10 }, cfg).action, 'HOLD')
})

test('paper buy/sell keeps balance consistent', () => {
  const s = { balanceUsdt: 1000, positions: {}, trades: [] }
  buy(s, 'BTCUSDT', 100, cfg, 't')
  assert.equal(s.balanceUsdt, 900)
  const t = sell(s, 'BTCUSDT', 110, cfg, 't')
  assert.ok(t.pnl > 9 && t.pnl < 10)
  assert.equal(Object.keys(s.positions).length, 0)
})
