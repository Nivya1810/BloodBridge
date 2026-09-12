/**
 * BloodBridge API Service Layer
 * Connects to Node.js / Express backend with seamless localStorage fallback.
 */

const BloodBridgeAPI = (function() {
  const BASE_URL = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';

  async function request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(BASE_URL + endpoint, config);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Server returned status ' + response.status);
      }
      return await response.json();
    } catch (err) {
      console.warn('API request to ' + endpoint + ' failed, falling back to local handler:', err.message);
      return fallbackHandler(endpoint, options);
    }
  }

  // Fallback Local Storage Simulation Handler
  function getLocalData() {
    let raw = localStorage.getItem('bb_local_db');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch(e) {
      return null;
    }
  }

  function setLocalData(data) {
    localStorage.setItem('bb_local_db', JSON.stringify(data));
  }

  async function fallbackHandler(endpoint, options) {
    let db = getLocalData();
    if (!db) {
      // Fetch seed file directly if static file accessible
      try {
        const seedRes = await fetch('data/seed.json');
        db = await seedRes.json();
      } catch (e) {
        db = { users: [], donors: [], bloodRequests: [], hospitals: [], notifications: [], reports: [] };
      }
      setLocalData(db);
    }

    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};

    // Match routing
    if (endpoint.startsWith('/api/donors')) {
      if (method === 'GET') {
        return { count: db.donors.length, donors: db.donors };
      }
      if (method === 'POST') {
        const newD = { ...body, id: 'dn_' + Date.now(), verified: true };
        db.donors.push(newD);
        setLocalData(db);
        return { success: true, donor: newD };
      }
    }

    if (endpoint.startsWith('/api/requests')) {
      if (method === 'GET') {
        return { count: db.bloodRequests.length, requests: db.bloodRequests };
      }
      if (method === 'POST') {
        const count = db.bloodRequests.length + 101;
        const newR = {
          ...body,
          requestId: 'BB-2026-' + String(count).padStart(5, '0'),
          status: 'Searching for Donors',
          createdAt: new Date().toISOString(),
          responses: []
        };
        db.bloodRequests.unshift(newR);
        setLocalData(db);
        return { success: true, requestId: newR.requestId, request: newR };
      }
    }

    if (endpoint === '/api/hospitals') {
      return { count: db.hospitals.length, hospitals: db.hospitals };
    }

    if (endpoint === '/api/notifications') {
      return { count: db.notifications.length, notifications: db.notifications };
    }

    if (endpoint === '/api/stats') {
      return {
        totalDonors: db.donors.length,
        activeDonors: db.donors.filter(d => d.availability).length,
        activeRequests: db.bloodRequests.filter(r => r.status !== 'Fulfilled').length,
        fulfilledRequests: db.bloodRequests.filter(r => r.status === 'Fulfilled').length,
        partnerHospitals: db.hospitals.length
      };
    }

    return { success: true };
  }

  return {
    // Auth
    login: (credentials) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

    // Donors
    getDonors: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('/api/donors' + (qs ? '?' + qs : ''));
    },
    registerDonor: (donorData) => request('/api/donors', { method: 'POST', body: JSON.stringify(donorData) }),
    toggleDonorAvailability: (id, availability) => 
      request('/api/donors/' + id + '/availability', { method: 'PATCH', body: JSON.stringify({ availability }) }),

    // Requests
    getRequests: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('/api/requests' + (qs ? '?' + qs : ''));
    },
    createRequest: (reqData) => request('/api/requests', { method: 'POST', body: JSON.stringify(reqData) }),
    updateRequestStatus: (id, status, note) => 
      request('/api/requests/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status, note }) }),
    respondToRequest: (id, donorId, donorName, action) =>
      request('/api/requests/' + id + '/respond', { method: 'POST', body: JSON.stringify({ donorId, donorName, action }) }),

    // Smart Match
    getSmartMatches: (matchParams) => 
      request('/api/match', { method: 'POST', body: JSON.stringify(matchParams) }),

    // Hospitals
    getHospitals: () => request('/api/hospitals'),
    toggleHospitalVerification: (id) => request('/api/hospitals/' + id + '/verify', { method: 'PATCH' }),

    // Stats & Insights
    getStats: () => request('/api/stats'),
    getInsights: () => request('/api/insights'),

    // Notifications
    getNotifications: () => request('/api/notifications'),
    markNotificationRead: (id) => request('/api/notifications/' + id + '/read', { method: 'PATCH' }),
    markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),

    // Reports
    getReports: () => request('/api/reports'),
    submitReport: (reportData) => request('/api/reports', { method: 'POST', body: JSON.stringify(reportData) }),
    updateReportStatus: (id, status, actionTaken) =>
      request('/api/reports/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status, actionTaken }) })
  };
})();
