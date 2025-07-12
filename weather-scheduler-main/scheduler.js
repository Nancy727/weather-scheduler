// scheduler.js - About-style Scheduler (No Heap)

// --- CONFIG ---
const OPENWEATHER_API_KEY = 'YOUR_API_KEY_HERE'; // <-- Replace with your real key
const DEFAULT_COORDS = [51.505, -0.09];
const DEFAULT_ZOOM = 12;

// --- EVENTS STORAGE ---
let events = JSON.parse(localStorage.getItem('events') || '[]');
function saveEvents() {
  localStorage.setItem('events', JSON.stringify(events));
}

// --- LEAFLET MAP INIT ---
let map = L.map('map').setView(DEFAULT_COORDS, DEFAULT_ZOOM);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Weather overlays
const rainLayer = new L.OWM.rain({ appId: OPENWEATHER_API_KEY, opacity: 0.5 });
const cloudsLayer = new L.OWM.clouds({ appId: OPENWEATHER_API_KEY, opacity: 0.4 });
rainLayer.addTo(map);
cloudsLayer.addTo(map);

// --- HEATMAP LAYER (Crowd Density) ---
let heatLayer = null;
function updateHeatmap() {
  if (heatLayer) map.removeLayer(heatLayer);
  const crowdMap = new Map();
  events.forEach(event => {
    const count = crowdMap.get(event.geohash) || 0;
    crowdMap.set(event.geohash, count + 1);
  });
  const heatData = [...crowdMap.entries()].map(([geohash, count]) => {
    const [lat, lng] = ngeohash.decode(geohash);
    return [lat, lng, count];
  });
  if (heatData.length > 0) {
    heatLayer = L.heatLayer(heatData, { radius: 25, blur: 18, minOpacity: 0.3 }).addTo(map);
  }
}

// --- ROUTE MAP & WEATHER-AWARE ROUTING (Demo) ---
const routeMap = new Map();
function addRouteSegment(segmentId, coords) {
  getWeatherAlongPath(coords).then(weather => {
    routeMap.set(segmentId, { coords, weather });
    renderRoutes();
  });
}
async function getWeatherAlongPath(coords) {
  let rain = 0, clouds = 0;
  for (const [lat, lng] of coords) {
    const w = await fetchWeather(lat, lng);
    rain += w.rain;
    clouds += w.clouds;
  }
  return { rain: rain / coords.length, clouds: clouds / coords.length };
}
function renderRoutes() {
  if (window.routePolylines) window.routePolylines.forEach(l => map.removeLayer(l));
  window.routePolylines = [];
  let worst = null, maxRain = -1;
  for (const [id, seg] of routeMap.entries()) {
    const poly = L.polyline(seg.coords, {
      color: seg.weather.rain > 5 ? '#dc3545' : '#667eea',
      weight: 6,
      opacity: 0.7
    }).addTo(map);
    window.routePolylines.push(poly);
    if (seg.weather.rain > maxRain) {
      maxRain = seg.weather.rain;
      worst = { id, ...seg };
    }
  }
  if (worst) {
    L.polyline(worst.coords, {
      color: '#dc3545',
      weight: 10,
      opacity: 0.9,
      dashArray: '10,10'
    }).addTo(map);
  }
}

// --- EVENT FORM HANDLING ---
const form = document.getElementById('taskForm');
const taskNameSelect = document.getElementById('taskName');
const customTaskNameInput = document.getElementById('customTaskName');

taskNameSelect.addEventListener('change', () => {
  if (taskNameSelect.value === 'Other') {
    customTaskNameInput.style.display = '';
    customTaskNameInput.required = true;
  } else {
    customTaskNameInput.style.display = 'none';
    customTaskNameInput.required = false;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let name = taskNameSelect.value;
  if (name === 'Other') {
    name = customTaskNameInput.value.trim();
  }
  const location = document.getElementById('taskLocation').value.trim();
  const date = document.getElementById('taskDate').value;
  const time = document.getElementById('taskTime').value;
  const notes = document.getElementById('taskNotes').value.trim();
  if (!name || !location || !date || !time) return;

  // Geocode location (use OpenWeatherMap geocoding API)
  let lat = DEFAULT_COORDS[0], lng = DEFAULT_COORDS[1];
  try {
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`);
    const geoData = await geoRes.json();
    if (geoData[0]) {
      lat = geoData[0].lat;
      lng = geoData[0].lon;
    }
  } catch {}

  const geohash = ngeohash.encode(lat, lng, 6);
  const weather = await fetchWeather(lat, lng);
  const event = { name, location, date, time, notes, lat, lng, geohash, weather };
  events.push(event);
  saveEvents();
  renderEvents();
  addEventMarkers();
  updateHeatmap();
  form.reset();
  customTaskNameInput.style.display = 'none';
  customTaskNameInput.required = false;
});

// --- MAP CLICK HANDLING ---
map.on('click', async (e) => {
  const lat = e.latlng.lat, lng = e.latlng.lng;
  const geohash = ngeohash.encode(lat, lng, 6);
  const weather = await fetchWeather(lat, lng);
  const name = prompt('Event name for this location?');
  if (!name) return;
  const event = { name, location: `(${lat.toFixed(3)}, ${lng.toFixed(3)})`, date: '', time: '', notes: '', lat, lng, geohash, weather };
  events.push(event);
  saveEvents();
  renderEvents();
  addEventMarkers();
  updateHeatmap();
});

// --- WEATHER FETCH ---
async function fetchWeather(lat, lng) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`);
    const data = await res.json();
    return {
      rain: data.rain?.['1h'] || 0,
      clouds: data.clouds?.all || 0,
      temp: data.main?.temp || 0
    };
  } catch {
    return { rain: 0, clouds: 0, temp: 0 };
  }
}

// --- WEATHER LEGEND (STATIC) ---
function renderWeatherLegend() {
  const legendDiv = document.getElementById('weatherLegendStatic');
  if (legendDiv) {
    legendDiv.innerHTML = `
      <div style='display:flex;gap:1em;align-items:center;font-size:1.1em;'>
        <span style='display:inline-block;width:18px;height:18px;background:#667eea;border-radius:4px;'></span> Rain
        <span style='display:inline-block;width:18px;height:18px;background:#b4b4e6;border-radius:4px;'></span> Clouds
        <span style='display:inline-block;width:18px;height:18px;background:#ffb347;border-radius:4px;'></span> Events
        <span style='display:inline-block;width:18px;height:18px;background:#dc3545;border-radius:4px;'></span> Worst Route
      </div>`;
  }
}

// --- EVENT LIST RENDERING (with delete/edit) ---
function renderEvents() {
  const eventList = document.getElementById('eventList');
  if (!eventList) return;
  eventList.innerHTML = '';
  events.forEach((event, idx) => {
    const div = document.createElement('div');
    div.className = 'heap-event-card';
    div.innerHTML = `
      <div class=\"event-title\">${event.name} <span style=\"font-size:0.9em;color:#888;\">${event.location}</span></div>
      <div class=\"event-meta\">
        <span>Rain: <b>${event.weather.rain}mm</b></span>
        <span>Clouds: <b>${event.weather.clouds}%</b></span>
        <span>Temp: <b>${event.weather.temp}°C</b></span>
        ${event.date ? `<span>Date: <b>${event.date}</b></span>` : ''}
        ${event.time ? `<span>Time: <b>${event.time}</b></span>` : ''}
      </div>
      ${event.notes ? `<div class=\"event-notes\">${event.notes}</div>` : ''}
      <div style=\"margin-top:0.7em;display:flex;gap:0.7em;\">
        <button class=\"btn-small btn-edit\" data-idx=\"${idx}\">Edit</button>
        <button class=\"btn-small btn-delete\" data-idx=\"${idx}\">Delete</button>
      </div>
    `;
    eventList.appendChild(div);
  });
  // Attach event listeners for edit/delete
  eventList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.getAttribute('data-idx');
      events.splice(idx, 1);
      saveEvents();
      renderEvents();
      addEventMarkers();
      updateHeatmap();
    };
  });
  eventList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.getAttribute('data-idx');
      const event = events[idx];
      const name = prompt('Edit event name:', event.name) || event.name;
      const notes = prompt('Edit notes:', event.notes) || event.notes;
      events[idx] = { ...event, name, notes };
      saveEvents();
      renderEvents();
      addEventMarkers();
      updateHeatmap();
    };
  });
}

// --- EVENT MARKERS ON MAP (with clustering) ---
let eventMarkers = [];
function addEventMarkers() {
  eventMarkers.forEach(m => map.removeLayer(m));
  eventMarkers = [];
  // Cluster: group by geohash, show count
  const clusterMap = new Map();
  events.forEach(ev => {
    const key = ev.geohash;
    if (!clusterMap.has(key)) clusterMap.set(key, []);
    clusterMap.get(key).push(ev);
  });
  for (const [geohash, evs] of clusterMap.entries()) {
    const [lat, lng] = ngeohash.decode(geohash);
    const html = `<div style='background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 14px;border-radius:14px;font-weight:600;font-size:1.1em;box-shadow:0 2px 8px #667eea44;'>⚡ ${evs.length > 1 ? evs.length + ' events' : evs[0].name}</div>`;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html,
        className: 'heap-marker',
        iconSize: [90, 32],
        iconAnchor: [45, 16]
      })
    }).addTo(map);
    eventMarkers.push(marker);
  }
}

// --- MAP RESPONSIVENESS ---
window.addEventListener('resize', () => {
  setTimeout(() => map.invalidateSize(), 200);
});

// --- DEMO: Add a sample route (for weather-aware routing) ---
addRouteSegment('segment1', [
  [51.505, -0.09],
  [51.51, -0.1],
  [51.515, -0.12]
]);
addRouteSegment('segment2', [
  [51.505, -0.09],
  [51.50, -0.08],
  [51.495, -0.07]
]);

// --- INIT ---
renderEvents();
addEventMarkers();
updateHeatmap();
renderWeatherLegend(); 