// Form Handlers & Creation Flows Controller

function renderRequestBloodForm() {
  const form = document.getElementById('request-blood-form');
  if (!form) return;

  document.querySelectorAll('.urgency-radio-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.urgency-radio-card').forEach(c => {
        c.className = 'urgency-radio-card';
      });
      const urgency = card.getAttribute('data-urgency');
      card.classList.add('active-' + urgency.toLowerCase());
      document.getElementById('input-urgency').value = urgency;

      const highlightBanner = document.getElementById('critical-warning-banner');
      if (highlightBanner) {
        highlightBanner.style.display = urgency === 'Critical' ? 'block' : 'none';
      }
    };
  });

  form.onsubmit = async (e) => {
    e.preventDefault();

    const patientName = document.getElementById('req-patient-name').value.trim();
    const bloodGroup = document.getElementById('req-blood-group').value;
    const unitsRequired = document.getElementById('req-units').value;
    const hospital = document.getElementById('req-hospital').value.trim();
    const hospitalLocation = document.getElementById('req-hospital-loc').value.trim();
    const requiredDate = document.getElementById('req-date').value;
    const requiredTime = document.getElementById('req-time').value.trim();
    const urgency = document.getElementById('input-urgency').value;
    const contactNumber = document.getElementById('req-contact').value.trim();
    const additionalInfo = document.getElementById('req-info').value.trim();

    if (!patientName || !bloodGroup || !hospital || !contactNumber) {
      showToast('Please fill all mandatory fields.', 'error');
      return;
    }

    // Duplicate Request Detection
    const duplicate = state.requests.find(r => 
      r.patientName.toLowerCase() === patientName.toLowerCase() &&
      r.hospital.toLowerCase().includes(hospital.toLowerCase()) &&
      r.status !== 'Fulfilled' && r.status !== 'Cancelled'
    );

    if (duplicate && !confirm('Notice: An active blood request for "' + patientName + '" at ' + hospital + ' already exists (' + duplicate.requestId + '). Submit anyway?')) {
      return;
    }

    try {
      const res = await BloodBridgeAPI.createRequest({
        patientName,
        bloodGroup,
        unitsRequired,
        hospital,
        hospitalLocation,
        requiredDate,
        requiredTime,
        urgency,
        contactNumber,
        additionalInfo,
        requesterId: state.currentUser.id
      });

      if (res.success) {
        showToast('Blood request created successfully! Request ID: ' + res.requestId, 'success');
        await loadInitialData();
        showRequestSuccessView(res.request);
      }
    } catch (err) {
      showToast('Failed to create request: ' + err.message, 'error');
    }
  };
}

function showRequestSuccessView(req) {
  const container = document.getElementById('view-request-blood');
  if (!container) return;

  container.innerHTML = `
    <div class="container" style="max-width: 680px;">
      <div class="form-card" style="text-align: center; border-top: 6px solid #16A34A;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <h2 style="font-size: 1.85rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">
          Blood request created successfully
        </h2>
        <p style="color: #64748B; font-size: 1rem; margin-bottom: 24px;">
          Your request is now broadcasted to verified matching donors in this area.
        </p>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; text-align: left; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
            <span style="font-size: 0.875rem; color: #64748B;">Generated Tracking ID:</span>
            <strong style="font-family: monospace; font-size: 1.1rem; color: #DC2626;">${req.requestId}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.875rem; color: #64748B;">Patient Name:</span>
            <strong>${req.patientName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.875rem; color: #64748B;">Blood Group & Units:</span>
            <strong style="color: #DC2626;">${req.bloodGroup} (${req.unitsRequired} Units)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.875rem; color: #64748B;">Hospital:</span>
            <strong>${req.hospital}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 0.875rem; color: #64748B;">Current Status:</span>
            <span class="donor-status-pill status-avail">● Searching for donors</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn-primary" onclick="navigateTo('requester-dashboard')">
            Track in Requester Dashboard
          </button>
          <button class="btn-secondary" onclick="window.location.reload()">
            Create Another Request
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBecomeDonorForm() {
  const form = document.getElementById('become-donor-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('donor-name').value.trim();
    const age = parseInt(document.getElementById('donor-age').value);
    const bloodGroup = document.getElementById('donor-blood-group').value;
    const phone = document.getElementById('donor-phone').value.trim();
    const email = document.getElementById('donor-email').value.trim();
    const city = document.getElementById('donor-city').value;
    const approximateArea = document.getElementById('donor-area').value.trim();
    const lastDonationDate = document.getElementById('donor-last-date').value;
    const availability = document.getElementById('donor-avail-select').value === 'true';
    const notificationMethod = document.getElementById('donor-notif-method').value;
    const disclaimerConfirmed = document.getElementById('donor-disclaimer-check').checked;

    if (!disclaimerConfirmed) {
      showToast('Please confirm understanding that medical suitability must be confirmed by qualified medical professionals.', 'error');
      return;
    }

    if (age < 18 || age > 65) {
      showToast('Voluntary blood donors must be between 18 and 65 years of age.', 'error');
      return;
    }

    try {
      const res = await BloodBridgeAPI.registerDonor({
        name,
        age,
        bloodGroup,
        phone,
        email,
        city,
        approximateArea,
        lastDonationDate,
        availability,
        notificationMethod
      });

      if (res.success) {
        showToast('Donor profile created successfully! Welcome to the BloodBridge network.', 'success');
        await loadInitialData();
        
        state.currentUser = {
          id: res.donor.id,
          name: res.donor.name,
          email: email,
          role: 'donor',
          bloodGroup: res.donor.bloodGroup,
          city: res.donor.city,
          approximateArea: res.donor.approximateArea,
          availability: res.donor.availability,
          totalDonations: 0,
          verified: true
        };
        updatePersonaDisplay();
        navigateTo('donor-dashboard');
      }
    } catch (err) {
      showToast('Registration failed: ' + err.message, 'error');
    }
  };
}
