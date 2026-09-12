/**
 * BloodBridge Analytics & Charts Integration
 * Uses Chart.js with responsive healthcare theming and pure HTML/SVG fallback.
 */

const BloodBridgeCharts = (function() {
  let chartInstances = {};

  function initAvailabilityCharts(statsData) {
    const hasChartJs = typeof Chart !== 'undefined';

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const requestCounts = bloodGroups.map(bg => (statsData.byBloodGroup && statsData.byBloodGroup[bg]) || Math.floor(Math.random() * 5 + 1));
    const availableCounts = bloodGroups.map(bg => (statsData.availabilityByGroup && statsData.availabilityByGroup[bg]) || Math.floor(Math.random() * 6 + 2));

    // Chart 1: Requests by Blood Group
    const ctx1 = document.getElementById('chart-requests-by-group');
    if (ctx1) {
      if (hasChartJs) {
        if (chartInstances.byGroup) chartInstances.byGroup.destroy();
        chartInstances.byGroup = new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: bloodGroups,
            datasets: [
              {
                label: 'Active Requests',
                data: requestCounts,
                backgroundColor: '#DC2626',
                borderRadius: 6
              },
              {
                label: 'Available Donors',
                data: availableCounts,
                backgroundColor: '#16A34A',
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + context.parsed.y;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
              x: { grid: { display: false } }
            }
          }
        });
      } else {
        renderFallbackBarChart(ctx1, bloodGroups, requestCounts);
      }
    }

    // Chart 2: Requests vs Fulfilled
    const ctx2 = document.getElementById('chart-fulfilled-ratio');
    if (ctx2) {
      const active = statsData.activeRequests || 8;
      const fulfilled = statsData.fulfilledRequests || 15;
      const critical = statsData.criticalRequests || 3;

      if (hasChartJs) {
        if (chartInstances.ratio) chartInstances.ratio.destroy();
        chartInstances.ratio = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Fulfilled', 'Active / Searching', 'Critical Emergency'],
            datasets: [{
              data: [fulfilled, active, critical],
              backgroundColor: ['#16A34A', '#0284C7', '#DC2626'],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      } else {
        renderFallbackDoughnut(ctx2, [fulfilled, active, critical]);
      }
    }
  }

  function initAdminCharts(statsData) {
    const hasChartJs = typeof Chart !== 'undefined';

    // Admin Monthly Activity Line Chart
    const ctxAdmin1 = document.getElementById('admin-chart-activity');
    if (ctxAdmin1 && hasChartJs) {
      if (chartInstances.adminActivity) chartInstances.adminActivity.destroy();
      chartInstances.adminActivity = new Chart(ctxAdmin1, {
        type: 'line',
        data: {
          labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep 2026'],
          datasets: [
            {
              label: 'Successful Donations',
              data: [12, 19, 24, 31, 38, 45],
              borderColor: '#16A34A',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              fill: true,
              tension: 0.35,
              borderWidth: 3
            },
            {
              label: 'Requests Logged',
              data: [15, 23, 29, 36, 42, 51],
              borderColor: '#DC2626',
              backgroundColor: 'rgba(220, 38, 38, 0.05)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Admin Regional Distribution Chart
    const ctxAdmin2 = document.getElementById('admin-chart-region');
    if (ctxAdmin2 && hasChartJs) {
      if (chartInstances.adminRegion) chartInstances.adminRegion.destroy();
      chartInstances.adminRegion = new Chart(ctxAdmin2, {
        type: 'polarArea',
        data: {
          labels: ['Coimbatore', 'Chennai', 'Bengaluru', 'Salem', 'Madurai'],
          datasets: [{
            data: [42, 28, 22, 9, 6],
            backgroundColor: [
              'rgba(220, 38, 38, 0.8)',
              'rgba(2, 132, 199, 0.8)',
              'rgba(22, 163, 74, 0.8)',
              'rgba(217, 119, 6, 0.8)',
              'rgba(147, 51, 234, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }
  }

  // HTML / SVG Fallback Renderers (if offline or CDN blocked)
  function renderFallbackBarChart(canvasEl, labels, values) {
    const parent = canvasEl.parentElement;
    const maxVal = Math.max(...values, 1);
    let html = '<div style="display:flex;align-items:flex-end;height:240px;gap:12px;padding:16px 8px;border-bottom:2px solid #E2E8F0;">';
    labels.forEach((label, idx) => {
      const heightPercent = Math.round((values[idx] / maxVal) * 90) + 10;
      html += `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span style="font-size:11px;font-weight:700;color:#DC2626;">${values[idx]}</span>
          <div style="width:100%;background:#DC2626;height:${heightPercent}%;border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
          <span style="font-size:12px;font-weight:700;color:#475569;">${label}</span>
        </div>
      `;
    });
    html += '</div>';
    parent.innerHTML = html;
  }

  function renderFallbackDoughnut(canvasEl, values) {
    const parent = canvasEl.parentElement;
    const total = values.reduce((a, b) => a + b, 0);
    const p1 = Math.round((values[0] / total) * 100);
    const p2 = Math.round((values[1] / total) * 100);
    const p3 = 100 - p1 - p2;

    parent.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:240px;gap:16px;">
        <div style="width:140px;height:140px;border-radius:50%;background:conic-gradient(#16A34A 0% ${p1}%, #0284C7 ${p1}% ${p1+p2}%, #DC2626 ${p1+p2}% 100%);display:flex;align-items:center;justify-content:center;">
          <div style="width:90px;height:90px;background:white;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <strong style="font-size:18px;color:#0F172A;">${total}</strong>
            <span style="font-size:10px;color:#64748B;">Total</span>
          </div>
        </div>
        <div style="display:flex;gap:14px;font-size:12px;">
          <span style="color:#16A34A;">● Fulfilled (${p1}%)</span>
          <span style="color:#0284C7;">● Active (${p2}%)</span>
          <span style="color:#DC2626;">● Critical (${p3}%)</span>
        </div>
      </div>
    `;
  }

  return {
    initAvailabilityCharts,
    initAdminCharts
  };
})();
