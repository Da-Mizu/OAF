// Fetch and render top market cap companies
// Use backend on port 3000 when developing locally (served by Apache on port 80)
const API_BASE = (function(){
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
  return window.location.origin;
})();

async function fetchTopMC(limit = 20) {
  try {
    const resp = await fetch(`${API_BASE}/api/top_mc?limit=${limit}`);
    if (!resp.ok) throw new Error('network');
    const data = await resp.json();
    renderTable(data);
  } catch (e) {
    const el = document.querySelector('#top-mc');
    el.innerHTML = '<p>Erreur lors du chargement des données.</p>';
    console.error(e);
  }
}

function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  if (n >= 1e12) return (n/1e12).toFixed(2) + ' T';
  if (n >= 1e9) return (n/1e9).toFixed(2) + ' B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + ' M';
  return n.toLocaleString();
}

function renderTable(list) {
  const tbody = document.querySelector('#mc-table tbody');
  tbody.innerHTML = '';
  list.forEach((item, idx) => {
    const tr = document.createElement('tr');
    const price = item.price ? (typeof item.price === 'object' ? (item.price.raw || item.price) : item.price) : null;
    const note = `${(item.name||'-')}`;
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td><a href="../index.html?symbol=${item.symbol}">${item.symbol}</a></td>
      <td>${item.name || '-'}</td>
      <td class="price-value">${price ? price : '-'}</td>
      <td class="mc-value">${fmtNum(item.marketCap)}</td>
      <td>
        <a class="btn-view" href="../index.html?symbol=${item.symbol}">
          <span class="btn-main">Voir</span>
          <span class="btn-note">${note}</span>
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  fetchTopMC(20);
});
