// Disaster Response JavaScript
let evacuationMap;
let countdownInterval;
let isMuted = false;
let isSafeConfirmed = false;

// Initialize evacuation map
function initializeEvacuationMap() {
    evacuationMap = L.map('evacuation-map').setView([40.7128, -74.0060], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(evacuationMap);

    // Add danger zone (red polygon)
    const dangerZone = L.polygon([
        [40.7200, -74.0100],
        [40.7300, -74.0050],
        [40.7280, -73.9980],
        [40.7180, -74.0020]
    ], {
        color: '#E53935',
        fillColor: '#E53935',
        fillOpacity: 0.4,
        weight: 3,
        className: 'danger-zone'
    }).addTo(evacuationMap);

    // Add pulsing animation to danger zone
    dangerZone.on('add', function() {
        const element = this.getElement();
        if (element) {
            element.style.animation = 'pulse 2s infinite';
        }
    });

    // Add safe evacuation routes (blue lines)
    const safeRoutes = [
        {
            path: [[40.7150, -74.0080], [40.7100, -74.0030], [40.7050, -73.9980]],
            name: 'Route A - Main Highway'
        },
        {
            path: [[40.7200, -74.0020], [40.7150, -73.9970], [40.7100, -73.9920]],
            name: 'Route B - Secondary Road'
        },
        {
            path: [[40.7250, -74.0060], [40.7200, -74.0010], [40.7150, -73.9960]],
            name: 'Route C - Alternate Path'
        }
    ];

    safeRoutes.forEach(route => {
        const routeLine = L.polyline(route.path, {
            color: '#1E88E5',
            weight: 4,
            opacity: 0.8
        }).addTo(evacuationMap);

        routeLine.bindPopup(`
            <div class="route-popup">
                <h3>${route.name}</h3>
                <p><strong>Status:</strong> Clear</p>
                <p><strong>Traffic:</strong> Light</p>
                <button onclick="selectRoute('${route.name}')" class="select-route-btn">Use This Route</button>
            </div>
        `);
    });

    // Add shelter locations (green pins)
    const shelters = [
        {
            pos: [40.7080, -74.0020],
            name: 'Central Community Center',
            capacity: 65,
            distance: '0.8 miles'
        },
        {
            pos: [40.7120, -73.9980],
            name: 'North Elementary School',
            capacity: 45,
            distance: '1.2 miles'
        },
        {
            pos: [40.7040, -73.9940],
            name: 'South High School',
            capacity: 85,
            distance: '2.1 miles'
        }
    ];

    shelters.forEach(shelter => {
        const shelterIcon = L.divIcon({
            html: `
                <div class="shelter-marker">
                    <span class="material-icons">home</span>
                    <div class="capacity-indicator" style="background: conic-gradient(#4CAF50 0deg, #4CAF50 ${shelter.capacity * 3.6}deg, #ddd ${shelter.capacity * 3.6}deg, #ddd 360deg);">
                        <span>${shelter.capacity}%</span>
                    </div>
                </div>
            `,
            className: 'shelter-icon',
            iconSize: [50, 50]
        });

        const marker = L.marker(shelter.pos, { icon: shelterIcon }).addTo(evacuationMap);
        
        marker.bindPopup(`
            <div class="shelter-popup">
                <h3>${shelter.name}</h3>
                <p><strong>Distance:</strong> ${shelter.distance}</p>
                <p><strong>Capacity:</strong> ${shelter.capacity}% full</p>
                <button onclick="navigateToShelter('${shelter.name.toLowerCase().replace(/\s+/g, '-')}')" class="navigate-btn">Navigate</button>
            </div>
        `);
    });

    // Add custom styles for markers
    const style = document.createElement('style');
    style.textContent = `
        .danger-zone {
            animation: pulse 2s infinite;
        }
        .shelter-marker {
            background: white;
            border: 3px solid #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            width: 50px;
            height: 50px;
        }
        .shelter-marker .material-icons {
            color: #4CAF50;
            font-size: 24px;
        }
        .capacity-indicator {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            background: #4CAF50;
        }
        .route-popup, .shelter-popup {
            font-family: 'Rubik', sans-serif;
            min-width: 200px;
        }
        .route-popup h3, .shelter-popup h3 {
            margin: 0 0 8px 0;
            color: #1E88E5;
        }
        .select-route-btn, .navigate-btn {
            background: #1E88E5;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 8px;
        }
        .select-route-btn:hover, .navigate-btn:hover {
            background: #1976D2;
        }
        @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 0.7; }
            100% { opacity: 0.4; }
        }
    `;
    document.head.appendChild(style);
}

// Start countdown timer
function startCountdown() {
    let totalSeconds = 4920; // 1h 22m in seconds
    
    countdownInterval = setInterval(() => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const display = `Landfall in ${hours}h ${minutes}m`;
        document.getElementById('countdown').textContent = display;
        
        totalSeconds--;
        
        if (totalSeconds < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown').textContent = 'IMPACT IMMINENT';
            document.getElementById('countdown').style.background = '#E53935';
        }
    }, 1000);
}

// Toggle mute functionality
function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.querySelector('.mute-btn');
    const icon = muteBtn.querySelector('.material-icons');
    
    if (isMuted) {
        icon.textContent = 'volume_off';
        muteBtn.style.background = 'rgba(255, 255, 255, 0.4)';
    } else {
        icon.textContent = 'volume_up';
        muteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    }
}

// Mark user as safe
function markSafe() {
    isSafeConfirmed = true;
    const safeBtn = document.querySelector('.safe-button');
    const btnText = document.getElementById('safe-button-text');
    
    safeBtn.classList.add('confirmed');
    btnText.textContent = 'Status Confirmed';
    
    // Add visual feedback
    safeBtn.style.transform = 'scale(1.05)';
    setTimeout(() => {
        safeBtn.style.transform = 'scale(1)';
    }, 200);
    
    // Simulate updating family status
    setTimeout(() => {
        updateFamilyStatus();
    }, 1000);
}

// Update family status (simulated)
function updateFamilyStatus() {
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach((item, index) => {
        if (index === 1) { // Sarah Smith
            const icon = item.querySelector('.status-icon');
            const text = item.querySelector('span');
            
            icon.className = 'status-icon status-safe';
            icon.innerHTML = '<span class="material-icons">check</span>';
            text.textContent = 'Sarah Smith - Safe';
        }
    });
}

// Make emergency calls
function makeCall(type) {
    const callBtn = event.target.closest('.call-btn');
    callBtn.style.background = '#FF5722';
    callBtn.innerHTML = '<span class="material-icons">phone_in_talk</span>';
    
    // Simulate call being made
    setTimeout(() => {
        callBtn.style.background = '#1E88E5';
        callBtn.innerHTML = '<span class="material-icons">phone</span>';
    }, 2000);
    
    console.log(`Emergency call made to: ${type}`);
}

// Navigate to shelter
function navigateToShelter(shelterId) {
    console.log(`Navigating to shelter: ${shelterId}`);
    
    // Simulate navigation start
    const navigateBtn = event.target;
    navigateBtn.textContent = 'Navigating...';
    navigateBtn.style.background = '#FF9800';
    
    // Reset after simulation
    setTimeout(() => {
        navigateBtn.textContent = 'Navigate';
        navigateBtn.style.background = '#4CAF50';
    }, 3000);
}

// Select evacuation route
function selectRoute(routeName) {
    console.log(`Selected route: ${routeName}`);
    
    // Highlight selected route on map
    evacuationMap.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            layer.setStyle({ weight: 6, color: '#FFD600' });
            
            // Reset after 3 seconds
            setTimeout(() => {
                layer.setStyle({ weight: 4, color: '#1E88E5' });
            }, 3000);
        }
    });
}

// Layer toggle functionality
function initializeLayerToggle() {
    const layerBtns = document.querySelectorAll('.layer-btn');
    const layers = {
        danger: null,
        routes: null,
        shelters: null
    };
    
    layerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const layer = this.dataset.layer;
            this.classList.toggle('active');
            
            // Toggle layer visibility (simplified for demo)
            if (this.classList.contains('active')) {
                console.log(`Showing ${layer} layer`);
            } else {
                console.log(`Hiding ${layer} layer`);
            }
        });
    });
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeEvacuationMap();
    startCountdown();
    initializeLayerToggle();
    
    // Add long-press detection for reporting
    let pressTimer;
    
    document.getElementById('evacuation-map').addEventListener('mousedown', function(e) {
        pressTimer = setTimeout(() => {
            showReportModal(e);
        }, 800);
    });
    
    document.getElementById('evacuation-map').addEventListener('mouseup', function() {
        clearTimeout(pressTimer);
    });
    
    document.getElementById('evacuation-map').addEventListener('mouseleave', function() {
        clearTimeout(pressTimer);
    });
    
    // Add touch events for mobile
    document.getElementById('evacuation-map').addEventListener('touchstart', function(e) {
        pressTimer = setTimeout(() => {
            showReportModal(e);
        }, 800);
    });
    
    document.getElementById('evacuation-map').addEventListener('touchend', function() {
        clearTimeout(pressTimer);
    });
});

// Show report modal for flooding or other incidents
function showReportModal(event) {
    const modal = document.createElement('div');
    modal.className = 'report-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Report Incident</h3>
            <div class="report-options">
                <button onclick="reportIncident('flooding')" class="report-btn">
                    <span class="material-icons">water</span>
                    Flooding
                </button>
                <button onclick="reportIncident('blocked-road')" class="report-btn">
                    <span class="material-icons">block</span>
                    Blocked Road
                </button>
                <button onclick="reportIncident('debris')" class="report-btn">
                    <span class="material-icons">warning</span>
                    Debris
                </button>
            </div>
            <button onclick="closeReportModal()" class="close-btn">Cancel</button>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .report-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        .modal-content {
            background: #2A2A3E;
            color: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 300px;
            width: 90%;
        }
        .modal-content h3 {
            margin: 0 0 16px 0;
            color: #E53935;
        }
        .report-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }
        .report-btn {
            background: #1E88E5;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        .report-btn:hover {
            background: #1976D2;
        }
        .close-btn {
            background: #757575;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
}

// Report incident
function reportIncident(type) {
    console.log(`Incident reported: ${type}`);
    closeReportModal();
    
    // Show confirmation
    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation-toast';
    confirmation.textContent = `${type.replace('-', ' ')} report submitted`;
    confirmation.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10001;
        font-weight: 500;
    `;
    
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
        confirmation.remove();
    }, 3000);
}

// Close report modal
function closeReportModal() {
    const modal = document.querySelector('.report-modal');
    if (modal) {
        modal.remove();
    }
}
