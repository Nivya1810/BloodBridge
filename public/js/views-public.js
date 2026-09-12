// Public Discovery Views Controller

function renderHome() {
  const donorStat = document.getElementById('stat-donors');
  const reqStat = document.getElementById('stat-requests');
  const fulfilledStat = document.getElementById('stat-fulfilled');
  const hospStat = document.getElementById('stat-hospitals');

  if (donorStat) donorStat.textContent = (state.donors.length || 22) + '+';
  if (reqStat) reqStat.textContent = state.requests.filter(r => r.status !== 'Fulfilled').length || '8';
  if (fulfilledStat) fulfilledStat.textContent = (state.requests.filter(r => r.status === 'Fulfilled').length + 48) || '54';
  if (hospStat) hospStat.textContent = (state.hospitals.length || 7) + '+';
}

function renderFindBlood() {
  const container = document.getElementById('donors-results-container');
  if (!container) return;

  const bloodGroupFilter = document.getElementById('filter-donor-blood')?.value || 'all';
  const cityFilter = document.getElementById('filter-donor-city')?.value || 'all';
  const availFilter = document.getElementById('filter-donor-avail')?.value || 'all';
  const sortOption = document.getElementById('sort-donor-by')?.value || 'nearest';

  let filtered = [...state.donors];

  if (bloodGroupFilter !== 'all') {
    filtered = filtered.filter(d => d.bloodGroup.toUpperCase() === bloodGroupFilter.toUpperCase());
  }
  if (cityFilter !== 'all') {
    filtered = filtered.filter(d => d.city.toLowerCase() === cityFilter.toLowerCase());
  }
  if (availFilter !== 'all') {
    filtered = filtered.filter(d => d.availability === (availFilter === 'true'));
  }

  if (sortOption === 'nearest') {
    filtered.sort((a, b) => (a.distanceKm || 10) - (b.distanceKm || 10));
  } else if (sortOption === 'available') {
    filtered.sort((a, b) => (b.availability ? 1 : 0) - (a.availability ? 1 : 0));
  } else if (sortOption === 'donations') {
    filtered.sort((a, b) => (b.totalDonations || 0) - (a.totalDonations || 0));
  }

  const countBadge = document.getElementById('found-donors-count');
  if (countBadge) countBadge.textContent = filtered.length + ' Donors Located';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: white; border-radius: 12px; border: 1px solid #E2E8F0;">
        <div style="font-size: 36px; margin-bottom: 8px;">🩸</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: #0F172A;">No matching donors found</h3>
        <p style="font-size: 0.875rem; color: #64748B; margin-top: 4px;">Try adjusting your blood group, radius, or availability filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(donor => `
    <div class="donor-card">
      <div>
        <div class="donor-card-top">
          <div class="blood-badge">${donor.bloodGroup}</div>
          <span class="donor-status-pill ${donor.availability ? 'status-avail' : 'status-unavail'}">
            ${donor.availability ? '● Available' : '○ Not Available'}
          </span>
        </div>

        <h3>
          ${donor.name}
          ${donor.verified ? '<span class="verified-icon" title="Verified Donor">✓</span>' : ''}
        </h3>

        <div class="donor-meta">
          <div class="donor-meta-item">📍 Area: <strong>${donor.approximateArea}, ${donor.city}</strong></div>
          <div class="donor-meta-item">🚗 Distance: <strong>Approx. ${donor.distanceKm || 3.5} km</strong></div>
          <div class="donor-meta-item">📅 Last Donation: <strong>${donor.lastDonationDate || 'First time donor'}</strong></div>
          <div class="donor-meta-item">❤️ Total Donations: <strong>${donor.totalDonations || 0} times</strong></div>
        </div>
      </div>

      <div>
        <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 10px; font-style: italic;">
          🔒 Privacy protected: Approximate area shown. Direct contact shielded.
        </div>
        <button class="donor-card-btn" onclick="openContactDonorModal('${donor.id}')">
          Request Coordination
        </button>
      </div>
    </div>
  `).join('');
}

function renderEmergencyRequests() {
  const container = document.getElementById('emergency-requests-container');
  if (!container) return;

  const bgFilter = document.getElementById('filter-emergency-bg')?.value || 'all';
  const cityFilter = document.getElementById('filter-emergency-city')?.value || 'all';
  const urgencyFilter = document.getElementById('filter-emergency-urgency')?.value || 'all';

  let list = [...state.requests].filter(r => r.status !== 'Fulfilled' && r.status !== 'Cancelled');

  if (bgFilter !== 'all') list = list.filter(r => r.bloodGroup.toUpperCase() === bgFilter.toUpperCase());
  if (cityFilter !== 'all') list = list.filter(r => (r.city || '').toLowerCase() === cityFilter.toLowerCase());
  if (urgencyFilter !== 'all') list = list.filter(r => r.urgency.toLowerCase() === urgencyFilter.toLowerCase());

  const weight = { 'Critical': 3, 'Urgent': 2, 'Normal': 1 };
  list.sort((a, b) => (weight[b.urgency] || 0) - (weight[a.urgency] || 0));

  container.innerHTML = list.map(req => {
    const isCrit = req.urgency === 'Critical';
    return `
      <div class="emergency-card ${isCrit ? 'critical-border' : ''}">
        <div class="emergency-header">
          <span class="urgency-badge urgency-${req.urgency.toLowerCase()}">
            ${isCrit ? '🔴 CRITICAL' : (req.urgency === 'Urgent' ? '🟡 URGENT' : '🟢 NORMAL')}
          </span>
          <span class="emergency-req-id">${req.requestId}</span>
        </div>

        <div class="emergency-blood-row">
          <span class="emergency-blood-group">${req.bloodGroup}</span>
          <span class="emergency-units">${req.unitsRequired} Unit(s) Required</span>
        </div>

        <div class="emergency-details">
          <div>🏥 Hospital: <strong>${req.hospital}</strong></div>
          <div>📍 Area: <strong>${req.hospitalLocation || req.city}</strong></div>
          <div>🚗 Distance: <strong>Approx. ${req.distanceKm || 4.2} km</strong></div>
          <div>⏱️ Urgency: <strong>${req.requiredTime || 'Immediate'}</strong></div>
        </div>

        <div class="emergency-countdown">
          ⏳ ${req.timeRemaining || 'Needed urgently'}
        </div>

        <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="openRequestModal('${req.requestId}')">
          View Request & Respond
        </button>
      </div>
    `;
  }).join('');
}

function renderHospitals() {
  const listContainer = document.getElementById('hospitals-list');
  if (!listContainer) return;

  listContainer.innerHTML = state.hospitals.map(hosp => `
    <div class="hospital-card" onclick="BloodBridgeMap.focusHospital(${hosp.lat}, ${hosp.lng})">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #0F172A;">${hosp.name}</h3>
        ${hosp.verified ? '<span style="font-size: 0.75rem; background: #E0F2FE; color: #0369A1; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">Verified Partner</span>' : ''}
      </div>
      <p style="font-size: 0.8125rem; color: #64748B; margin-bottom: 10px;">📍 ${hosp.area}, ${hosp.city}</p>
      
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8125rem; margin-bottom: 12px;">
        <div style="color: #991B1B; font-weight: 600;">🚨 ${hosp.emergencyAvailable}</div>
        <div style="color: #166534; font-weight: 600;">🩸 ${hosp.bloodBankAvailable}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 10px;">
        <span style="font-size: 0.8125rem; color: #64748B;">Desk: <strong>${hosp.contact}</strong></span>
        <a href="tel:${hosp.contact}" class="btn-table-sm" style="color: #DC2626; text-decoration: none;">Call Desk</a>
      </div>
    </div>
  `).join('');

  BloodBridgeMap.initHospitalMap(state.hospitals, 'leaflet-map');
}

function renderBloodAvailability() {
  const container = document.getElementById('availability-cards-grid');
  if (!container) return;

  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  const cardData = groups.map(group => {
    const registered = state.donors.filter(d => d.bloodGroup.toUpperCase() === group).length;
    const available = state.donors.filter(d => d.bloodGroup.toUpperCase() === group && d.availability).length;
    const activeReqs = state.requests.filter(r => r.bloodGroup.toUpperCase() === group && r.status !== 'Fulfilled').length;
    
    let demandText = 'Normal 🟢';
    let demandClass = 'demand-normal';
    if (group === 'O-' || activeReqs >= 2) {
      demandText = 'High Demand 🔴';
      demandClass = 'demand-high';
    } else if (group === 'A+' || group === 'B+' || activeReqs === 1) {
      demandText = 'Moderate 🟡';
      demandClass = 'demand-mod';
    }

    return { group, registered, available, activeReqs, demandText, demandClass };
  });

  container.innerHTML = cardData.map(c => `
    <div class="avail-card">
      <div class="avail-card-header">
        <span class="avail-blood-title">${c.group}</span>
        <span class="demand-tag ${c.demandClass}">${c.demandText}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="avail-stats-row">
          <span>Registered Donors</span>
          <strong>${c.registered}</strong>
        </div>
        <div class="avail-stats-row">
          <span>Currently Available</span>
          <strong style="color: #16A34A;">${c.available}</strong>
        </div>
        <div class="avail-stats-row">
          <span>Active Requests</span>
          <strong style="color: #DC2626;">${c.activeReqs}</strong>
        </div>
      </div>

      <button class="btn-table-sm" style="width: 100%; text-align: center;" onclick="quickFilterDonorsByGroup('${c.group}')">
        View ${c.group} Donors
      </button>
    </div>
  `).join('');

  BloodBridgeCharts.initAvailabilityCharts(state.stats);
}

function quickFilterDonorsByGroup(group) {
  navigateTo('find-blood');
  const select = document.getElementById('filter-donor-blood');
  if (select) {
    select.value = group;
    renderFindBlood();
  }
}
