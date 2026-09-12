/**
 * BloodBridge OpenStreetMap / Leaflet Integration
 * Displays partner hospitals and emergency blood banks with interactive markers.
 */

const BloodBridgeMap = (function() {
  let mapInstance = null;
  let markers = [];

  function initHospitalMap(hospitals, containerId = 'leaflet-map') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if Leaflet library is available
    if (typeof L === 'undefined') {
      container.innerHTML = `
        <div style="height:100%;min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#F8FAFC;padding:24px;text-align:center;border-radius:12px;">
          <div style="font-size:36px;margin-bottom:12px;">🗺️</div>
          <h4 style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:6px;">Regional Geographic Network</h4>
          <p style="font-size:13px;color:#64748B;max-width:320px;">${hospitals.length} partner hospitals mapped across Coimbatore, Chennai, and Bengaluru.</p>
        </div>
      `;
      return;
    }

    // Default center: Coimbatore medical cluster [11.025, 76.995]
    if (!mapInstance) {
      mapInstance = L.map(containerId).setView([11.025, 76.995], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);
    } else {
      // Clear existing markers
      markers.forEach(m => mapInstance.removeLayer(m));
      markers = [];
    }

    // Custom Hospital Pin Icon
    const hospitalIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background:#DC2626;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(220,38,38,0.4);border:2px solid white;font-weight:800;font-size:16px;">🏥</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });

    // Add markers for hospitals
    hospitals.forEach(hosp => {
      if (hosp.lat && hosp.lng) {
        const popupContent = `
          <div style="font-family:sans-serif;padding:4px;min-width:200px;">
            <h4 style="margin:0 0 4px 0;font-size:14px;color:#0F172A;font-weight:700;">${hosp.name}</h4>
            <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">${hosp.area}, ${hosp.city}</p>
            <div style="font-size:11px;background:#FEF2F2;color:#991B1B;padding:3px 6px;border-radius:4px;display:inline-block;font-weight:600;margin-bottom:6px;">
              ${hosp.emergencyAvailable}
            </div>
            <div style="font-size:12px;color:#0F172A;font-weight:600;margin-bottom:8px;">
              🩸 ${hosp.bloodBankAvailable}
            </div>
            <a href="tel:${hosp.contact}" style="display:inline-block;background:#DC2626;color:white;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;">
              Call Desk: ${hosp.contact}
            </a>
          </div>
        `;

        const marker = L.marker([hosp.lat, hosp.lng], { icon: hospitalIcon })
          .addTo(mapInstance)
          .bindPopup(popupContent);

        markers.push(marker);
      }
    });

    // Invalidate map size after tab render to prevent tile glitches
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 200);
  }

  function focusHospital(lat, lng, zoom = 14) {
    if (mapInstance && lat && lng) {
      mapInstance.setView([lat, lng], zoom);
    }
  }

  return {
    initHospitalMap,
    focusHospital
  };
})();
