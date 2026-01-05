const express = require('express');
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();
const NodeCache = require('node-cache');
const app = express();

// Global error handlers to avoid silent exits and to log useful info
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

// Allow CORS from frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const cache = new NodeCache({ stdTTL: 300 });

// Endpoint: top market-cap list (uses a predefined candidate list)
app.get('/api/top_mc', async (req, res) => {
  const limit = parseInt(req.query.limit || '20', 10);
  const cacheKey = `top_mc_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // candidate tickers (large caps); extend as needed
    const candidates = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK-B','JPM','V','JNJ','WMT','PG','UNH','MA','HD','BAC','KO','PFE','DIS','ADBE','CMCSA','INTC','CSCO','NFLX'];
    const results = [];
    for (const s of candidates) {
      try {
        const qs = await yf.quoteSummary(s, { modules: ['price'] });
        const q = qs && (qs.quoteSummary ? (Array.isArray(qs.quoteSummary.result) ? qs.quoteSummary.result[0] : qs.quoteSummary.result) : (Array.isArray(qs) ? qs[0] : qs));
        const price = q && q.price ? q.price : null;
        const marketCap = price && price.marketCap ? (price.marketCap.raw || price.marketCap) : null;
        results.push({ symbol: s, name: price && (price.longName || price.shortName) ? (price.longName || price.shortName) : s, marketCap: marketCap || 0, price: price && (price.regularMarketPrice || price.currentPrice) });
      } catch (e) {
        // ignore single ticker failures
        console.warn('top_mc fetch failed for', s, e && e.message);
      }
    }
    results.sort((a,b)=> (b.marketCap||0) - (a.marketCap||0));
    const out = results.slice(0, limit);
    cache.set(cacheKey, out);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  const range = req.query.range || '1mo';
  const cacheKey = `${symbol}_${range}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // convert simple range (e.g. '1mo') to period1/period2 because chart() requires dates
    function rangeToPeriod(rng) {
      const now = new Date();
      let start = new Date(now);
      switch (rng) {
        case '1d': start.setDate(now.getDate() - 1); break;
        case '5d': start.setDate(now.getDate() - 5); break;
        case '1mo': start.setMonth(now.getMonth() - 1); break;
        case '3mo': start.setMonth(now.getMonth() - 3); break;
        case '6mo': start.setMonth(now.getMonth() - 6); break;
        case '1y': start.setFullYear(now.getFullYear() - 1); break;
        case '2y': start.setFullYear(now.getFullYear() - 2); break;
        case '5y': start.setFullYear(now.getFullYear() - 5); break;
        case '10y': start.setFullYear(now.getFullYear() - 10); break;
        case 'ytd': start = new Date(now.getFullYear(), 0, 1); break;
        case 'max': start = new Date(1970,0,1); break;
        default: start.setMonth(now.getMonth() - 1); // default 1 month
      }
      const pad = d => d.toISOString().slice(0,10);
      return { period1: pad(start), period2: pad(now) };
    }

    const { period1, period2 } = rangeToPeriod(range);
    const chart = await yf.chart(symbol, { period1, period2, interval: '1d' });

    let data = [];

    // Case A: modern chart() response with result -> timestamps + indicators.quote
    if (chart && chart.result) {
      const r = Array.isArray(chart.result) ? chart.result[0] : chart.result;
      if (r && r.timestamp && r.indicators && r.indicators.quote) {
        const timestamps = r.timestamp; // unix seconds
        const closes = r.indicators.quote[0].close;
        for (let i = 0; i < timestamps.length; i++) {
          const close = closes[i];
          if (close === null || close === undefined) continue;
          const date = new Date(timestamps[i] * 1000).toISOString().slice(0,10);
          data.push({ date, close });
        }
      }
    }

    // Case B: alternative response shape with quotes array (date strings)
    if ((!data || data.length === 0) && chart && chart.quotes) {
      try {
        data = chart.quotes
          .filter(q => q.close !== null && q.close !== undefined)
          .map(q => ({ date: (new Date(q.date)).toISOString().slice(0,10), close: q.close }));
      } catch (e) {
        // fallthrough to error handling below
      }
    }

    if (!data || data.length === 0) {
      console.error('Unexpected chart response shape:', chart);
      return res.status(500).json({ error: 'Unexpected chart response', chart });
    }

    // include meta information when available
    const meta = chart && chart.meta ? chart.meta : (chart && chart.result && chart.result[0] && chart.result[0].meta ? chart.result[0].meta : { symbol });
    const payload = { meta, history: data };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message, details: err });
  }
});

// Helper: convert range to period
function rangeToPeriod(rng) {
  const now = new Date();
  let start = new Date(now);
  switch (rng) {
    case '1d': start.setDate(now.getDate() - 1); break;
    case '5d': start.setDate(now.getDate() - 5); break;
    case '1mo': start.setMonth(now.getMonth() - 1); break;
    case '3mo': start.setMonth(now.getMonth() - 3); break;
    case '6mo': start.setMonth(now.getMonth() - 6); break;
    case '1y': start.setFullYear(now.getFullYear() - 1); break;
    case '2y': start.setFullYear(now.getFullYear() - 2); break;
    case '5y': start.setFullYear(now.getFullYear() - 5); break;
    case '10y': start.setFullYear(now.getFullYear() - 10); break;
    case 'ytd': start = new Date(now.getFullYear(), 0, 1); break;
    case 'max': start = new Date(1970,0,1); break;
    default: start.setMonth(now.getMonth() - 1); // default 1 month
  }
  const pad = d => d.toISOString().slice(0,10);
  return { period1: pad(start), period2: pad(now) };
}

// Analysis endpoint: fundamentals + history + recommendations
app.get('/api/analysis', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  const range = req.query.range || '1mo';
  const cacheKey = `analysis_${symbol}_${range}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { period1, period2 } = rangeToPeriod(range);
    const chart = await yf.chart(symbol, { period1, period2, interval: '1d' });

    // normalize history (support multiple shapes)
    let history = [];
    if (chart && chart.result) {
      const r = Array.isArray(chart.result) ? chart.result[0] : chart.result;
      if (r && r.timestamp && r.indicators && r.indicators.quote) {
        const timestamps = r.timestamp;
        const closes = r.indicators.quote[0].close;
        for (let i = 0; i < timestamps.length; i++) {
          const close = closes[i];
          if (close === null || close === undefined) continue;
          const date = new Date(timestamps[i] * 1000).toISOString().slice(0,10);
          history.push({ date, close });
        }
      }
    }
    if ((!history || history.length === 0) && chart && chart.quotes) {
      history = chart.quotes.filter(q => q.close !== null && q.close !== undefined).map(q => ({ date: (new Date(q.date)).toISOString().slice(0,10), close: q.close }));
    }

    // Fetch fundamentals via quoteSummary
    const modules = ['price','financialData','defaultKeyStatistics','incomeStatementHistory'];
    const qsRaw = await yf.quoteSummary(symbol, { modules });
    // extract result if nested
    const qs = qsRaw && (qsRaw.quoteSummary ? (Array.isArray(qsRaw.quoteSummary.result) ? qsRaw.quoteSummary.result[0] : qsRaw.quoteSummary.result) : (Array.isArray(qsRaw) ? qsRaw[0] : qsRaw));

    const meta = (qs && qs.price) ? qs.price : (chart && chart.meta ? chart.meta : { symbol });

    // fundamentals extraction with safe guards
    const fd = qs && qs.financialData ? qs.financialData : {};
    const ks = qs && qs.defaultKeyStatistics ? qs.defaultKeyStatistics : {};
    const income = qs && qs.incomeStatementHistory && qs.incomeStatementHistory.incomeStatementHistory ? qs.incomeStatementHistory.incomeStatementHistory : [];

    const fundamentals = {
      marketCap: ks.marketCap ? ks.marketCap.raw || ks.marketCap : (meta.marketCap || null),
      trailingPE: ks.trailingPE ? ks.trailingPE.raw || ks.trailingPE : (fd.trailingPE || null),
      forwardPE: fd.forwardPE || null,
      priceToBook: ks.priceToBook ? ks.priceToBook.raw || ks.priceToBook : null,
      debtToEquity: fd.totalDebt && ks.totalAssets ? (fd.totalDebt.raw / (ks.totalAssets.raw || ks.totalAssets || 1)) : (fd.totalDebt ? fd.totalDebt : null),
      returnOnEquity: fd.returnOnEquity || null,
      profitMargins: fd.profitMargins || null,
      revenueGrowth: fd.revenueGrowth || null,
      revenue: income && income[0] && income[0].totalRevenue ? income[0].totalRevenue.raw || income[0].totalRevenue : null
    };

    // Simple scoring helpers
    const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
    const scorePE = (pe)=> { if(!pe) return 50; const max=50; return clamp((max - pe)/max*100,0,100); };
    const scorePB = (pb)=> { if(!pb) return 50; const max=10; return clamp((max - pb)/max*100,0,100); };
    const scoreDebt = (d)=> { if(!d) return 50; const max=2; return clamp((max - d)/max*100,0,100); };
    const scoreROE = (r)=> { if(!r) return 50; return clamp((r/0.2)*100,0,100); };
    const scoreGrowth = (g)=> { if(!g) return 50; return clamp(g*100,0,200); };

    // Profiles and weights (custom agents provided)
    const profiles = {
      aswath_damodaran: { name: 'Aswath Damodaran Agent', weights: { pe:0.15,pb:0.15,debt:0.15,roe:0.2,growth:0.35 }, agentWeight:1.0 },
      ben_graham:       { name: 'Ben Graham Agent', weights: { pe:0.4,pb:0.35,debt:0.15,roe:0.05,growth:0.05 }, agentWeight:1.1 },
      bill_ackman:      { name: 'Bill Ackman Agent', weights: { pe:0.25,pb:0.2,debt:0.2,roe:0.2,growth:0.15 }, agentWeight:1.0 },
      cathie_wood:      { name: 'Cathie Wood Agent', weights: { pe:0.05,pb:0.05,debt:0.1,roe:0.15,growth:0.65 }, agentWeight:0.9 },
      charlie_munger:   { name: 'Charlie Munger Agent', weights: { pe:0.15,pb:0.15,debt:0.15,roe:0.3,growth:0.25 }, agentWeight:1.2 },
      michael_burry:    { name: 'Michael Burry Agent', weights: { pe:0.4,pb:0.3,debt:0.15,roe:0.05,growth:0.1 }, agentWeight:1.0 },
      mohnish_pabrai:   { name: 'Mohnish Pabrai Agent', weights: { pe:0.3,pb:0.25,debt:0.2,roe:0.15,growth:0.1 }, agentWeight:1.0 },
      peter_lynch:      { name: 'Peter Lynch Agent', weights: { pe:0.15,pb:0.15,debt:0.15,roe:0.2,growth:0.35 }, agentWeight:1.0 },
      phil_fisher:      { name: 'Phil Fisher Agent', weights: { pe:0.05,pb:0.05,debt:0.1,roe:0.2,growth:0.6 }, agentWeight:0.95 },
      rakesh_jhunjhunwala:{ name: 'Rakesh Jhunjhunwala Agent', weights: { pe:0.1,pb:0.1,debt:0.1,roe:0.2,growth:0.5 }, agentWeight:0.9 },
      stanley_druckenmiller:{ name: 'Stanley Druckenmiller Agent', weights: { pe:0.05,pb:0.1,debt:0.15,roe:0.2,growth:0.5 }, agentWeight:1.0 },
      warren_buffett:   { name: 'Warren Buffett Agent', weights: { pe:0.15,pb:0.15,debt:0.2,roe:0.25,growth:0.25 }, agentWeight:1.3 },
      valuation_agent:   { name: 'Valuation Agent', weights: { pe:0.25,pb:0.25,debt:0.15,roe:0.25,growth:0.1 }, agentWeight:1.0 },
      sentiment_agent:   { name: 'Sentiment Agent', weights: { pe:0.05,pb:0.05,debt:0.05,roe:0.15,growth:0.7 }, agentWeight:0.8 },
      fundamentals_agent: { name: 'Fundamentals Agent', weights: { pe:0.2,pb:0.2,debt:0.2,roe:0.2,growth:0.2 }, agentWeight:1.0 },
      technicals_agent:  { name: 'Technicals Agent', weights: { pe:0.05,pb:0.05,debt:0.05,roe:0.15,growth:0.7 }, agentWeight:0.8 },
      risk_manager:      { name: 'Risk Manager', weights: { pe:0.1,pb:0.1,debt:0.5,roe:0.2,growth:0.1 }, agentWeight:1.0 },
      portfolio_manager: { name: 'Portfolio Manager', weights: { pe:0.15,pb:0.15,debt:0.2,roe:0.25,growth:0.25 }, agentWeight:1.0 }
    };

    // Compute per-agent raw scores and signals
    const agentSignals = {};
    Object.entries(profiles).forEach(([key, prof]) => {
      // Skip managers here; they'll be run as separate steps
      if (key === 'risk_manager' || key === 'portfolio_manager') return;
      const sc_pe = scorePE(fundamentals.trailingPE);
      const sc_pb = scorePB(fundamentals.priceToBook);
      const sc_debt = scoreDebt(fundamentals.debtToEquity);
      const sc_roe = scoreROE(fundamentals.returnOnEquity && fundamentals.returnOnEquity.raw ? fundamentals.returnOnEquity.raw : fundamentals.returnOnEquity);
      const sc_growth = scoreGrowth(fundamentals.revenueGrowth && fundamentals.revenueGrowth.raw ? fundamentals.revenueGrowth.raw : fundamentals.revenueGrowth);
      const weights = prof.weights;
      const rawScore = sc_pe*weights.pe + sc_pb*weights.pb + sc_debt*weights.debt + sc_roe*weights.roe + sc_growth*weights.growth;
      const score = clamp(Math.round(rawScore), 0, 200);
      // map score to signal categories
      let signal = 'Hold';
      if (score >= 80) signal = 'Buy';
      else if (score >= 65) signal = 'Buy';
      else if (score >= 35) signal = 'Hold';
      else if (score >= 20) signal = 'Sell';
      else signal = 'Short';
      agentSignals[key] = { profile: prof.name, rawScore: Math.round(rawScore), score, signal };
    });

    // Risk Manager: adjust agent signals based on leverage and recent drawdown
    function computeRiskFactor(fundamentals, history) {
      const debt = (typeof fundamentals.debtToEquity === 'object' && fundamentals.debtToEquity && fundamentals.debtToEquity.raw !== undefined) ? fundamentals.debtToEquity.raw : fundamentals.debtToEquity || 0;
      const recentHigh = history && history.length ? Math.max(...history.map(h=>h.close)) : 0;
      const last = history && history.length ? history[history.length-1].close : recentHigh;
      const drawdown = recentHigh > 0 ? (recentHigh - last) / recentHigh : 0;
      const debtNorm = Math.min(1, Math.abs(debt) / 3); // assume 3+ is highly leveraged
      const df = clamp(debtNorm*0.6 + drawdown*0.4, 0, 1);
      return { debt, drawdown, riskFactor: df };
    }

    const riskSummary = computeRiskFactor(fundamentals, history);

    // Produce adjusted signals applying risk factor (risk manager behavior)
    const adjustedSignals = {};
    Object.entries(agentSignals).forEach(([k, sig]) => {
      // penalty reduces score proportionally to risk
      const penalty = Math.round(riskSummary.riskFactor * 30); // up to -30 points
      const adjScore = clamp(sig.score - penalty, 0, 200);
      let adjSignal = 'Hold';
      if (adjScore >= 80) adjSignal = 'Buy';
      else if (adjScore >= 65) adjSignal = 'Buy';
      else if (adjScore >= 35) adjSignal = 'Hold';
      else if (adjScore >= 20) adjSignal = 'Sell';
      else adjSignal = 'Short';
      adjustedSignals[k] = { profile: sig.profile, originalScore: sig.score, adjustedScore: adjScore, originalSignal: sig.signal, adjustedSignal: adjSignal };
    });

    // Portfolio Manager: aggregate adjusted signals to final action
    function decidePortfolio(adjustedSignals, riskSummary) {
      const entries = Object.values(adjustedSignals);
      if (entries.length === 0) return { finalScore: 50, finalAction: 'Hold' };
      // weighted average by adjustedScore
      const total = entries.reduce((s,e)=>s + (e.adjustedScore || 0), 0);
      const avg = total / entries.length;
      let action = 'Hold';
      if (avg >= 65) action = 'Buy';
      else if (avg <= 35) action = 'Sell';
      else action = 'Hold';
      // override to Short if very negative and risk is high
      if (avg <= 20 && riskSummary.riskFactor > 0.6) action = 'Short';
      // cover: if avg is very high but riskFactor is high (rare), choose Cover as defensive
      if (avg >= 85 && riskSummary.riskFactor > 0.6) action = 'Cover';
      return { finalScore: Math.round(avg), finalAction: action };
    }

    const portfolioDecision = decidePortfolio(adjustedSignals, riskSummary);

    // Global score: compute unweighted averages and weighted averages using `agentWeight`
    const agentKeys = Object.keys(agentSignals);
    const originalAvg = agentKeys.length ? Math.round(agentKeys.reduce((s,k)=>s + (agentSignals[k].score||0),0)/agentKeys.length) : 50;
    const adjustedKeys = Object.keys(adjustedSignals);
    const adjustedAvg = adjustedKeys.length ? Math.round(adjustedKeys.reduce((s,k)=>s + (adjustedSignals[k].adjustedScore||0),0)/adjustedKeys.length) : originalAvg;

    // weighted averages
    const sumWeights = agentKeys.reduce((s,k)=> s + (profiles[k] && profiles[k].agentWeight ? profiles[k].agentWeight : 1), 0) || 1;
    const weightedOriginal = Math.round(agentKeys.reduce((s,k)=> s + ((agentSignals[k].score||0) * (profiles[k] && profiles[k].agentWeight ? profiles[k].agentWeight : 1)), 0) / sumWeights);
    const weightedAdjusted = Math.round(adjustedKeys.reduce((s,k)=> s + ((adjustedSignals[k].adjustedScore||0) * (profiles[k] && profiles[k].agentWeight ? profiles[k].agentWeight : 1)), 0) / sumWeights);

    let globalAction = 'Hold';
    if (weightedAdjusted >= 80) globalAction = 'Buy';
    else if (weightedAdjusted >= 65) globalAction = 'Buy';
    else if (weightedAdjusted >= 35) globalAction = 'Hold';
    else if (weightedAdjusted >= 20) globalAction = 'Sell';
    else globalAction = 'Short';

    const globalScore = { originalAvg, adjustedAvg, weightedOriginal, weightedAdjusted, sumWeights, action: globalAction };

    const payload = { meta, history, fundamentals, agentSignals, riskManager: riskSummary, adjustedSignals, portfolioDecision, globalScore };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('Analysis error', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));