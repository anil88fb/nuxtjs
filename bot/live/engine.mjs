import { readFileSync, writeFileSync, renameSync, appendFileSync } from 'node:fs'
import { STABLES } from './config.mjs'
import { parseRules, floorToStep, sellableQty, averageCost } from './rules.mjs'
import { analyze, buySignal, sellSignal } from './decide.mjs'

const LEVERAGED = /(UP|DOWN|BULL|BEAR)$/

export function createBot({ cfg, client, log = console.log, persist = true }) {
  let state = loadState()
  let rules = new Map()
  const mode = cfg.live ? 'LIVE' : 'DRY'

  function loadState() {
    if (persist) {
      try { return JSON.parse(readFileSync(cfg.stateFile, 'utf8')) } catch {}
    }
    return { positions: {}, lastBuyCandle: {}, daily: { date: '', realized: 0 }, trades: [], dryBalance: null }
  }
  function save() {
    if (!persist) return
    writeFileSync(cfg.stateFile + '.tmp', JSON.stringify(state, null, 2))
    renameSync(cfg.stateFile + '.tmp', cfg.stateFile)
  }
  function record(trade) {
    state.trades.push(trade)
    if (state.trades.length > 1000) state.trades.splice(0, state.trades.length - 1000)
    if (persist) appendFileSync(cfg.logFile, JSON.stringify({ mode, ...trade }) + '\n')
  }
  function today() { return new Date().toISOString().slice(0, 10) }
  function dailyLoss() {
    if (state.daily.date !== today()) state.daily = { date: today(), realized: 0 }
    return -Math.min(state.daily.realized, 0)
  }
  const isTradableBase = base => !STABLES.has(base) && !cfg.ignoreAssets.includes(base) && !base.startsWith('LD') && !LEVERAGED.test(base)

  async function balances() {
    if (!client.hasKeys) return null
    const acc = await client.account()
    if (acc.canTrade === false) throw new Error('API key has no trading permission')
    return Object.fromEntries(acc.balances.map(b => [b.asset, { free: Number(b.free), locked: Number(b.locked) }]))
  }

  async function start() {
    if (client.hasKeys) await client.syncTime()
    rules = parseRules(await client.exchangeInfo(), cfg.quote)
    log(`[${mode}] ${rules.size} ${cfg.quote} pairs tradable`)

    const bal = await balances()
    if (!bal) {
      log(`[${mode}] No API keys: scanning only, simulated balance`)
    } else {
      log(`[${mode}] Account: ${Object.entries(bal).filter(([, b]) => b.free + b.locked > 0).map(([a, b]) => `${a}=${b.free + b.locked}`).join(', ') || 'empty'}`)
    }
    if (state.dryBalance == null) state.dryBalance = bal?.[cfg.quote]?.free ?? 1000

    if (bal && cfg.manageExisting) await importHoldings(bal)
    save()
  }

  // Coins already in the account become positions so they are sold at a profit too.
  async function importHoldings(bal) {
    for (const [asset, b] of Object.entries(bal)) {
      const symbol = asset + cfg.quote
      const rule = rules.get(symbol)
      if (!rule || !isTradableBase(asset) || state.positions[symbol]) continue
      const qty = b.free + b.locked
      const { price } = await client.price(symbol)
      if (!sellableQty(qty, Number(price), rule)) continue // dust

      let entryPrice = null
      try { entryPrice = averageCost(await client.myTrades(symbol), asset) } catch (e) { log(`  ${symbol}: trade history unavailable (${e.message})`) }
      const source = entryPrice ? 'imported' : 'imported-unknown'
      entryPrice ??= Number(price) // unknown cost: only sell once it rises from today's price
      state.positions[symbol] = { qty, entryPrice, source, openedAt: Date.now(), costQuote: 0 }
      log(`  Managing existing ${asset}: ${qty} @ avg ${entryPrice}${source === 'imported-unknown' ? ' (cost unknown, using current price)' : ''}`)
    }
  }

  async function closedCloses(symbol) {
    const rows = await client.klines(symbol, cfg.interval, cfg.candleLimit + 1)
    const now = Date.now()
    const closed = rows.filter(r => r[6] < now).slice(-cfg.candleLimit)
    return { closes: closed.map(r => Number(r[4])), lastClose: closed.at(-1)?.[6] }
  }

  async function sell(symbol, pos, price, reason, bal) {
    const rule = rules.get(symbol)
    const available = cfg.live && bal ? Math.min(pos.qty, bal[rule.base]?.free ?? 0) : pos.qty
    const qty = sellableQty(available, price, rule)
    if (!qty) { log(`  ${symbol}: sell skipped, quantity below Binance minimum`); return }

    let fillQty = Number(qty), proceeds = Number(qty) * price * (1 - cfg.feePct / 100)
    if (cfg.live) {
      const res = await client.order({ symbol, side: 'SELL', type: 'MARKET', quantity: qty })
      fillQty = Number(res.executedQty)
      proceeds = Number(res.cummulativeQuoteQty) - fees(res, cfg.quote)
    } else {
      if (client.hasKeys) await client.testOrder({ symbol, side: 'SELL', type: 'MARKET', quantity: qty })
      state.dryBalance += proceeds
    }
    const costBasis = pos.entryPrice * fillQty
    const pnl = proceeds - costBasis
    if (pos.source === 'bot' || pos.source === 'imported') state.daily.realized += pnl
    pos.qty -= fillQty
    if (pos.qty <= 0 || !sellableQty(pos.qty, price, rule)) delete state.positions[symbol]
    else pos.costQuote = pos.costQuote * (pos.qty / (pos.qty + fillQty))
    record({ time: Date.now(), symbol, side: 'SELL', qty: fillQty, price: proceeds / fillQty, quote: proceeds, pnl, reason })
    log(`  >>> [${mode}] SELL ${symbol} ${fillQty} → ${proceeds.toFixed(2)} ${cfg.quote}, PnL ${pnl.toFixed(2)} (${reason})`)
  }

  async function buy(symbol, price, reason) {
    const rule = rules.get(symbol)
    const spend = cfg.tradeSizeQuote
    let qty, cost, entryPrice
    if (cfg.live) {
      const res = await client.order({ symbol, side: 'BUY', type: 'MARKET', quoteOrderQty: spend.toFixed(Math.min(rule.quotePrecision, 8)) })
      qty = Number(res.executedQty) - fees(res, rule.base)
      cost = Number(res.cummulativeQuoteQty)
      entryPrice = cost / Number(res.executedQty)
    } else {
      if (client.hasKeys) await client.testOrder({ symbol, side: 'BUY', type: 'MARKET', quoteOrderQty: spend.toFixed(2) })
      qty = Number(floorToStep(spend / price * (1 - cfg.feePct / 100), rule.stepSize))
      cost = spend
      entryPrice = price
      state.dryBalance -= spend
    }
    state.positions[symbol] = { qty, entryPrice, source: 'bot', openedAt: Date.now(), costQuote: cost }
    record({ time: Date.now(), symbol, side: 'BUY', qty, price: entryPrice, quote: cost, reason })
    log(`  >>> [${mode}] BUY ${symbol} ${qty} @ ${entryPrice} for ${cost.toFixed(2)} ${cfg.quote} (${reason})`)
  }

  async function tick() {
    const bal = await balances()

    // Drop positions that were sold outside the bot (live only).
    if (cfg.live && bal) {
      for (const [symbol, pos] of Object.entries(state.positions)) {
        const rule = rules.get(symbol)
        const held = (bal[rule?.base]?.free ?? 0) + (bal[rule?.base]?.locked ?? 0)
        if (!rule || !sellableQty(held, pos.entryPrice, rule)) { log(`  ${symbol}: no longer in account, forgetting position`); delete state.positions[symbol] }
        else if (pos.source !== 'bot') pos.qty = held
      }
    }

    const tickers = await client.tickers24h()
    const lastPrice = Object.fromEntries(tickers.map(t => [t.symbol, Number(t.lastPrice)]))

    // 1) Sell side: every position we manage
    for (const [symbol, pos] of Object.entries(state.positions)) {
      const price = lastPrice[symbol]
      if (!price) continue
      let a = null
      try { a = analyze((await closedCloses(symbol)).closes, cfg) } catch (e) { log(`  ${symbol}: klines failed (${e.message})`) }
      const s = sellSignal(pos, price, a, cfg)
      log(`  ${symbol} [${pos.source}] ${price} → ${s.sell ? 'SELL' : 'HOLD'} (${s.reason})`)
      if (s.sell) {
        try { await sell(symbol, pos, price, s.reason, bal) } catch (e) { log(`  ${symbol}: SELL FAILED ${e.message}`) }
      }
    }

    // 2) Buy side: scan the most liquid pairs
    const botPositions = Object.values(state.positions).filter(p => p.source === 'bot')
    let exposure = botPositions.reduce((s, p) => s + p.costQuote, 0)
    let quoteFree = cfg.live ? (bal?.[cfg.quote]?.free ?? 0) : state.dryBalance
    let openCount = botPositions.length
    const blocked =
      dailyLoss() >= cfg.maxDailyLossQuote ? `daily loss limit reached (${dailyLoss().toFixed(2)})`
      : cfg.live && !client.hasKeys ? 'no API keys'
      : null

    const candidates = tickers
      .filter(t => rules.has(t.symbol) && !state.positions[t.symbol])
      .filter(t => isTradableBase(rules.get(t.symbol).base))
      .filter(t => !cfg.whitelist.length || cfg.whitelist.includes(rules.get(t.symbol).base))
      .filter(t => Number(t.quoteVolume) >= cfg.minQuoteVolume)
      .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
      .slice(0, cfg.scanTop)

    const signals = []
    for (const t of candidates) {
      try {
        const { closes, lastClose } = await closedCloses(t.symbol)
        if (state.lastBuyCandle[t.symbol] === lastClose) continue
        const b = buySignal(analyze(closes, cfg), cfg)
        if (b.buy) signals.push({ symbol: t.symbol, lastClose, reason: b.reason, volume: Number(t.quoteVolume) })
      } catch (e) {
        log(`  ${t.symbol}: klines failed (${e.message})`)
      }
    }
    log(`  Scanned ${candidates.length} coins, ${signals.length} buy signal(s)${signals.length ? ': ' + signals.map(s => s.symbol).join(', ') : ''}`)

    for (const s of signals) {
      const why =
        blocked ? blocked
        : openCount >= cfg.maxOpenPositions ? `max ${cfg.maxOpenPositions} open positions`
        : exposure + cfg.tradeSizeQuote > cfg.maxTotalQuote ? `max total ${cfg.maxTotalQuote} ${cfg.quote} invested`
        : quoteFree - cfg.tradeSizeQuote < cfg.reserveQuote ? `not enough ${cfg.quote} (${quoteFree.toFixed(2)})`
        : cfg.tradeSizeQuote < rules.get(s.symbol).minNotional ? 'trade size below Binance minimum'
        : null
      if (why) { log(`  ${s.symbol}: buy skipped — ${why}`); continue }
      try {
        await buy(s.symbol, lastPrice[s.symbol], s.reason)
        state.lastBuyCandle[s.symbol] = s.lastClose
        openCount++
        quoteFree -= cfg.tradeSizeQuote
        exposure += cfg.tradeSizeQuote
      } catch (e) {
        log(`  ${s.symbol}: BUY FAILED ${e.message}`)
      }
    }

    save()
    const open = Object.entries(state.positions).map(([s, p]) => `${s}(${p.source})`).join(', ') || 'none'
    log(`[${mode}] ${cfg.quote} free: ${(cfg.live ? quoteFree : state.dryBalance).toFixed(2)} | positions: ${open} | today PnL: ${state.daily.realized.toFixed(2)}`)
  }

  return { start, tick, get state() { return state } }
}

// Commission paid in a given asset, from a FULL order response.
function fees(res, asset) {
  return (res.fills ?? []).filter(f => f.commissionAsset === asset).reduce((s, f) => s + Number(f.commission), 0)
}
