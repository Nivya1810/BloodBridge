// Modals, Overlays & Toast Notification System

function initModalEvents() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) closeAllModals();
    };
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.onclick = closeAllModals;
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('open');
  });
}

function openRequestModal(requestId) {
  const req = state.requests.find(r => r.requestId === requestId);
  if (!req) return;

  const modal = document.getElementById('modal-request-details');
  const body = document.getElementById('modal-request-body');
  if (!modal || !body) return;

  const matchedDonors = state.donors.map(donor => ({
    ...donor,
    score: BloodBridgeMatching.calculateScore(donor, req)
  }))
  .filter(d => d.score > 20)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  body.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="urgency-badge urgency-${req.urgency.toLowerCase()}">${req.urgency} REQUIREMENT</span>
        <span style="font-family: monospace; font-weight: 700;">${req.requestId}</span>
      </div>

      <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px;">
        <span class="blood-badge" style="width: 56px; height: 56px; font-size: 1.6rem;">${req.bloodGroup}</span>
        <div>
          <div style="font-size: 1.25rem; font-weight: 800;">${req.patientName}</div>
          <div style="font-size: 0.875rem; color: #64748B;">${req.unitsRequired} Unit(s) required</div>
        </div>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; font-size: 0.875rem; margin-bottom: 16px;">
        <div style="margin-bottom: 6px;">🏥 Hospital: <strong>${req.hospital}</strong></div>
        <div style="margin-bottom: 6px;">📍 Location: <strong>${req.hospitalLocation}</strong></div>
        <div style="margin-bottom: 6px;">⏱️ Required Time: <strong>${req.requiredTime} (${req.requiredDate})</strong></div>
        <div>📞 Emergency Desk: <strong>${req.contactNumber}</strong></div>
      </div>

      ${req.additionalInfo ? `
        <div style="font-size: 0.8125rem; color: #475569; background: #FFFBEB; border: 1px solid #FDE68A; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px;">
          <strong>Clinical Notes:</strong> ${req.additionalInfo}
        </div>
      ` : ''}

      <!-- Smart Matching Recommendations -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; margin-bottom: 16px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          ⚡ Recommended Donors (Smart Match)
        </h4>
        <p style="font-size: 0.75rem; color: #64748B; margin-bottom: 12px;">
          *Coordination recommendations based on biological compatibility, availability, and proximity. Medical eligibility confirmed by hospital blood bank.
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${matchedDonors.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
              <div>
                <strong style="font-size: 0.875rem;">${d.name}</strong> (${d.bloodGroup})
                <div style="font-size: 0.75rem; color: #64748B;">${d.approximateArea} • Approx. ${d.distanceKm} km</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.8125rem; font-weight: 800; color: #16A34A; background: #F0FDF4; padding: 2px 8px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                  ${d.score}% Match
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-primary" style="flex: 1; justify-content: center;" onclick="respondToEmergency('${req.requestId}', 'accept'); closeAllModals();">
          Volunteer / Respond to Request
        </button>
        <button class="btn-secondary" onclick="openReportModal('${req.requestId}')" style="color: #DC2626;">
          Report Request
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function openContactDonorModal(donorId) {
  const donor = state.donors.find(d => d.id === donorId);
  if (!donor) return;

  const modal = document.getElementById('modal-contact-donor');
  const body = document.getElementById('modal-contact-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div class="blood-badge" style="width: 60px; height: 60px; font-size: 1.75rem; margin: 0 auto 12px;">${donor.bloodGroup}</div>
      <h3 style="font-size: 1.35rem; font-weight: 800; color: #0F172A;">Coordinate with ${donor.name}</h3>
      <p style="font-size: 0.875rem; color: #64748B;">${donor.approximateArea}, ${donor.city}</p>
    </div>

    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px; font-size: 0.8125rem; color: #991B1B; margin-bottom: 20px; line-height: 1.45;">
      🛡️ <strong>Privacy Protection Notice:</strong>
      Personal phone numbers are kept confidential to prevent harassment. An automated dispatch alert is transmitted to this donor via ${donor.notificationMethod || 'SMS & In-App'}.
    </div>

    <form onsubmit="handleDonorDispatchSubmit(event, '${donor.id}')">
      <div class="form-field" style="margin-bottom: 14px;">
        <label>Your Emergency Request ID or Patient Name:</label>
        <input type="text" class="form-input" placeholder="e.g. BB-2026-00101 or Patient S. Kumar" required />
      </div>

      <div class="form-field" style="margin-bottom: 14px;">
        <label>Hospital Location for Cross-Matching:</label>
        <input type="text" class="form-input" placeholder="e.g. KMCH Coimbatore Blood Bank Desk" required />
      </div>

      <div class="form-field" style="margin-bottom: 20px;">
        <label>Urgent Message to Donor:</label>
        <textarea class="form-textarea" rows="3" placeholder="Explain the clinical urgency, time window, and reception contact."></textarea>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" class="btn-secondary" onclick="closeAllModals()">Cancel</button>
        <button type="submit" class="btn-primary">Send Dispatch Request</button>
      </div>
    </form>
  `;

  modal.classList.add('open');
}

function handleDonorDispatchSubmit(e, donorId) {
  e.preventDefault();
  closeAllModals();
  showToast('Coordination dispatch successfully sent to donor! You will be notified as soon as they acknowledge.', 'success');
}

function openReportModal(requestId = 'N/A') {
  const modal = document.getElementById('modal-report-request');
  const inputReqId = document.getElementById('report-request-id');
  if (inputReqId) inputReqId.value = requestId;
  if (modal) modal.classList.add('open');
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const requestId = document.getElementById('report-request-id').value;
  const reason = document.getElementById('report-reason').value;
  const details = document.getElementById('report-details').value.trim();

  if (!reason || !details) {
    showToast('Please provide reason and details.', 'error');
    return;
  }

  try {
    const res = await BloodBridgeAPI.submitReport({
      requestId,
      reason,
      details,
      reporterName: state.currentUser.name
    });

    if (res.success) {
      showToast('Report submitted for moderation review. Thank you for protecting the platform.', 'success');
      closeAllModals();
      await loadInitialData();
    }
  } catch (err) {
    showToast('Submission error: ' + err.message, 'error');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}
