// Agriculture Alert JavaScript
let farmMap;
let currentLanguage = 'en';
let protectionStepsExpanded = false;

// Initialize the farm map
function initializeFarmMap() {
    farmMap = L.map('farm-map').setView([40.7128, -74.0060], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(farmMap);

    // Add field boundaries (sample polygons)
    const field1 = L.polygon([
        [40.7200, -74.0100],
        [40.7250, -74.0050],
        [40.7230, -74.0000],
        [40.7180, -74.0030]
    ], {
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.2,
        weight: 2
    }).addTo(farmMap);

    const field2 = L.polygon([
        [40.7100, -74.0150],
        [40.7140, -74.0100],
        [40.7120, -74.0080],
        [40.7080, -74.0120]
    ], {
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.2,
        weight: 2
    }).addTo(farmMap);

    // Add frost risk zones (red overlay)
    const frostZone = L.polygon([
        [40.7150, -74.0120],
        [40.7200, -74.0080],
        [40.7180, -74.0040],
        [40.7130, -74.0060]
    ], {
        color: '#F44336',
        fillColor: '#F44336',
        fillOpacity: 0.3,
        weight: 2
    }).addTo(farmMap);

    // Add crop markers with tooltips
    const crops = [
        { pos: [40.7190, -74.0070], type: 'corn', name: 'Corn Field A' },
        { pos: [40.7110, -74.0120], type: 'wheat', name: 'Wheat Field B' },
        { pos: [40.7160, -74.0090], type: 'tomato', name: 'Tomato Greenhouse' }
    ];

    crops.forEach(crop => {
        const cropIcon = L.divIcon({
            html: getCropIcon(crop.type),
            className: 'crop-marker',
            iconSize: [30, 30]
        });

        L.marker(crop.pos, { icon: cropIcon })
            .addTo(farmMap)
            .bindPopup(`
                <div class="crop-popup">
                    <h3>${crop.name}</h3>
                    <p><strong>Protection Tips:</strong></p>
                    <ul>
                        <li>Cover with frost cloth</li>
                        <li>Water before sunset</li>
                        <li>Use wind barriers</li>
                    </ul>
                </div>
            `);
    });

    // Add custom styles for crop markers
    const style = document.createElement('style');
    style.textContent = `
        .crop-marker {
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .crop-marker:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .crop-popup {
            font-family: 'Roboto', sans-serif;
            min-width: 200px;
        }
        .crop-popup h3 {
            margin: 0 0 8px 0;
            color: #2E7D32;
        }
        .crop-popup ul {
            margin: 8px 0;
            padding-left: 16px;
        }
        .crop-popup li {
            margin: 4px 0;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);
}

// Get crop icon based on type
function getCropIcon(type) {
    const icons = {
        corn: '<span class="material-icons" style="color: #FFD600; font-size: 20px;">grass</span>',
        wheat: '<span class="material-icons" style="color: #FF8F00; font-size: 20px;">agriculture</span>',
        tomato: '<span class="material-icons" style="color: #F44336; font-size: 20px;">local_florist</span>'
    };
    return icons[type] || '<span class="material-icons" style="color: #4CAF50; font-size: 20px;">eco</span>';
}

// Language switching functionality
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // Update active flag
    document.querySelectorAll('.flag-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-lang="${lang}"]`).classList.add('active');
    
    // Update text content
    updateText();
}

// Update text based on current language
function updateText() {
    const texts = translations[currentLanguage];
    
    document.getElementById('frost-alert-text').textContent = texts.frostAlert;
    document.getElementById('map-title').textContent = texts.mapTitle;
    document.getElementById('language-label').textContent = texts.language;
    document.getElementById('soil-health-title').textContent = texts.soilHealth;
    document.getElementById('moisture-label').textContent = texts.moisture;
    document.getElementById('ph-label').textContent = texts.pH;
    document.getElementById('npk-label').textContent = texts.npk;
    document.getElementById('protection-title').textContent = texts.protectionTitle;
    
    // Update protection steps
    document.getElementById('step-1').textContent = texts.steps[0];
    document.getElementById('step-2').textContent = texts.steps[1];
    document.getElementById('step-3').textContent = texts.steps[2];
    document.getElementById('step-4').textContent = texts.steps[3];
}

// Toggle protection steps panel
function toggleProtectionSteps() {
    const content = document.getElementById('protection-content');
    const arrow = document.getElementById('protection-arrow');
    
    protectionStepsExpanded = !protectionStepsExpanded;
    
    if (protectionStepsExpanded) {
        content.classList.add('expanded');
        arrow.textContent = 'expand_less';
    } else {
        content.classList.remove('expanded');
        arrow.textContent = 'expand_more';
    }
}

// Initialize gauge animations
function animateGauges() {
    const gauges = document.querySelectorAll('.gauge-circle');
    
    gauges.forEach((gauge, index) => {
        setTimeout(() => {
            gauge.style.transition = 'background 1s ease';
        }, index * 200);
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeFarmMap();
    animateGauges();
    
    // Add language switching event listeners
    document.querySelectorAll('.flag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchLanguage(this.dataset.lang);
        });
    });
    
    // Simulate real-time soil data updates
    setInterval(updateSoilData, 5000);
});

// Simulate real-time soil data updates
function updateSoilData() {
    const moistureGauge = document.querySelector('.gauge-circle');
    const currentValue = parseInt(moistureGauge.style.getPropertyValue('--value')) || 252;
    const newValue = Math.max(180, Math.min(300, currentValue + (Math.random() - 0.5) * 20));
    
    moistureGauge.style.setProperty('--value', `${newValue}deg`);
    
    // Update percentage display
    const percentage = Math.round(((newValue - 180) / 120) * 100);
    moistureGauge.querySelector('.gauge-value').textContent = `${percentage}%`;
}

// Add click handlers for map interaction
document.addEventListener('DOMContentLoaded', function() {
    // Add long-press detection for mobile
    let pressTimer;
    
    document.getElementById('farm-map').addEventListener('mousedown', function(e) {
        pressTimer = setTimeout(() => {
            showReportModal(e);
        }, 800);
    });
    
    document.getElementById('farm-map').addEventListener('mouseup', function() {
        clearTimeout(pressTimer);
    });
    
    document.getElementById('farm-map').addEventListener('mouseleave', function() {
        clearTimeout(pressTimer);
    });
});

// Show report modal (placeholder for future implementation)
function showReportModal(event) {
    console.log('Report modal would open here', event);
    // Future implementation: show modal for reporting field conditions
}
