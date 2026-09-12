// Global State & Session Controller
const state = {
  currentView: 'home',
  currentUser: {
    id: 'usr_donor_1',
    name: 'Rahul Sharma',
    email: 'rahul@bloodbridge.org',
    role: 'donor',
    bloodGroup: 'O-',
    city: 'Coimbatore',
    approximateArea: 'RS Puram',
    availability: true,
    totalDonations: 8,
    lastDonationDate: '2026-05-10',
    verified: true
  },
  donors: [],
  requests: [],
  hospitals: [],
  notifications: [],
  reports: [],
  stats: {},
  insights: {}
};

const DEMO_PERSONAS = {
  donor: {
    id: 'usr_donor_1',
    name: 'Rahul Sharma',
    email: 'rahul@bloodbridge.org',
    role: 'donor',
    bloodGroup: 'O-',
    city: 'Coimbatore',
    approximateArea: 'RS Puram',
    availability: true,
    totalDonations: 8,
    lastDonationDate: '2026-05-10',
    verified: true
  },
  requester: {
    id: 'usr_req_1',
    name: 'Priya Nair',
    email: 'priya@bloodbridge.org',
    role: 'requester',
    bloodGroup: 'A+',
    city: 'Coimbatore',
    approximateArea: 'Peelamedu',
    verified: true
  },
  admin: {
    id: 'usr_admin_1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@bloodbridge.org',
    role: 'admin',
    department: 'Clinical Oversight & Verification',
    verified: true
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  initNavbarEvents();
  initModalEvents();
  await loadInitialData();
  
  const hash = window.location.hash.replace('#', '');
  if (hash) navigateTo(hash);
  else navigateTo('home');
});

async function loadInitialData() {
  try {
    const [donorsRes, requestsRes, hospitalsRes, notifsRes, statsRes, insightsRes, reportsRes] = await Promise.all([
      BloodBridgeAPI.getDonors(),
      BloodBridgeAPI.getRequests(),
      BloodBridgeAPI.getHospitals(),
      BloodBridgeAPI.getNotifications(),
      BloodBridgeAPI.getStats(),
      BloodBridgeAPI.getInsights(),
      BloodBridgeAPI.getReports()
    ]);

    state.donors = donorsRes.donors || [];
    state.requests = requestsRes.requests || [];
    state.hospitals = hospitalsRes.hospitals || [];
    state.notifications = notifsRes.notifications || [];
    state.stats = statsRes || {};
    state.insights = insightsRes || {};
    state.reports = reportsRes.reports || [];

    updateNotificationBadge();
    updatePersonaDisplay();
  } catch (err) {
    console.error('Data load error:', err);
    showToast('Operating with offline cache.', 'info');
  }
}

function navigateTo(viewName) {
  state.currentView = viewName;
  window.location.hash = viewName;

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  const targetView = document.getElementById('view-' + viewName);
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.view === viewName) link.classList.add('active');
    else link.classList.remove('active');
  });

  switch (viewName) {
    case 'home': renderHome(); break;
    case 'find-blood': renderFindBlood(); break;
    case 'request-blood': renderRequestBloodForm(); break;
    case 'become-donor': renderBecomeDonorForm(); break;
    case 'emergency': renderEmergencyRequests(); break;
    case 'hospitals': renderHospitals(); break;
    case 'availability': renderBloodAvailability(); break;
    case 'donor-dashboard': renderDonorDashboard(); break;
    case 'requester-dashboard': renderRequesterDashboard(); break;
    case 'admin-dashboard': renderAdminDashboard(); break;
    case 'notifications': renderNotifications(); break;
  }
}

function initNavbarEvents() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.getAttribute('data-nav'));
    });
  });

  const personaBadge = document.getElementById('persona-badge-trigger');
  const personaDropdown = document.getElementById('persona-dropdown');
  if (personaBadge && personaDropdown) {
    personaBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      personaDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => personaDropdown.classList.remove('open'));
  }

  document.querySelectorAll('.persona-item').forEach(item => {
    item.addEventListener('click', () => {
      const role = item.getAttribute('data-persona-role');
      switchPersona(role);
      personaDropdown.classList.remove('open');
    });
  });

  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    });
  }
}

function switchPersona(roleKey) {
  if (DEMO_PERSONAS[roleKey]) {
    state.currentUser = { ...DEMO_PERSONAS[roleKey] };
    updatePersonaDisplay();
    showToast('Switched to: ' + state.currentUser.name + ' (' + state.currentUser.role.toUpperCase() + ')', 'info');

    if (state.currentUser.role === 'donor') navigateTo('donor-dashboard');
    else if (state.currentUser.role === 'requester') navigateTo('requester-dashboard');
    else if (state.currentUser.role === 'admin') navigateTo('admin-dashboard');
  }
}

function updatePersonaDisplay() {
  const nameEl = document.getElementById('current-user-name');
  const roleEl = document.getElementById('current-user-role');
  const avatarEl = document.getElementById('current-user-avatar');
  if (nameEl) nameEl.textContent = state.currentUser.name;
  if (roleEl) roleEl.textContent = state.currentUser.role.toUpperCase();
  if (avatarEl) avatarEl.textContent = state.currentUser.name.charAt(0);

  document.querySelectorAll('.persona-item').forEach(item => {
    if (item.getAttribute('data-persona-role') === state.currentUser.role) item.classList.add('selected');
    else item.classList.remove('selected');
  });
}

function updateNotificationBadge() {
  const badge = document.getElementById('notif-badge-count');
  if (badge) {
    const unread = state.notifications.filter(n => !n.read).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}
