const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Persistent JSON Database path
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');

// Initialize database from seed if db.json is missing
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    if (fs.existsSync(SEED_FILE)) {
      const seedContent = fs.readFileSync(SEED_FILE, 'utf8');
      fs.writeFileSync(DB_FILE, seedContent, 'utf8');
      console.log('Initialized db.json from seed.json');
    } else {
      const emptyDb = { users: [], donors: [], bloodRequests: [], hospitals: [], notifications: [], reports: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), 'utf8');
    }
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// In-memory reference with automatic synchronization
let db = loadDb();

// ABO / Rh Compatibility Matrix (RBC Red Blood Cells)
// Recipient Key -> Array of compatible Donor blood groups
const COMPATIBILITY_TABLE = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'] // Universal donor
};

// Check if donor blood group can donate to recipient blood group
function isBloodCompatible(donorGroup, recipientGroup) {
  const allowed = COMPATIBILITY_TABLE[recipientGroup] || [];
  return allowed.includes(donorGroup);
}

// Smart Matching Algorithm
// Calculates matching score (0 to 100%) for coordination recommendations
function calculateMatchScore(donor, request) {
  // 1. Blood group compatibility check (Essential gatekeeper)
  const compatible = isBloodCompatible(donor.bloodGroup, request.bloodGroup);
  if (!compatible) return 0;

  let score = 40; // Base points for biological compatibility

  // Exact match bonus (identical group preferred for standard protocol)
  if (donor.bloodGroup === request.bloodGroup) {
    score += 10;
  }

  // 2. Donor Availability (up to 20 pts)
  if (donor.availability) {
    score += 20;
  } else {
    // If not actively marked available, reduce score
    score -= 15;
  }

  // 3. Proximity / Distance factor (up to 15 pts)
  const distance = donor.distanceKm || 5;
  if (distance <= 3) score += 15;
  else if (distance <= 7) score += 10;
  else if (distance <= 15) score += 5;
  else score += 2;

  // 4. Cooldown Safety (>90 days since last donation) (up to 10 pts)
  if (donor.lastDonationDate) {
    const lastDate = new Date(donor.lastDonationDate);
    const today = new Date();
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 90) {
      score += 10;
    } else if (diffDays >= 60) {
      score += 4;
    } else {
      score -= 20; // Too soon to donate whole blood
    }
  } else {
    score += 10; // First-time donor or no recent record
  }

  // 5. Urgency & Verification multiplier (up to 5 pts)
  if (donor.verified) score += 3;
  if (request.urgency === 'Critical') score += 2;

  return Math.min(Math.max(score, 0), 100);
}

// ---------------------- API ROUTES ---------------------- //

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BloodBridge API Server',
    timestamp: new Date().toISOString(),
    donorsCount: db.donors.length,
    requestsCount: db.bloodRequests.length,
    hospitalsCount: db.hospitals.length
  });
});

// Authentication Routes (supports standard and demo logins)
app.post('/api/auth/login', (req, res) => {
  const { email, role } = req.body;
  let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  
  if (!user) {
    // If demo login or new user, match by role or return a structured user
    if (role === 'admin') {
      user = db.users.find(u => u.role === 'admin');
    } else if (role === 'donor') {
      user = db.users.find(u => u.role === 'donor');
    } else if (role === 'requester') {
      user = db.users.find(u => u.role === 'requester');
    } else {
      user = {
        id: 'usr_' + Date.now(),
        name: email ? email.split('@')[0] : 'Guest User',
        email: email || 'user@bloodbridge.org',
        role: role || 'requester',
        verified: true
      };
      db.users.push(user);
      saveDb(db);
    }
  }

  res.json({ success: true, user, token: 'demo-token-' + user.id });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, bloodGroup, city, approximateArea, phone } = req.body;
  
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name,
    email,
    role,
    bloodGroup: bloodGroup || 'O+',
    city: city || 'Coimbatore',
    approximateArea: approximateArea || 'Central',
    phone: phone || '+91 98000 00000',
    verified: true,
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);

  // If registering as donor, also register in donors table
  if (role === 'donor') {
    const newDonor = {
      id: 'dn_' + Date.now(),
      userId: newUser.id,
      name,
      bloodGroup: bloodGroup || 'O+',
      age: req.body.age || 25,
      city: city || 'Coimbatore',
      approximateArea: approximateArea || 'Central',
      distanceKm: 3.5,
      lat: 11.0168,
      lng: 76.9558,
      availability: req.body.availability !== undefined ? req.body.availability : true,
      lastDonationDate: req.body.lastDonationDate || null,
      verified: true,
      totalDonations: 0,
      phoneMasked: phone ? phone.slice(0, 8) + 'XXXXX' : '+91 98000 XXXXX',
      notificationMethod: req.body.notificationMethod || 'In-App Only',
      notes: 'Newly registered community donor'
    };
    db.donors.push(newDonor);
  }

  saveDb(db);
  res.json({ success: true, user: newUser, token: 'demo-token-' + newUser.id });
});

// DONORS
app.get('/api/donors', (req, res) => {
  let list = [...db.donors];
  const { bloodGroup, city, available, sort } = req.query;

  if (bloodGroup && bloodGroup !== 'all') {
    list = list.filter(d => d.bloodGroup.toUpperCase() === bloodGroup.toUpperCase());
  }

  if (city && city !== 'all') {
    list = list.filter(d => d.city.toLowerCase() === city.toLowerCase());
  }

  if (available !== undefined && available !== 'all') {
    const isAvail = available === 'true' || available === true;
    list = list.filter(d => d.availability === isAvail);
  }

  // Sorting
  if (sort === 'nearest') {
    list.sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99));
  } else if (sort === 'available') {
    list.sort((a, b) => (b.availability ? 1 : 0) - (a.availability ? 1 : 0));
  } else if (sort === 'donations') {
    list.sort((a, b) => (b.totalDonations || 0) - (a.totalDonations || 0));
  }

  res.json({ count: list.length, donors: list });
});

app.post('/api/donors', (req, res) => {
  const donorData = req.body;
  if (!donorData.name || !donorData.bloodGroup) {
    return res.status(400).json({ error: 'Name and Blood Group are required' });
  }

  const newDonor = {
    id: 'dn_' + Date.now(),
    name: donorData.name,
    bloodGroup: donorData.bloodGroup,
    age: donorData.age || 25,
    city: donorData.city || 'Coimbatore',
    approximateArea: donorData.approximateArea || 'City Center',
    distanceKm: donorData.distanceKm || 3.0,
    availability: donorData.availability !== undefined ? donorData.availability : true,
    lastDonationDate: donorData.lastDonationDate || null,
    verified: true,
    totalDonations: donorData.totalDonations || 0,
    phoneMasked: donorData.phone ? donorData.phone.slice(0, 8) + 'XXXXX' : '+91 98000 XXXXX',
    notificationMethod: donorData.notificationMethod || 'In-App Only',
    notes: donorData.notes || 'Volunteer registered via BloodBridge portal',
    createdAt: new Date().toISOString()
  };

  db.donors.push(newDonor);
  saveDb(db);
  res.json({ success: true, donor: newDonor });
});

app.patch('/api/donors/:id/availability', (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;
  const donor = db.donors.find(d => d.id === id || d.userId === id);

  if (!donor) {
    return res.status(404).json({ error: 'Donor not found' });
  }

  donor.availability = Boolean(availability);
  saveDb(db);
  res.json({ success: true, donor });
});

// BLOOD REQUESTS
app.get('/api/requests', (req, res) => {
  let list = [...db.bloodRequests];
  const { bloodGroup, urgency, status, city } = req.query;

  if (bloodGroup && bloodGroup !== 'all') {
    list = list.filter(r => r.bloodGroup.toUpperCase() === bloodGroup.toUpperCase());
  }
  if (urgency && urgency !== 'all') {
    list = list.filter(r => r.urgency.toLowerCase() === urgency.toLowerCase());
  }
  if (status && status !== 'all') {
    list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
  }
  if (city && city !== 'all') {
    list = list.filter(r => (r.city || '').toLowerCase() === city.toLowerCase());
  }

  // Sort: Critical first, then Urgent, then Normal
  const urgencyWeight = { 'Critical': 3, 'Urgent': 2, 'Normal': 1 };
  list.sort((a, b) => (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0));

  res.json({ count: list.length, requests: list });
});

app.get('/api/requests/:id', (req, res) => {
  const reqItem = db.bloodRequests.find(r => r.requestId === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Request not found' });
  res.json({ request: reqItem });
});

// Create new blood request with Duplicate Request Detection
app.post('/api/requests', (req, res) => {
  const {
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
    city,
    requesterId
  } = req.body;

  if (!patientName || !bloodGroup || !hospital || !contactNumber) {
    return res.status(400).json({ error: 'Please fill in all mandatory request fields.' });
  }

  // Duplicate Request Detection:
  // Check if a request for the same patient and hospital was created recently
  const isDuplicate = db.bloodRequests.some(r =>
    r.patientName.toLowerCase().trim() === patientName.toLowerCase().trim() &&
    r.hospital.toLowerCase().trim() === hospital.toLowerCase().trim() &&
    r.status !== 'Fulfilled' &&
    r.status !== 'Cancelled'
  );

  if (isDuplicate && !req.body.forceSubmit) {
    return res.status(409).json({
      error: 'DUPLICATE_WARNING',
      message: 'A live request for this patient at the same hospital already exists.',
      details: 'To prevent duplicate coordination and hospital confusion, please verify before submitting again.'
    });
  }

  // Generate Unique ID: BB-2026-XXXXX
  const currentCount = db.bloodRequests.length + 101;
  const requestId = 'BB-2026-' + String(currentCount).padStart(5, '0');

  const newRequest = {
    requestId,
    requesterId: requesterId || 'usr_req_1',
    patientName,
    bloodGroup,
    unitsRequired: parseInt(unitsRequired) || 1,
    hospital,
    hospitalLocation: hospitalLocation || 'Main Hospital Campus',
    city: city || 'Coimbatore',
    distanceKm: 3.8,
    urgency: urgency || 'Normal',
    requiredDate: requiredDate || new Date().toISOString().split('T')[0],
    requiredTime: requiredTime || 'As soon as possible',
    timeRemaining: urgency === 'Critical' ? 'Within 2 hours' : 'Within 24 hours',
    status: 'Searching for Donors',
    contactNumber,
    additionalInfo: additionalInfo || 'Urgent requirement verified with hospital desk.',
    responses: [],
    createdAt: new Date().toISOString()
  };

  db.bloodRequests.unshift(newRequest);

  // Trigger automated notification for matching donors
  const notif = {
    id: 'notif_' + Date.now(),
    type: urgency === 'Critical' ? 'critical' : 'match',
    icon: urgency === 'Critical' ? '🔴' : '🩸',
    title: (urgency === 'Critical' ? 'CRITICAL: ' : 'New: ') + bloodGroup + ' Blood Request Created',
    message: requestId + ' at ' + hospital + ' requires ' + unitsRequired + ' unit(s).',
    timestamp: 'Just now',
    read: false,
    requestId: requestId
  };
  db.notifications.unshift(notif);

  saveDb(db);
  res.status(201).json({
    success: true,
    message: 'Blood request created successfully.',
    requestId,
    status: 'Searching for Donors',
    request: newRequest
  });
});

// Update Request Status (e.g. Searching -> Donor Found -> Donor Response Received -> Hospital Coordination -> Fulfilled -> Cancelled)
app.patch('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const request = db.bloodRequests.find(r => r.requestId === id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  request.status = status;
  if (status === 'Fulfilled') {
    request.timeRemaining = 'Fulfilled';
  } else if (status === 'Cancelled') {
    request.timeRemaining = 'Cancelled';
  }

  // Push notification about status update
  db.notifications.unshift({
    id: 'notif_' + Date.now(),
    type: 'update',
    icon: '📢',
    title: 'Blood Request ' + id + ' Updated',
    message: 'Status updated to: ' + status + (note ? ' (' + note + ')' : ''),
    timestamp: 'Just now',
    read: false,
    requestId: id
  });

  saveDb(db);
  res.json({ success: true, request });
});

// Donor responds (Accept or Decline)
app.post('/api/requests/:id/respond', (req, res) => {
  const { id } = req.params;
  const { donorId, donorName, action } = req.body;
  const request = db.bloodRequests.find(r => r.requestId === id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (action === 'accept') {
    request.status = 'Donor Response Received';
    request.responses = request.responses || [];
    request.responses.push({
      donorId: donorId || 'dn_01',
      donorName: donorName || 'Rahul Sharma',
      responseTime: new Date().toISOString(),
      status: 'Accepted'
    });

    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      type: 'response',
      icon: '✅',
      title: 'Donor Accepted Request ' + id,
      message: (donorName || 'A donor') + ' has accepted your request. Please prepare hospital coordination.',
      timestamp: 'Just now',
      read: false,
      requestId: id
    });
  }

  saveDb(db);
  res.json({
    success: true,
    message: action === 'accept' ? 'Thank you! Your response has been sent to the requester.' : 'Request declined.',
    request
  });
});

// SMART MATCHING RECOMMENDATION ENGINE
app.post('/api/match', (req, res) => {
  const { bloodGroup, urgency, city, maxDistance } = req.body;

  if (!bloodGroup) {
    return res.status(400).json({ error: 'Blood group is required to find matching donors' });
  }

  const dummyRequest = {
    bloodGroup,
    urgency: urgency || 'Normal',
    city: city || 'Coimbatore'
  };

  const scoredDonors = db.donors.map(donor => {
    const score = calculateMatchScore(donor, dummyRequest);
    return {
      ...donor,
      matchScore: score,
      isCompatible: isBloodCompatible(donor.bloodGroup, bloodGroup)
    };
  })
  .filter(d => d.isCompatible && d.matchScore > 20)
  .sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    recommendationDisclaimer: 'Recommendations are for coordination purposes only and do not replace professional medical assessment or laboratory cross-matching.',
    bloodGroupRequested: bloodGroup,
    compatibleGroups: COMPATIBILITY_TABLE[bloodGroup] || [],
    count: scoredDonors.length,
    recommendations: scoredDonors
  });
});

// HOSPITALS
app.get('/api/hospitals', (req, res) => {
  res.json({ count: db.hospitals.length, hospitals: db.hospitals });
});

app.patch('/api/hospitals/:id/verify', (req, res) => {
  const hosp = db.hospitals.find(h => h.id === req.params.id);
  if (!hosp) return res.status(404).json({ error: 'Hospital not found' });
  hosp.verified = !hosp.verified;
  saveDb(db);
  res.json({ success: true, hospital: hosp });
});

// STATS & INSIGHTS
app.get('/api/stats', (req, res) => {
  const totalDonors = db.donors.length;
  const activeDonors = db.donors.filter(d => d.availability).length;
  const activeRequests = db.bloodRequests.filter(r => r.status !== 'Fulfilled' && r.status !== 'Cancelled').length;
  const criticalRequests = db.bloodRequests.filter(r => r.urgency === 'Critical' && r.status !== 'Fulfilled').length;
  const fulfilledRequests = db.bloodRequests.filter(r => r.status === 'Fulfilled').length;
  const partnerHospitals = db.hospitals.length;
  const suspiciousReports = db.reports.filter(r => r.status !== 'Resolved').length;

  // Requests by blood group
  const byBloodGroup = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 };
  const availabilityByGroup = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 };

  db.bloodRequests.forEach(r => {
    if (byBloodGroup[r.bloodGroup] !== undefined) byBloodGroup[r.bloodGroup]++;
  });

  db.donors.forEach(d => {
    if (d.availability && availabilityByGroup[d.bloodGroup] !== undefined) {
      availabilityByGroup[d.bloodGroup]++;
    }
  });

  res.json({
    totalDonors,
    activeDonors,
    activeRequests,
    criticalRequests,
    fulfilledRequests,
    partnerHospitals,
    suspiciousReports,
    byBloodGroup,
    availabilityByGroup
  });
});

app.get('/api/insights', (req, res) => {
  res.json({
    disclaimer: 'Recommendations are for coordination purposes only and do not replace professional medical assessment.',
    demandPrediction: [
      { bloodGroup: 'O-', trend: 'Critically High (+42% requests in past 7 days)', alertLevel: 'high', region: 'Coimbatore & Chennai' },
      { bloodGroup: 'B+', trend: 'Moderate demand increase (+18%)', alertLevel: 'medium', region: 'Bengaluru' },
      { bloodGroup: 'AB-', trend: 'Ultra-rare reserve standby advised', alertLevel: 'high', region: 'All zones' }
    ],
    emergencyPrioritization: [
      { requestId: 'BB-2026-00101', priorityScore: 98, reason: 'Critical + O- + Under 2h window' },
      { requestId: 'BB-2026-00105', priorityScore: 94, reason: 'Critical + AB- + Trauma surgical requirement' },
      { requestId: 'BB-2026-00103', priorityScore: 91, reason: 'Critical + Pediatric case + B-' }
    ]
  });
});

// NOTIFICATIONS
app.get('/api/notifications', (req, res) => {
  res.json({ count: db.notifications.length, notifications: db.notifications });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDb(db);
  }
  res.json({ success: true, notification: notif });
});

app.post('/api/notifications/read-all', (req, res) => {
  db.notifications.forEach(n => n.read = true);
  saveDb(db);
  res.json({ success: true });
});

// REPORTS & SAFETY
app.get('/api/reports', (req, res) => {
  res.json({ count: db.reports.length, reports: db.reports });
});

app.post('/api/reports', (req, res) => {
  const { requestId, reason, details, reporterName } = req.body;
  if (!reason || !details) {
    return res.status(400).json({ error: 'Reason and details are required' });
  }

  const newReport = {
    id: 'rep_' + Date.now(),
    requestId: requestId || 'N/A',
    reporterName: reporterName || 'Anonymous User',
    reason,
    details,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    actionTaken: 'Flagged for moderation review'
  };

  db.reports.unshift(newReport);
  saveDb(db);
  res.json({ success: true, message: 'Report submitted successfully. Our safety team will review it.', report: newReport });
});

app.patch('/api/reports/:id/status', (req, res) => {
  const report = db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.status = req.body.status || 'Reviewed';
  if (req.body.actionTaken) report.actionTaken = req.body.actionTaken;
  saveDb(db);
  res.json({ success: true, report });
});

// Start Express Server
app.listen(PORT, () => {
  console.log('BloodBridge Server listening on http://localhost:' + PORT);
});
