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
let currentHour = 6;
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