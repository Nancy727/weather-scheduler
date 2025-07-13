import config from './config.js';
import { WeatherAPI } from './script.js';

const weatherAPI = new WeatherAPI();

// Location permission and weather loading
async function requestLocationAndLoadWeather() {
  try {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using default city');
      await loadDashboardWeather();
      return;
    }

    // Request location permission
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });

    const { latitude, longitude } = position.coords;
    console.log('Location obtained:', { latitude, longitude });

    // Get weather for user's location
    const weather = await weatherAPI.getCurrentWeatherByCoords(latitude, longitude);
    const forecast = await weatherAPI.getForecastByCoords(latitude, longitude);
    
    // Update current weather
    document.getElementById('currentCity').textContent = weather.name;
    document.getElementById('currentTemp').textContent = Math.round(weather.main.temp);
    document.getElementById('weatherDesc').textContent = weather.weather[0].description;
    document.getElementById('humidity').textContent = weather.main.humidity;
    document.getElementById('windSpeed').textContent = Math.round(weather.wind.speed * 3.6); // km/h
    document.getElementById('visibility').textContent = (weather.visibility / 1000).toFixed(1);
    
    // Weather icon
    const weatherIcon = document.getElementById('weatherIcon');
    weatherIcon.className = weatherAPI.getWeatherIcon(weather.weather[0].icon);
    
    // Sunrise/Sunset
    if (weather.sys && weather.sys.sunrise && weather.sys.sunset) {
      const sunrise = new Date(weather.sys.sunrise * 1000);
      const sunset = new Date(weather.sys.sunset * 1000);
      const options = { hour: '2-digit', minute: '2-digit', hour12: true };
      const sunriseTime = sunrise.toLocaleTimeString([], options);
      const sunsetTime = sunset.toLocaleTimeString([], options);
      document.getElementById('sunriseTime').textContent = sunriseTime;
      document.getElementById('sunsetTime').textContent = sunsetTime;
      // Update sun position based on current time relative to sunrise/sunset
      updateSunPosition(sunrise, sunset);
    }
    
    // Update forecast
    updateDashboardForecast(forecast);
    
    // Store location in sessionStorage for other pages
    sessionStorage.setItem('userLatitude', latitude);
    sessionStorage.setItem('userLongitude', longitude);
    sessionStorage.setItem('userCity', weather.name);
    
    // Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#22bb33;"></i> Weather data for ${weather.name}`;
    }
    
  } catch (error) {
    console.error('Location permission denied or error:', error);
    // Fallback to default city
    await loadDashboardWeather();
    
    // Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.innerHTML = `<i class="fas fa-info-circle" style="color:#ffc107;"></i> Using default location (${config.DEFAULT_CITY})`;
    }
  }
}

async function loadDashboardWeather() {
  try {
    const city = config.DEFAULT_CITY;
    const weather = await weatherAPI.getCurrentWeather(city);
    const forecast = await weatherAPI.getForecast(city);
    // Update current weather
    document.getElementById('currentCity').textContent = weather.name;
    document.getElementById('currentTemp').textContent = Math.round(weather.main.temp);
    document.getElementById('weatherDesc').textContent = weather.weather[0].description;
    document.getElementById('humidity').textContent = weather.main.humidity;
    document.getElementById('windSpeed').textContent = Math.round(weather.wind.speed * 3.6); // km/h
    document.getElementById('visibility').textContent = (weather.visibility / 1000).toFixed(1);
    // Weather icon
    const weatherIcon = document.getElementById('weatherIcon');
    weatherIcon.className = weatherAPI.getWeatherIcon(weather.weather[0].icon);
    // Sunrise/Sunset
    if (weather.sys && weather.sys.sunrise && weather.sys.sunset) {
      const sunrise = new Date(weather.sys.sunrise * 1000);
      const sunset = new Date(weather.sys.sunset * 1000);
      const options = { hour: '2-digit', minute: '2-digit', hour12: true };
      const sunriseTime = sunrise.toLocaleTimeString([], options);
      const sunsetTime = sunset.toLocaleTimeString([], options);
      document.getElementById('sunriseTime').textContent = sunriseTime;
      document.getElementById('sunsetTime').textContent = sunsetTime;
      // Update sun position based on current time relative to sunrise/sunset
      updateSunPosition(sunrise, sunset);
    }
    // Update forecast
    updateDashboardForecast(forecast);
  } catch (error) {
    console.error('Failed to load dashboard weather:', error);
  }
}

function updateDashboardForecast(forecast) {
  const forecastGrid = document.getElementById('forecastGrid');
  if (!forecastGrid) return;
  // Group forecast by day
  const dailyData = {};
  forecast.list.forEach(item => {
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyData[date]) {
      dailyData[date] = {
        date: new Date(item.dt * 1000),
        temp: 0,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        count: 0
      };
    }
    dailyData[date].temp += item.main.temp;
    dailyData[date].count++;
  });
  const dailyForecast = Object.values(dailyData).map(day => ({
    ...day,
    temp: day.temp / day.count
  }));
  forecastGrid.innerHTML = dailyForecast.map(day => `
    <div class="forecast-card">
      <div class="forecast-date">${day.date.toLocaleDateString()}</div>
      <div class="forecast-temp">${Math.round(day.temp)}°C</div>
      <div class="forecast-desc">${day.description}</div>
      <div class="forecast-icon"><i class="${weatherAPI.getWeatherIcon(day.icon)}"></i></div>
    </div>
  `).join('');
}

function updateSunPosition(sunrise, sunset) {
  const now = new Date();
  const sunriseTime = sunrise.getTime();
  const sunsetTime = sunset.getTime();
  const currentTime = now.getTime();
  
  // Calculate sun position based on current time relative to sunrise/sunset
  let sunProgress = 0.5; // Default to noon position
  
  if (currentTime < sunriseTime) {
    // Before sunrise - sun is below horizon
    sunProgress = 0;
  } else if (currentTime > sunsetTime) {
    // After sunset - sun is below horizon
    sunProgress = 1;
  } else {
    // Between sunrise and sunset - calculate position
    const dayLength = sunsetTime - sunriseTime;
    const timeSinceSunrise = currentTime - sunriseTime;
    sunProgress = timeSinceSunrise / dayLength;
  }
  
  // Convert progress to hour (0-24 scale)
  const hour = 6 + (sunProgress * 12); // 6 AM to 6 PM
  moveSunToHour(hour, true);
}

function initWorldMap() {
  const mapEl = document.getElementById('worldMap');
  if (!mapEl || typeof L === 'undefined') return;
  
  // Initialize map with default view
  const map = L.map('worldMap').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Check if we have user location from sessionStorage
  const userLat = sessionStorage.getItem('userLatitude');
  const userLng = sessionStorage.getItem('userLongitude');
  
  if (userLat && userLng) {
    // Zoom to user's location
    const userLatNum = parseFloat(userLat);
    const userLngNum = parseFloat(userLng);
    
    // Add a marker for user's location
    const userMarker = L.marker([userLatNum, userLngNum]).addTo(map);
    userMarker.bindPopup('<b>Your Location</b><br>Current weather data source').openPopup();
    
    // Zoom to user's location with animation
    map.setView([userLatNum, userLngNum], 8, {
      animate: true,
      duration: 1.5
    });
    
    console.log('Map zoomed to user location:', userLatNum, userLngNum);
  } else {
    // If no location available, try to get it now
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Add a marker for user's location
          const userMarker = L.marker([latitude, longitude]).addTo(map);
          userMarker.bindPopup('<b>Your Location</b><br>Current weather data source').openPopup();
          
          // Zoom to user's location with animation
          map.setView([latitude, longitude], 8, {
            animate: true,
            duration: 1.5
          });
          
          console.log('Map zoomed to user location:', latitude, longitude);
        },
        (error) => {
          console.log('Could not get location for map zoom:', error);
          // Keep default view
        }
      );
    }
  }
  
  // Store map reference globally for potential future use
  window.worldMap = map;
}

// Run on page load
window.addEventListener('DOMContentLoaded', () => {
  requestLocationAndLoadWeather();
  initWorldMap();
});
console.log('Dashboard config:', config);
// Interactive Timeline Component for Dashboard
// Requires GSAP and Draggable (add via CDN in dashboard.html)

// --- Inject Timeline HTML ---
const timelineSection = document.getElementById('timeline-section');
timelineSection.innerHTML = `
  <svg id="timelineSVG" width="100%" height="180" viewBox="0 0 800 180" style="overflow:visible;">
    <!-- Curved Path -->
    <path id="sunPath" d="M 60 140 Q 400 20 740 140" stroke="#FFD700" stroke-width="4" fill="none" />
    <!-- Time Markers -->
    <g id="timeMarkers"></g>
    <!-- Sun -->
    <circle id="sun" r="24" fill="url(#sunGradient)" filter="url(#sunGlow)" />
    <!-- SVG defs for gradients and glow -->
    <defs>
      <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fffbe0" />
        <stop offset="80%" stop-color="#FFD700" />
        <stop offset="100%" stop-color="#FFB300" />
      </radialGradient>
      <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
`;

// --- Timeline Constants ---
const svg = document.getElementById('timelineSVG');
const sunPath = document.getElementById('sunPath');
const timeMarkersGroup = document.getElementById('timeMarkers');
const timeDisplay = document.getElementById('timelineTimeDisplay');
const pathLength = sunPath.getTotalLength();
const timelineStart = 0; // 12AM
const timelineEnd = 24; // 12AM next day
const visibleHours = timelineEnd - timelineStart;
const markerInterval = 2; // every 2 hours
const svgWidth = 800;
const svgHeight = 180;
const sun = document.getElementById('sun');

// --- Draw Time Markers ---
timeMarkersGroup.innerHTML = '';
for (let h = timelineStart; h <= timelineEnd; h += markerInterval) {
  const progress = (h - timelineStart) / visibleHours;
  const pt = sunPath.getPointAtLength(progress * pathLength);
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  marker.setAttribute('cx', pt.x);
  marker.setAttribute('cy', pt.y);
  marker.setAttribute('r', 6);
  marker.setAttribute('fill', '#6366f1');
  marker.setAttribute('class', 'timeline-marker');
  marker.style.cursor = 'pointer';
  marker.addEventListener('click', () => moveSunToHour(h));
  timeMarkersGroup.appendChild(marker);
  // Label
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', pt.x);
  label.setAttribute('y', pt.y + 28);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '1.1em');
  label.setAttribute('fill', '#333');
  label.textContent =
    h === 0 ? '12AM' :
    h < 12 ? `${h}AM` :
    h === 12 ? '12PM' : `${h-12}PM`;
  timeMarkersGroup.appendChild(label);
}

// --- Sun Initial Position ---
// Calculate current time and set sun position
const now = new Date();
let currentHour = now.getHours() + (now.getMinutes() / 60);
moveSunToHour(currentHour, false);

// --- GSAP Draggable Sun ---
gsap.registerPlugin(Draggable);
Draggable.create(sun, {
  type: 'x,y',
  bounds: svg,
  onPress: function() {
    gsap.to(sun, { scale: 1.1, duration: 0.2 });
  },
  onRelease: function() {
    gsap.to(sun, { scale: 1, duration: 0.2 });
    snapToNearestTimeMarker();
  },
  onDrag: function() {
    // Constrain sun strictly to the path
    const { x, y } = this;
    let minDist = Infinity, bestT = 0;
    for (let t = 0; t <= 1; t += 0.002) {
      const pt = sunPath.getPointAtLength(t * pathLength);
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d < minDist) { minDist = d; bestT = t; }
    }
    const progress = bestT;
    let hour = timelineStart + progress * visibleHours;
    hour = Math.max(timelineStart, Math.min(timelineEnd, hour));
    moveSunToHour(hour, true);
  },
  onDragStart: function() {
    this.update();
  },
  liveSnap: false
});

function getClosestProgressOnPath(x, y) {
  // Find closest point on path to (x, y)
  let minDist = Infinity, bestT = 0;
  for (let t = 0; t <= 1; t += 0.01) {
    const pt = sunPath.getPointAtLength(t * pathLength);
    const d = Math.hypot(pt.x - x, pt.y - y);
    if (d < minDist) { minDist = d; bestT = t; }
  }
  return bestT;
}

function moveSunToHour(hour, animate = true) {
  hour = Math.max(timelineStart, Math.min(timelineEnd, hour));
  currentHour = hour;
  const progress = (hour - timelineStart) / visibleHours;
  const pt = sunPath.getPointAtLength(Math.max(0, Math.min(1, progress)) * pathLength);
  if (animate) {
    gsap.to(sun, { x: pt.x, y: pt.y, duration: 0.3, ease: 'power2.out' });
  } else {
    gsap.set(sun, { x: pt.x, y: pt.y });
  }
  // Sun glow intensity
  const glow = Math.max(0.5, 1 - Math.abs(hour - 12) / 8);
  gsap.to(sun, { filter: `url(#sunGlow)`, boxShadow: `0 0 ${40 * glow}px 10px #FFD70088` });
  // Animate background
  updateTimelineBackground(hour);
  // Time display (update the card's time display)
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  let ampm = h < 12 ? 'AM' : 'PM';
  let displayH = h % 12 === 0 ? 12 : h % 12;
  document.getElementById('timelineTimeDisplay').textContent = `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function snapToNearestTimeMarker() {
  const snapHours = [];
  for (let h = timelineStart; h <= timelineEnd; h += markerInterval) snapHours.push(h);
  let closest = snapHours[0];
  let minDist = Math.abs(currentHour - closest);
  for (let h of snapHours) {
    if (Math.abs(currentHour - h) < minDist) {
      closest = h;
      minDist = Math.abs(currentHour - h);
    }
  }
  moveSunToHour(closest);
}

function updateTimelineBackground(hour) {
  let gradient;
  if (hour >= 6 && hour < 9) gradient = ['#87CEEB', '#E0F7FA']; // Dawn
  else if (hour >= 9 && hour < 16) gradient = ['#FFEE00', '#FFC600']; // Day
  else if (hour >= 16 && hour < 19) gradient = ['#FF7E00', '#FF2E00']; // Sunset
  else gradient = ['#0F2027', '#203A43']; // Night
  gsap.to(document.body, {
    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
    duration: 0.5
  });
}

// --- Responsive SVG ---
function resizeTimelineSVG() {
  const width = timelineSection.offsetWidth || 800;
  svg.setAttribute('width', width);
  svg.setAttribute('viewBox', `0 0 800 180`);
}
window.addEventListener('resize', resizeTimelineSVG);
resizeTimelineSVG();

// --- Timeline CSS ---
const style = document.createElement('style');
style.textContent = `
  .timeline-container {
    width: 100%;
    max-width: 900px;
    margin: 2.5rem auto 0 auto;
    background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%);
    border-radius: 32px;
    box-shadow: 0 8px 32px rgba(102,126,234,0.10);
    padding: 2.5rem 1.5rem 2.5rem 1.5rem;
    position: relative;
    overflow: visible;
  }
  #timelineSVG { display: block; margin: 0 auto; }
  .timeline-marker { transition: fill 0.2s; }
  .timeline-marker:hover { fill: #FFD700; }
  .timeline-labels {
    text-align: center;
    margin-top: 1.2rem;
    font-size: 1.3rem;
    color: #4f46e5;
    font-weight: 600;
    letter-spacing: 1px;
  }
  #sun {
    cursor: pointer;
    filter: url(#sunGlow);
    transition: filter 0.2s;
  }
`;
document.head.appendChild(style);

// --- Sun Card Logic ---
function setSunCardTimes(sunrise, sunset) {
  document.getElementById('sunriseTime').textContent = sunrise;
  document.getElementById('sunsetTime').textContent = sunset;
}
// Example: setSunCardTimes('6:12 AM', '7:45 PM');
// If you have weather data, call setSunCardTimes with real times.

// Optionally animate the sun icon along the arc based on current time
function animateSunIcon(sunrise, sunset) {
  const sunIcon = document.getElementById('sunIcon');
  const arc = document.getElementById('sunArc').querySelector('path');
  if (!sunIcon || !arc) return;
  // Convert sunrise/sunset to minutes since midnight
  function timeToMinutes(t) {
    const [h, m] = t.match(/\d+/g).map(Number);
    const isPM = t.toLowerCase().includes('pm');
    return (h % 12 + (isPM ? 12 : 0)) * 60 + m;
  }
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sunriseMins = timeToMinutes(sunrise);
  const sunsetMins = timeToMinutes(sunset);
  let progress = 0.5;
  if (nowMins <= sunriseMins) progress = 0;
  else if (nowMins >= sunsetMins) progress = 1;
  else progress = (nowMins - sunriseMins) / (sunsetMins - sunriseMins);
  // Get arc point
  const path = arc;
  const len = path.getTotalLength();
  const pt = path.getPointAtLength(progress * len);
  sunIcon.setAttribute('cx', pt.x);
  sunIcon.setAttribute('cy', pt.y);
}
// Example usage:
// setSunCardTimes('6:12 AM', '7:45 PM');
// animateSunIcon('6:12 AM', '7:45 PM');

// Animate path draw on mount
const sunPathEl = document.getElementById('sunPath');
gsap.set(sunPathEl, { strokeDasharray: sunPathEl.getTotalLength(), strokeDashoffset: sunPathEl.getTotalLength() });
gsap.to(sunPathEl, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' }); 