// Dashboards & Notification Center Controller

function renderDonorDashboard() {
  const nameEl = document.getElementById('donor-dash-name');
  const bloodEl = document.getElementById('donor-dash-blood');
  const donationsEl = document.getElementById('donor-dash-donations');
  const lastDonationEl = document.getElementById('donor-dash-lastdate');
  const toggleBtn = document.getElementById('donor-dash-avail-toggle');

  if (nameEl) nameEl.textContent = state.currentUser.name;
  if (bloodEl) bloodEl.textContent = state.currentUser.bloodGroup || 'O-';
  if (donationsEl) donationsEl.textContent = state.currentUser.totalDonations || 8;
  if (lastDonationEl) lastDonationEl.textContent = state.currentUser.lastDonationDate || '2026-05-10';

  if (toggleBtn) {
    const isAvail = state.currentUser.availability;
    toggleBtn.textContent = isAvail ? 'Status: Currently Available' : 'Status: Currently Not Available';
    toggleBtn.className = isAvail ? 'btn-primary' : 'btn-secondary';
    toggleBtn.style.background = isAvail ? '#16A34A' : '#64748B';
    toggleBtn.style.color = 'white';

    toggleBtn.onclick = async () => {
      const nextState = !state.currentUser.availability;
      state.currentUser.availability = nextState;
      showToast('Availability updated to: ' + (nextState ? 'Available' : 'Not Available'), 'info');
      renderDonorDashboard();
      updatePersonaDisplay();
    };
  }

  const matchedContainer = document.getElementById('donor-matched-requests');
  if (!matchedContainer) return;

  const myBlood = state.currentUser.bloodGroup || 'O-';
  const matchingRequests = state.requests.filter(r => 
    BloodBridgeMatching.isCompatible(myBlood, r.bloodGroup) &&
    r.status !== 'Fulfilled' &&
    r.status !== 'Cancelled'
  );

  if (matchingRequests.length === 0) {
    matchedContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #64748B; background: white; border-radius: 12px; border: 1px solid #E2E8F0;">
        No active emergency requests require ${myBlood} donors at this moment. You will receive an immediate alert when someone nearby needs assistance.
      </div>
    `;
    return;
  }

  matchedContainer.innerHTML = matchingRequests.map(req => `
    <div class="emergency-card ${req.urgency === 'Critical' ? 'critical-border' : ''}">
      <div class="emergency-header">
        <span class="urgency-badge urgency-${req.urgency.toLowerCase()}">
          ${req.urgency.toUpperCase()}
        </span>
        <span class="emergency-req-id">${req.requestId}</span>
      </div>

      <div class="emergency-blood-row">
        <span class="emergency-blood-group">${req.bloodGroup}</span>
        <span class="emergency-units">${req.unitsRequired} Unit(s) Needed</span>
      </div>

      <div class="emergency-details">
        <div>🏥 <strong>${req.hospital}</strong></div>
        <div>📍 ${req.hospitalLocation} (Approx. ${req.distanceKm || 3.8} km)</div>
        <div>⏱️ ${req.requiredTime}</div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 14px;">
        <button class="btn-primary" style="flex: 1; justify-content: center; background: #16A34A;" onclick="respondToEmergency('${req.requestId}', 'accept')">
          Accept & Respond
        </button>
        <button class="btn-secondary" style="flex: 1; justify-content: center;" onclick="respondToEmergency('${req.requestId}', 'decline')">
          Decline
        </button>
      </div>
    </div>
  `).join('');
}

async function respondToEmergency(requestId, action) {
  try {
    const res = await BloodBridgeAPI.respondToRequest(requestId, state.currentUser.id, state.currentUser.name, action);
    if (res.success) {
      if (action === 'accept') {
        showToast('Thank you! Your response has been sent to the requester.', 'success');
      } else {
        showToast('Request declined.', 'info');
      }
      await loadInitialData();
      renderDonorDashboard();
    }
  } catch (err) {
    showToast('Action failed: ' + err.message, 'error');
  }
}

function renderRequesterDashboard() {
  const container = document.getElementById('requester-active-requests');
  if (!container) return;

  const activeReqs = state.requests.filter(r => r.status !== 'Cancelled');

  if (activeReqs.length === 0) {
    container.innerHTML = `
      <div style="padding: 36px; text-align: center; background: white; border-radius: 12px; border: 1px solid #E2E8F0;">
        <h3 style="font-weight: 700; color: #0F172A; margin-bottom: 8px;">No blood requests yet</h3>
        <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 16px;">Submit an emergency or scheduled blood request to initiate matching.</p>
        <button class="btn-primary" onclick="navigateTo('request-blood')">Create Blood Request</button>
      </div>
    `;
    return;
  }

  const stages = [
    'Request Created',
    'Searching for Donors',
    'Donor Found',
    'Donor Response Received',
    'Hospital Coordination',
    'Fulfilled'
  ];

  container.innerHTML = activeReqs.map(req => {
    const currentIdx = stages.indexOf(req.status);

    return `
      <div style="background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <h3 style="font-size: 1.35rem; font-weight: 800; color: #0F172A;">${req.patientName}</h3>
              <span class="urgency-badge urgency-${req.urgency.toLowerCase()}">${req.urgency}</span>
            </div>
            <p style="font-size: 0.875rem; color: #64748B;">
              Tracking ID: <strong style="font-family: monospace; color: #DC2626;">${req.requestId}</strong> | Hospital: <strong>${req.hospital}</strong>
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="blood-badge" style="width: 44px; height: 44px; font-size: 1.15rem;">${req.bloodGroup}</div>
            <div style="font-size: 0.875rem; font-weight: 700;">${req.unitsRequired} Unit(s)</div>
          </div>
        </div>

        <!-- 6-Stage Timeline -->
        <div class="timeline-container">
          <div class="timeline-steps">
            ${stages.map((st, idx) => {
              let cls = '';
              if (idx < currentIdx) cls = 'completed';
              else if (idx === currentIdx) cls = 'current';
              return `
                <div class="timeline-step ${cls}">
                  <div class="timeline-step-node">${idx < currentIdx ? '✓' : idx + 1}</div>
                  <div class="timeline-step-label">${st}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Donor Responses Section -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px;">
          <div style="font-size: 0.8125rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
            Donor Responses (${(req.responses && req.responses.length) || 0})
          </div>
          ${req.responses && req.responses.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${req.responses.map(resp => `
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                  <span>🩸 <strong>${resp.donorName}</strong> accepted this request.</span>
                  <span style="color: #16A34A; font-weight: 700;">Status: ${resp.status}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="font-size: 0.875rem; color: #64748B;">
              Currently notifying matching donors. As soon as a donor accepts, their response will appear here.
            </div>
          `}
        </div>

        <!-- Action Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 14px;">
          <div style="font-size: 0.8125rem; color: #64748B;">
            Contact Desk: <strong>${req.contactNumber}</strong>
          </div>
          <div style="display: flex; gap: 10px;">
            ${req.status !== 'Fulfilled' ? `
              <button class="btn-table-sm" style="color: #16A34A;" onclick="advanceRequestStatus('${req.requestId}', 'Fulfilled')">
                Mark Fulfilled ✓
              </button>
              <button class="btn-table-sm" style="color: #DC2626;" onclick="cancelRequest('${req.requestId}')">
                Cancel Request
              </button>
            ` : `
              <span style="font-size: 0.875rem; font-weight: 700; color: #16A34A;">✓ Completed & Fulfilled</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function advanceRequestStatus(id, newStatus) {
  try {
    const res = await BloodBridgeAPI.updateRequestStatus(id, newStatus);
    if (res.success) {
      showToast('Status updated: ' + newStatus, 'success');
      await loadInitialData();
      renderRequesterDashboard();
    }
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

async function cancelRequest(id) {
  if (confirm('Are you sure you want to cancel request ' + id + '?')) {
    await advanceRequestStatus(id, 'Cancelled');
  }
}

function renderAdminDashboard() {
  const dTotal = document.getElementById('admin-stat-donors');
  const dActive = document.getElementById('admin-stat-active-donors');
  const rActive = document.getElementById('admin-stat-requests');
  const rCrit = document.getElementById('admin-stat-critical');
  const rFulfilled = document.getElementById('admin-stat-fulfilled');
  const hPartner = document.getElementById('admin-stat-hospitals');
  const sReports = document.getElementById('admin-stat-reports');

  if (dTotal) dTotal.textContent = state.donors.length;
  if (dActive) dActive.textContent = state.donors.filter(d => d.availability).length;
  if (rActive) rActive.textContent = state.requests.filter(r => r.status !== 'Fulfilled' && r.status !== 'Cancelled').length;
  if (rCrit) rCrit.textContent = state.requests.filter(r => r.urgency === 'Critical' && r.status !== 'Fulfilled').length;
  if (rFulfilled) rFulfilled.textContent = state.requests.filter(r => r.status === 'Fulfilled').length;
  if (hPartner) hPartner.textContent = state.hospitals.length;
  if (sReports) sReports.textContent = state.reports.length;

  // Donors Moderation Table
  const donorTable = document.getElementById('admin-donors-table-body');
  if (donorTable) {
    donorTable.innerHTML = state.donors.slice(0, 10).map(d => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td><span class="blood-badge" style="width: 28px; height: 28px; font-size: 0.8rem;">${d.bloodGroup}</span></td>
        <td>${d.city} (${d.approximateArea})</td>
        <td>
          <span class="donor-status-pill ${d.availability ? 'status-avail' : 'status-unavail'}">
            ${d.availability ? 'Available' : 'Unavailable'}
          </span>
        </td>
        <td>${d.verified ? '<span style="color: #0284C7; font-weight: 700;">Verified ✓</span>' : 'Pending'}</td>
        <td>
          <button class="btn-table-sm" onclick="toggleDonorVerification('${d.id}')">
            ${d.verified ? 'Unverify' : 'Verify'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Requests Moderation Table
  const reqTable = document.getElementById('admin-requests-table-body');
  if (reqTable) {
    reqTable.innerHTML = state.requests.slice(0, 8).map(r => `
      <tr>
        <td style="font-family: monospace; font-weight: 700;">${r.requestId}</td>
        <td>${r.patientName}</td>
        <td><strong>${r.bloodGroup}</strong> (${r.unitsRequired}U)</td>
        <td>${r.hospital}</td>
        <td><span class="urgency-badge urgency-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
        <td><strong>${r.status}</strong></td>
        <td>
          <button class="btn-table-sm" onclick="adminQuickStatus('${r.requestId}', 'Fulfilled')">Fulfill</button>
          <button class="btn-table-sm" style="color: #DC2626;" onclick="adminMarkSuspicious('${r.requestId}')">Flag</button>
        </td>
      </tr>
    `).join('');
  }

  // Reports Table
  const repTable = document.getElementById('admin-reports-table-body');
  if (repTable) {
    repTable.innerHTML = state.reports.map(rep => `
      <tr>
        <td><strong>${rep.id}</strong></td>
        <td style="font-family: monospace;">${rep.requestId}</td>
        <td><span style="color: #DC2626; font-weight: 700;">${rep.reason}</span></td>
        <td style="font-size: 0.8125rem;">${rep.details}</td>
        <td><span class="donor-status-pill ${rep.status === 'Resolved' ? 'status-avail' : 'status-unavail'}">${rep.status}</span></td>
        <td>
          ${rep.status !== 'Resolved' ? `
            <button class="btn-table-sm" onclick="resolveReport('${rep.id}')">Resolve</button>
          ` : 'Resolved ✓'}
        </td>
      </tr>
    `).join('');
  }

  BloodBridgeCharts.initAdminCharts(state.stats);
}

function toggleDonorVerification(id) {
  const d = state.donors.find(donor => donor.id === id);
  if (d) {
    d.verified = !d.verified;
    showToast('Updated verification for ' + d.name, 'success');
    renderAdminDashboard();
  }
}

async function adminQuickStatus(requestId, status) {
  await advanceRequestStatus(requestId, status);
  renderAdminDashboard();
}

function adminMarkSuspicious(requestId) {
  openReportModal(requestId);
}

async function resolveReport(reportId) {
  try {
    const res = await BloodBridgeAPI.updateReportStatus(reportId, 'Resolved', 'Verified by clinical administrator.');
    if (res.success) {
      showToast('Report ' + reportId + ' marked as resolved.', 'success');
      await loadInitialData();
      renderAdminDashboard();
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function renderNotifications() {
  const container = document.getElementById('notifications-list-container');
  if (!container) return;

  if (state.notifications.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; background: white; border-radius: 12px; border: 1px solid #E2E8F0;">
        <div style="font-size: 32px; margin-bottom: 8px;">🔔</div>
        <h3 style="font-weight: 700;">No notifications</h3>
        <p style="color: #64748B; font-size: 0.875rem;">You are all caught up!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.notifications.map(n => `
    <div style="background: ${n.read ? '#FFFFFF' : '#FEF2F2'}; border: 1px solid ${n.read ? '#E2E8F0' : '#FECACA'}; border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 16px; cursor: pointer;" onclick="markNotificationRead('${n.id}')">
      <div style="font-size: 24px; flex-shrink: 0;">${n.icon}</div>
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #0F172A;">${n.title}</h4>
          <span style="font-size: 0.75rem; color: #64748B;">${n.timestamp}</span>
        </div>
        <p style="font-size: 0.875rem; color: #475569; line-height: 1.45;">${n.message}</p>
        ${n.requestId ? `
          <button class="btn-table-sm" style="margin-top: 8px;" onclick="event.stopPropagation(); openRequestModal('${n.requestId}')">
            View Request ${n.requestId}
          </button>
        ` : ''}
      </div>
      ${!n.read ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #DC2626; margin-top: 6px;"></span>' : ''}
    </div>
  `).join('');
}

async function markNotificationRead(id) {
  await BloodBridgeAPI.markNotificationRead(id);
  const n = state.notifications.find(item => item.id === id);
  if (n) n.read = true;
  updateNotificationBadge();
  renderNotifications();
}

async function markAllNotificationsRead() {
  await BloodBridgeAPI.markAllNotificationsRead();
  state.notifications.forEach(n => n.read = true);
  updateNotificationBadge();
  renderNotifications();
  showToast('All notifications marked as read', 'info');
}
