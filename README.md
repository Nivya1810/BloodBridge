# BloodBridge 🩸
> **Connecting donors. Supporting lives.**

👉 **Live Demo Website:** **[https://nivya1810.github.io/BloodBridge/](https://nivya1810.github.io/BloodBridge/)**

BloodBridge is a modern, responsive full-stack social-impact blood donation coordination platform. It bridges the critical logistical gap between emergency blood requesters, voluntary blood donors, and partner hospitals.

---

## ⚖️ Important Medical Disclaimer
**BloodBridge is strictly a logistics coordination and communication platform.**
It does **NOT** medically verify blood compatibility, screen donor blood samples, or verify transfusion suitability. Final blood matching, infectious disease screening, clinical donor eligibility, and transfusion decisions must be made and verified by licensed healthcare professionals, pathology laboratories, and blood banks.

---

## ✨ Features & Capabilities

1. **Smart Matching Algorithm**: Calculates weighted compatibility recommendations (0–100%) based on:
   - Biological ABO/Rh antigen compatibility matrix (Universal donor `O-`, universal recipient `AB+`)
   - Real-time donor availability status
   - Geographic distance & proximity
   - Clinical 90-day cooldown safety period
   - Clinical urgency weighting
2. **Interactive 6-Stage Request Tracking**:
   - `Request Created` ➔ `Searching for Donors` ➔ `Donor Found` ➔ `Donor Response Received` ➔ `Hospital Coordination` ➔ `Fulfilled`
3. **Live Emergency Requests Board**:
   - Critical pulse indicators, real-time countdown badges, and 1-click response modals.
4. **Partner Hospitals Directory & Leaflet Map**:
   - Interactive OpenStreetMap integration with hospital markers, 24/7 trauma emergency care indicators, and licensed blood storage center details.
5. **Blood Availability Matrix**:
   - Live community supply indicators for all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) with interactive Chart.js visualizations.
6. **1-Click Demo Evaluation Personas**:
   - Effortlessly switch between **Rahul Sharma** (*O- Universal Donor*), **Priya Nair** (*Requester*), and **Dr. Sarah Chen** (*Clinical Admin*) right from the navigation bar.
7. **Comprehensive Safety & Moderation**:
   - Duplicate request detection to prevent hospital clutter
   - Community reporting system (suspicious activity, commercial solicitation, fake info)
   - Privacy protection shielding exact residential addresses and direct phone numbers

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation & Launch

1. Open your terminal in the `server` directory:
   ```bash
   cd C:\Users\user\.gemini\antigravity\scratch\bloodbridge\server
   npm install
   ```

2. Start the Express API server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📁 Project Architecture

```
bloodbridge/
├── server/
│   ├── data/
│   │   ├── seed.json          # Pre-populated realistic demo data (22 donors, 12 requests, 7 hospitals)
│   │   └── db.json            # Persistent JSON database
│   ├── package.json           # Express, CORS dependencies
│   └── server.js              # REST API server & static file host
├── public/
│   ├── css/
│   │   └── styles.css         # Healthcare design system & responsive layout
│   ├── js/
│   │   ├── smart-match.js     # ABO/Rh clinical compatibility scoring engine
│   │   ├── api.js             # REST API client with offline fallback
│   │   ├── charts.js          # Chart.js visualizations & SVG fallbacks
│   │   ├── map.js             # OpenStreetMap / Leaflet map integration
│   │   ├── state.js           # Global state, router & persona management
│   │   ├── views-public.js    # Home, Find Blood, Emergency, Hospitals, Availability
│   │   ├── views-forms.js     # Request & Donor registration workflows
│   │   ├── views-dashboards.js# Donor, Requester & Admin dashboards
│   │   └── modals.js          # Modals, dispatch forms & toast notification system
│   ├── data/
│   │   └── seed.json          # Offline client-side seed copy
│   └── index.html             # Single-page application containing all 15 views
└── README.md
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status & resource counts |
| `POST` | `/api/auth/login` | Authenticate user or switch demo persona |
| `POST` | `/api/auth/register` | Register new user / donor account |
| `GET` | `/api/donors` | Retrieve donors (filterable by group, city, availability) |
| `POST` | `/api/donors` | Register a new donor profile |
| `PATCH` | `/api/donors/:id/availability` | Toggle donor availability (Available / Unavailable) |
| `GET` | `/api/requests` | Retrieve blood requests (filterable by urgency, status) |
| `POST` | `/api/requests` | Create new blood request (with duplicate detection) |
| `PATCH` | `/api/requests/:id/status` | Advance request status along the 6-stage lifecycle |
| `POST` | `/api/requests/:id/respond` | Donor accepts or declines request |
| `POST` | `/api/match` | Run Smart Matching recommendation algorithm |
| `GET` | `/api/hospitals` | List verified hospitals and blood storage centers |
| `GET` | `/api/stats` | Platform metrics (active donors, fulfilled, demand ratios) |
| `GET` | `/api/insights` | Demand prediction and emergency prioritization trends |
| `GET` | `/api/notifications` | In-app notification feed |
| `PATCH` | `/api/notifications/:id/read`| Mark notification as read |
| `GET` | `/api/reports` | List community safety reports (Admin) |
| `POST` | `/api/reports` | Submit report for fake or duplicate request |

---

## 🛡️ Privacy & Security Principles
- **Masked Contact Details**: Direct phone numbers are obscured (`+91 98402 XXXXX`) until mutual coordination dispatch is confirmed.
- **No Exact Geolocation**: Only approximate locality (e.g. *Peelamedu, Coimbatore*) is displayed to protect voluntary donors.
- **Zero Commercialization**: Voluntary donation only; commercial blood requests are flagged for account suspension.
