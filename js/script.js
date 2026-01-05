const rawData = [
  {label: 'Paris', value: 120},
  {label: 'Lyon', value: 90},
  {label: 'Marseille', value: 75},
  {label: 'Toulouse', value: 60},
  {label: 'Nice', value: 50},
  {label: 'Nantes', value: 45},
  {label: 'Strasbourg', value: 30},
  {label: 'Bordeaux', value: 55}
];

const ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: rawData.map(d=>d.label),
    datasets: [{
      label: 'Valeur',
      data: rawData.map(d=>d.value),
      backgroundColor: 'rgba(54,162,235,0.7)'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } }
  }
});

function renderFiltered(query){
  const q = (query||'').trim().toLowerCase();
  const filtered = rawData.filter(d => d.label.toLowerCase().includes(q));
  myChart.data.labels = filtered.map(d=>d.label);
  myChart.data.datasets[0].data = filtered.map(d=>d.value);
  myChart.update();
}

const input = document.getElementById('search');
input.addEventListener('input', e => renderFiltered(e.target.value));
