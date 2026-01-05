let myChart = null;

function initEmptyChart(){
  const ctx = document.getElementById('myChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Close', data: [], backgroundColor: 'rgba(54,162,235,0.3)', borderColor: 'rgba(54,162,235,1)', fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
  });
}

async function fetchAnalysis(symbol){
  try{
    const res = await fetch(`http://localhost:3000/api/analysis?symbol=${encodeURIComponent(symbol)}`);
    if(!res.ok){
      const err = await res.json().catch(()=>({error:res.statusText}));
      throw err;
    }
    return res.json();
  }catch(e){
    throw e;
  }
}

function renderMeta(meta){
  document.getElementById('symbol-name').textContent = meta.longName || meta.shortName || meta.symbol || '-';
  document.getElementById('exchange').textContent = meta.exchangeName || meta.fullExchangeName || '-';
  document.getElementById('high52').textContent = meta.fiftyTwoWeekHigh ?? '-';
  document.getElementById('low52').textContent = meta.fiftyTwoWeekLow ?? '-';
  // current price if present
  const price = meta.regularMarketPrice ?? meta.currentPrice ?? null;
  document.getElementById('current-price').textContent = price !== null ? price : '--';
}

function renderHistoryTable(history){
  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  history.slice().reverse().slice(0,30).forEach(row => {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td'); tdDate.textContent = row.date; tr.appendChild(tdDate);
    const tdClose = document.createElement('td'); tdClose.textContent = Number(row.close).toFixed(2); tr.appendChild(tdClose);
    tbody.appendChild(tr);
  });
}

async function updateForSymbol(symbol){
  if(!symbol) return;
  showLoader();
  try{
    const payload = await fetchAnalysis(symbol);
    const meta = payload.meta || { symbol };
    const history = payload.history || [];
    renderMeta(meta);
    renderHistoryTable(history);
    // render global score if present
    const gs = payload.globalScore || null;
    const existingGS = document.getElementById('global-score');
    if(existingGS) existingGS.remove();
    if(gs){
      const gsDiv = document.createElement('div'); gsDiv.id = 'global-score';
      const cls = gs.action && gs.action.toLowerCase().startsWith('b') ? 'buy' : (gs.action && gs.action.toLowerCase().startsWith('s') ? 'sell' : 'hold');
      gsDiv.className = 'global-score ' + cls;
      // Prefer weightedAdjusted if present
      const displayScore = (gs.weightedAdjusted !== undefined) ? gs.weightedAdjusted : gs.adjustedAvg;
      const displayOrig = (gs.weightedOriginal !== undefined) ? gs.weightedOriginal : gs.originalAvg;
      gsDiv.innerHTML = `<span class='score-num'>${displayScore}</span> Global (orig ${displayOrig}) — ${gs.action}`;
      document.getElementById('ticker-info').appendChild(gsDiv);
    }

    // Also show weighted global score under the chart (full width)
    const existingChartGS = document.getElementById('global-score-chart');
    if (existingChartGS) existingChartGS.remove();
    if (gs) {
      const chartWrap = document.getElementById('chart-wrap');
      if (chartWrap) {
        const cdiv = document.createElement('div'); cdiv.id = 'global-score-chart';
        const cls2 = gs.action && gs.action.toLowerCase().startsWith('b') ? 'buy' : (gs.action && gs.action.toLowerCase().startsWith('s') ? 'sell' : 'hold');
        cdiv.className = 'global-score-chart ' + cls2;
        const displayScore2 = (gs.weightedAdjusted !== undefined) ? gs.weightedAdjusted : gs.adjustedAvg;
        const displayOrig2 = (gs.weightedOriginal !== undefined) ? gs.weightedOriginal : gs.originalAvg;
        cdiv.innerHTML = `<div class="value">${displayScore2}</div><div class="label">Moyenne pondérée (${displayOrig2} orig) — ${gs.action}</div>`;
        // place after canvas inside chart-wrap
        chartWrap.appendChild(cdiv);
      }
    }
    // show fundamentals with formatting and explanations
    const f = payload.fundamentals || {};
    const fundaDiv = document.getElementById('fundamentals');
    if(fundaDiv) fundaDiv.remove();
    const fd = document.createElement('div'); fd.id = 'fundamentals';
    fd.innerHTML = `<h4>Fundamentals</h4>`;

    function formatLarge(n){
      if(n === null || n === undefined) return '-';
      const num = (typeof n === 'object' && n.raw!==undefined) ? n.raw : n;
      if(isNaN(num)) return String(num);
      const abs = Math.abs(num);
      if(abs >= 1e12) return (num/1e12).toFixed(2) + ' T';
      if(abs >= 1e9) return (num/1e9).toFixed(2) + ' B';
      if(abs >= 1e6) return (num/1e6).toFixed(2) + ' M';
      if(abs >= 1e3) return (num/1e3).toFixed(2) + ' k';
      return num.toString();
    }
    function fmt(n,dec=2){ if(n===null||n===undefined) return '-'; const v=(typeof n==='object'&&n.raw!==undefined)?n.raw:n; return isNaN(v)?String(v):(Math.round(v*(10**dec))/(10**dec)).toString(); }
    function pct(n,dec=2){ if(n===null||n===undefined) return '-'; const v=(typeof n==='object'&&n.raw!==undefined)?n.raw:n; return isNaN(v)?String(v):( (v*100).toFixed(dec)+'%'); }

    // debtToEquity formatting: if very large, use compact format like Market Cap, otherwise show ratio with 2 decimals
    function formatDebt(n){
      if(n === null || n === undefined) return '-';
      const v = (typeof n === 'object' && n.raw!==undefined) ? n.raw : n;
      if(isNaN(v)) return String(v);
      if(Math.abs(v) >= 1000) return formatLarge(v);
      return fmt(v,2);
    }

    const metrics = [
      { key: 'marketCap', label: 'Market Cap', value: formatLarge(f.marketCap), desc: 'Capitalisation boursière : valeur totale de l\'entreprise sur le marché.' },
      { key: 'trailingPE', label: 'Trailing P/E', value: fmt(f.trailingPE,2), desc: 'Cours/Bénéfice (TTM) : prix actuel divisé par le bénéfice par action des 12 derniers mois. Plus bas = potentiellement meilleur pour la valeur.' },
      { key: 'priceToBook', label: 'Price / Book', value: fmt(f.priceToBook,2), desc: 'Valeur comptable : compare le prix de marché à la valeur comptable par action. < 1 peut indiquer sous-valorisation.' },
      { key: 'debtToEquity', label: 'Debt / Equity', value: formatDebt(f.debtToEquity), desc: 'Ratio dette/fonds propres : mesure de l\'endettement relatif. Plus bas est généralement préférable.' }
    ];

    metrics.forEach(m => {
      const div = document.createElement('div'); div.className = 'metric';
      div.innerHTML = `<div class='metric-row'><strong>${m.label}:</strong> <span class='metric-value'>${m.value}</span></div><div class='desc'>${m.desc}</div>`;
      fd.appendChild(div);
    });

    document.getElementById('ticker-info').appendChild(fd);

    // agent pipeline: per-agent signals, risk manager, adjusted signals, portfolio decision
    function renderAgentPipeline(payload) {
      const agentSignals = payload.agentSignals || {};
      const adjustedSignals = payload.adjustedSignals || {};
      const risk = payload.riskManager || null;
      const portfolio = payload.portfolioDecision || null;

      const containerId = 'agent-pipeline';
      const existing = document.getElementById(containerId);
      if (existing) existing.remove();
      const ap = document.createElement('div'); ap.id = containerId;
      ap.innerHTML = `<h4>Agent Pipeline</h4>`;

      const list = document.createElement('div'); list.className = 'agent-list';
      // short French descriptions for each agent
      const descriptions = {
        aswath_damodaran: 'Professeur spécialiste de la valorisation d\'entreprise.',
        ben_graham: 'Père de l\'investissement value, cherche la marge de sécurité.',
        bill_ackman: 'Activiste, focus sur valeur et catalyseurs structurels.',
        cathie_wood: 'Investisseur croissance, forte préférence pour la disruption.',
        charlie_munger: 'Investisseur valeureux et qualitatif, focus qualité du management.',
        michael_burry: 'Value contrarian, aime les opportunités impopulaires.',
        mohnish_pabrai: 'Value concentré, privilégie les opportunités à fort upside.',
        peter_lynch: 'Cherche des «growth at a reasonable price» et des storys compréhensibles.',
        phil_fisher: 'Growth investor axé sur l\'innovation et l\'avantage concurrentiel.',
        rakesh_jhunjhunwala: 'Investisseur concentré, mix valeur et croissance selon le marché local.',
        stanley_druckenmiller: 'Macro trader, sensibilité au cycle économique.',
        warren_buffett: 'Investissement durable sur qualité, moat et gestion prudente.',
        valuation_agent: 'Évalue la valorisation relative et absolue.',
        sentiment_agent: 'Analyse le sentiment du marché et la dynamique comportementale.',
        fundamentals_agent: 'Se focalise sur ratios fondamentaux et santé financière.',
        technicals_agent: 'Utilise indicateurs techniques et momentum.',
        risk_manager: 'Mesure le risque (levier, drawdown) et propose ajustements.',
        portfolio_manager: 'Agrège signaux et décide l\'action finale du portefeuille.'
      };

      Object.entries(agentSignals).forEach(([k, v]) => {
        const adj = adjustedSignals[k];
        const name = v.profile || k;
        const orig = v.score != null ? v.score : (v.rawScore || '-');
        const adjScore = adj ? adj.adjustedScore : '-';
        const signal = adj ? adj.adjustedSignal : (v.signal || '-');
        const d = document.createElement('div');
        const cls = (signal && signal.toLowerCase().startsWith('b')) ? 'rec-buy' : (signal && signal.toLowerCase().startsWith('s') ? 'rec-sell' : 'rec-hold');
        d.className = 'agent-card ' + cls;
        d.innerHTML = `<div class="agent-title">${name}: <span style="font-weight:700">${signal}</span></div>` +
                      `<div class="agent-meta">orig ${orig}, adj ${adjScore}</div>` +
                      `<div class="agent-desc">${descriptions[k] || ''}</div>`;
        list.appendChild(d);
      });
      ap.appendChild(list);

      if (risk) {
        const rdiv = document.createElement('div'); rdiv.style.marginTop = '8px';
        rdiv.innerHTML = `<strong>Risk Manager</strong>: riskFactor=${(risk.riskFactor||0).toFixed(3)}, debt=${risk.debt||0}, drawdown=${(risk.drawdown||0).toFixed(3)}`;
        ap.appendChild(rdiv);
      }

      if (portfolio) {
        const pdiv = document.createElement('div'); pdiv.style.marginTop = '8px';
        const cls = (portfolio.finalAction && portfolio.finalAction.toLowerCase().startsWith('b')) ? 'rec-buy' : (portfolio.finalAction && portfolio.finalAction.toLowerCase().startsWith('s') ? 'rec-sell' : 'rec-hold');
        pdiv.className = cls; pdiv.style.padding = '8px'; pdiv.style.borderRadius = '6px';
        pdiv.innerHTML = `<strong>Portfolio Manager</strong>: ${portfolio.finalAction} (score ${portfolio.finalScore})`;
        ap.appendChild(pdiv);
      }

      // place pipeline under the chart area for full width
      const target = document.getElementById('extra') || document.getElementById('ticker-info');
      // insert pipeline at the top of #extra so it appears above the history table
      const before = target.querySelector('h3') || target.firstChild;
      if (before) target.insertBefore(ap, before);
      else target.appendChild(ap);
    }

    renderAgentPipeline(payload);

    // update chart
    myChart.data.labels = history.map(h => h.date);
    myChart.data.datasets[0].data = history.map(h => h.close);
    myChart.update();
  }catch(err){
    console.error('Failed to load symbol', err);
    alert('Erreur lors du chargement: ' + (err.error || err.message || JSON.stringify(err)));
  } finally {
    hideLoader();
  }
}

function attachSearch(){
  const input = document.getElementById('search');
  // Autocomplete + no-Enter search
  const suggestionsBoxId = 'suggestions-box';
  // small local symbol database for autocomplete (ticker: name)
  const symbolDb = [
    ['AAPL','Apple Inc.'],['MSFT','Microsoft Corp.'],['AMZN','Amazon.com, Inc.'],['GOOGL','Alphabet Inc.'],['TSLA','Tesla, Inc.'],['NVDA','NVIDIA Corporation'],['META','Meta Platforms, Inc.'],['BRK-B','Berkshire Hathaway'],['JPM','JPMorgan Chase & Co.'],['V','Visa Inc.'],['JNJ','Johnson & Johnson'],['WMT','Walmart Inc.'],['PG','Procter & Gamble Co.'],['DIS','The Walt Disney Company'],['NFLX','Netflix, Inc.']
  ];

  function createSuggestionsContainer(){
    let box = document.getElementById(suggestionsBoxId);
    if(box) return box;
    box = document.createElement('div'); box.id = suggestionsBoxId; box.className = 'suggestions';
    const rect = input.getBoundingClientRect();
    // place as absolute inside header container
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(box);
    return box;
  }

  let debounceTimer = null;
  const DEBOUNCE_MS = 450;

  function debounce(fn, ms){
    if(debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, ms);
  }

  function buildSuggestions(q){
    const qq = q.trim().toLowerCase();
    if(!qq) return [];
    // match ticker startsWith or company includes
    const out = symbolDb.filter(([t,n]) => t.toLowerCase().startsWith(qq) || n.toLowerCase().includes(qq)).slice(0,8);
    // if input looks like ticker (letters only <=6) and not in DB, include raw ticker
    if(/^[a-zA-Z\.\-]{1,6}$/.test(q) && !out.some(o=>o[0].toUpperCase()===q.toUpperCase())) out.unshift([q.toUpperCase(), '']);
    return out;
  }

  function renderSuggestions(list){
    const box = createSuggestionsContainer();
    box.innerHTML = '';
    if(!list || list.length===0){ box.style.display='none'; return; }
    list.forEach((it, idx) => {
      const div = document.createElement('div'); div.className='suggestion-item';
      div.dataset.ticker = it[0];
      div.innerHTML = `<strong>${it[0]}</strong> &nbsp; <span style="color:#666;font-size:12px">${it[1]||''}</span>`;
      div.addEventListener('click', ()=>{ selectSuggestion(it[0]); });
      box.appendChild(div);
    });
    box.style.display='block';
    activeSuggestionIndex = -1;
  }

  function closeSuggestions(){
    const box = document.getElementById(suggestionsBoxId);
    if(box) box.style.display='none';
  }

  function selectSuggestion(ticker){
    input.value = ticker;
    closeSuggestions();
    updateForSymbol(ticker);
  }

  // keyboard navigation
  let activeSuggestionIndex = -1;
  input.addEventListener('keydown', e => {
    const box = document.getElementById(suggestionsBoxId);
    const items = box ? Array.from(box.querySelectorAll('.suggestion-item')) : [];
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(items.length===0) return;
      activeSuggestionIndex = Math.min(items.length-1, activeSuggestionIndex+1);
      items.forEach(i=>i.classList.remove('active'));
      items[activeSuggestionIndex].classList.add('active');
      return;
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(items.length===0) return;
      activeSuggestionIndex = Math.max(0, activeSuggestionIndex-1);
      items.forEach(i=>i.classList.remove('active'));
      items[activeSuggestionIndex].classList.add('active');
      return;
    }
    if(e.key === 'Enter'){
      // prevent form submit default, select active suggestion if any
      if(items.length>0 && activeSuggestionIndex>=0){
        e.preventDefault();
        const t = items[activeSuggestionIndex].dataset.ticker;
        if(t) selectSuggestion(t);
        return;
      }
      // otherwise fallback to using input value
      const s = input.value.trim().toUpperCase();
      if(s) { e.preventDefault(); updateForSymbol(s); closeSuggestions(); }
    }
    if(e.key === 'Escape') { closeSuggestions(); }
  });

  // on input: debounce show suggestions and optionally auto-search when valid ticker
  input.addEventListener('input', e => {
    const v = input.value || '';
    debounce(()=>{
      const list = buildSuggestions(v);
      renderSuggestions(list);
      // auto search: if v looks like a ticker (1-6 letters/dash/dot) then trigger search
      if(/^[a-zA-Z\.\-]{1,6}$/.test(v.trim())){
        const t = v.trim().toUpperCase();
        updateForSymbol(t);
      }
    }, DEBOUNCE_MS);
  });

  // click outside to close suggestions
  document.addEventListener('click', (ev)=>{
    if(!input.contains(ev.target)){
      const box = document.getElementById(suggestionsBoxId);
      if(box && !box.contains(ev.target)) box.style.display='none';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initEmptyChart();
  attachSearch();
  // If page was opened with ?symbol= or #TICKER, prefill and load that symbol
  try{
    const params = new URLSearchParams(window.location.search);
    const qsym = params.get('symbol');
    const hash = (window.location.hash || '').replace('#','');
    const sym = (qsym && qsym.trim()) ? qsym.trim().toUpperCase() : (hash && hash.trim() ? hash.trim().toUpperCase() : null);
    if(sym) updateForSymbol(sym);
  }catch(e){/* ignore */}
});
// Loader control
function showLoader(){
  const l = document.getElementById('loader'); if(l) l.classList.remove('hidden');
}
function hideLoader(){
  const l = document.getElementById('loader'); if(l) l.classList.add('hidden');
}
