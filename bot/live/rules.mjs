// Exchange filters (lot size, min notional) and quantity helpers.

export function parseRules(exchangeInfo, quote) {
  const rules = new Map()
  for (const s of exchangeInfo.symbols ?? []) {
    if (s.status !== 'TRADING' || s.quoteAsset !== quote || s.isSpotTradingAllowed === false) continue
    if (s.orderTypes && !s.orderTypes.includes('MARKET')) continue
    const f = Object.fromEntries((s.filters ?? []).map(x => [x.filterType, x]))
    const lot = f.MARKET_LOT_SIZE && Number(f.MARKET_LOT_SIZE.stepSize) > 0 ? f.MARKET_LOT_SIZE : f.LOT_SIZE
    rules.set(s.symbol, {
      symbol: s.symbol,
      base: s.baseAsset,
      quote: s.quoteAsset,
      stepSize: lot?.stepSize ?? '0.00000001',
      minQty: Number(lot?.minQty ?? 0),
      maxQty: Number(lot?.maxQty ?? Infinity) || Infinity,
      minNotional: Number(f.NOTIONAL?.minNotional ?? f.MIN_NOTIONAL?.minNotional ?? 5),
      quotePrecision: s.quoteAssetPrecision ?? s.quotePrecision ?? 8,
    })
  }
  return rules
}

function stepDecimals(step) {
  const [, frac = ''] = String(step).replace(/0+$/, '').split('.')
  return frac.length
}

// Round DOWN to the lot step and return a string Binance accepts.
export function floorToStep(qty, step) {
  const d = stepDecimals(step)
  const factor = 10 ** d
  const s = Number(step)
  const floored = Math.floor(qty / s + 1e-9) * s
  return (Math.floor(floored * factor + 1e-9) / factor).toFixed(d)
}

// Sellable quantity string, or null if it is below Binance's minimums (dust).
export function sellableQty(qty, price, rule) {
  const q = floorToStep(Math.min(qty, rule.maxQty), rule.stepSize)
  if (Number(q) <= 0 || Number(q) < rule.minQty || Number(q) * price < rule.minNotional) return null
  return q
}

// Average buy price of the quantity still held, from the account's trade history.
export function averageCost(trades, base) {
  let qty = 0, cost = 0
  for (const t of [...trades].sort((a, b) => a.time - b.time)) {
    const q = Number(t.qty), quoteQty = Number(t.quoteQty)
    if (t.isBuyer) {
      const fee = t.commissionAsset === base ? Number(t.commission) : 0
      qty += q - fee
      cost += quoteQty
    } else if (qty > 0) {
      const sold = Math.min(q, qty)
      cost -= cost * (sold / qty)
      qty -= sold
    }
  }
  return qty > 0 && cost > 0 ? cost / qty : null
}
