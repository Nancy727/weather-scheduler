// Disaster Response System - NOAA API Integration
const NOAA_API_TOKEN = 'uwemSSDuJcgEdUtSqrkwpqEWsYqPwhCJ';
const NOAA_BASE_URL = 'https://api.weather.gov';

// Global variables
let map;
let currentAlerts = [];
let userLocation = null;
let customMarkers = []; // Array to store custom markers
let selectedLocation = null; // Currently selected location
let disasterOverlays = []; // Array to store disaster area overlays
let alertMarkers = []; // Array to store alert markers

// Initialize the disaster response system
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    getUserLocation();
    fetchNOAAAlerts();
    
    // Refresh alerts every 5 minutes
    setInterval(fetchNOAAAlerts, 5 * 60 * 1000);
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('evacuation-map').setView([20, 0], 2); // Global view
    
    // Base map layer
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Satellite layer option
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    });
    
    // Add NOAA weather layers
    const radarLayer = L.tileLayer('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?service=WMS&request=GetMap&version=1.3.0&LAYERS=nexrad-n0r&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&format=image/png&transparent=true', {
        opacity: 0.6
    });
    
    // Layer controls
    const layerControls = document.querySelectorAll('.layer-btn');
    layerControls.forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            const layer = this.dataset.layer;
            
            if (layer === 'radar') {
                if (this.classList.contains('active')) {
                    radarLayer.addTo(map);
                } else {
                    map.removeLayer(radarLayer);
                }
            } else if (layer === 'satellite') {
                if (this.classList.contains('active')) {
                    map.removeLayer(baseLayer);
                    satelliteLayer.addTo(map);
                } else {
                    map.removeLayer(satelliteLayer);
                    baseLayer.addTo(map);
                }
            }
        });
    });
    
    // Add click event listener to map
    map.on('click', onMapClick);
    
    // Add legend for disaster areas
    addDisasterLegend();
}

// Add disaster legend to the map
function addDisasterLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'disaster-legend');
        div.innerHTML = `
            <div class="legend-header">
                <h4>Disaster Severity</h4>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #E53935;"></span>
                <span>Extreme</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #FF5722;"></span>
                <span>Severe</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #FF9800;"></span>
                <span>Moderate</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #FFC107;"></span>
                <span>Minor</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #4CAF50;"></span>
                <span>Safe</span>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Clear all disaster overlays
function clearDisasterOverlays() {
    disasterOverlays.forEach(overlay => {
        if (map.hasLayer(overlay)) {
            map.removeLayer(overlay);
        }
    });
    disasterOverlays = [];
    
    alertMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    alertMarkers = [];
}

// Handle map click events
function onMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Close any existing map popups first
    map.closePopup();
    
    // Remove previous custom markers
    clearCustomMarkers();
    
    // Add new marker at clicked location
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-location-marker',
            html: '<div style="background: #1E88E5; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    customMarkers.push(marker);
    
    // Store selected location
    selectedLocation = { lat, lng };
    
    // Get location name using reverse geocoding
    getLocationName(lat, lng).then(locationName => {
        // Escape the location name for use in HTML
        const escapedLocationName = locationName.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        // Update marker popup with location info
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #1E88E5;">
                    📍 ${locationName}
                </h4>
                <p style="margin: 0 0 8px 0; font-size: 14px;">
                    <strong>Coordinates:</strong><br>
                    ${lat.toFixed(4)}, ${lng.toFixed(4)}
                </p>
                <button onclick="getDisasterInfo(${lat}, ${lng}, '${escapedLocationName}')" 
                        style="background: #1E88E5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Get Disaster Info
                </button>
            </div>
        `, {
            closeButton: true,
            maxWidth: 300,
            className: 'custom-map-popup'
        }).openPopup();
        
        // Show success message with a small delay to prevent overlapping
        setTimeout(() => {
            showPopup('Location Selected', `You've selected: ${locationName}`, 'success', ['Get Disaster Info', 'Cancel']);
        }, 300);
    });
}

// Clear all custom markers
function clearCustomMarkers() {
    customMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    customMarkers = [];
}

// Get location name from coordinates
async function getLocationName(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
        );
        const data = await response.json();
        
        if (data.display_name) {
            const parts = data.display_name.split(', ');
            if (parts.length >= 3) {
                return `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
            } else {
                return data.display_name;
            }
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
        console.error('Error getting location name:', error);
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

// Get disaster information for selected location
async function getDisasterInfo(lat, lng, locationName) {
    try {
        // Show loading state
        showPopup('Loading...', 'Fetching disaster information for this location...', 'info', []);
        
        // Fetch NOAA alerts for this location
        const alertsResponse = await fetch(`${NOAA_BASE_URL}/alerts/active?point=${lat},${lng}`);
        const alertsData = await alertsResponse.json();
        
        // Get weather information
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=1a86ceeae9887eebaa68668f73b317a1&units=metric`);
        const weatherData = await weatherResponse.json();
        
        // Get nearby shelters
        const shelters = await getNearbyShelters(lat, lng);
        
        // Display comprehensive disaster information
        displayLocationDisasterInfo(lat, lng, locationName, alertsData.features || [], weatherData, shelters);
        
    } catch (error) {
        console.error('Error getting disaster info:', error);
        showPopup('Error', 'Could not fetch disaster information for this location.', 'error', ['OK']);
    }
}

// Display comprehensive disaster information for selected location
function displayLocationDisasterInfo(lat, lng, locationName, alerts, weather, shelters) {
    const alertCount = alerts.length;
    const hasActiveAlerts = alertCount > 0;
    
    let alertInfo = '';
    if (hasActiveAlerts) {
        alertInfo = `
            <div style="margin: 10px 0; padding: 10px; background: rgba(229, 57, 53, 0.1); border-radius: 8px; border-left: 4px solid #E53935;">
                <h5 style="margin: 0 0 8px 0; color: #E53935;">⚠️ Active Alerts (${alertCount})</h5>
                ${alerts.slice(0, 3).map(alert => `
                    <div style="margin: 5px 0; padding: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                        <strong>${alert.properties.event}</strong><br>
                        <small>${alert.properties.severity} • ${alert.properties.areaDesc}</small>
                    </div>
                `).join('')}
                ${alertCount > 3 ? `<small>... and ${alertCount - 3} more alerts</small>` : ''}
            </div>
        `;
    } else {
        alertInfo = `
            <div style="margin: 10px 0; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border-left: 4px solid #4CAF50;">
                <h5 style="margin: 0 0 8px 0; color: #4CAF50;">✅ No Active Alerts</h5>
                <small>This area is currently clear of weather alerts.</small>
            </div>
        `;
    }
    
    const weatherInfo = `
        <div style="margin: 10px 0; padding: 10px; background: rgba(30, 136, 229, 0.1); border-radius: 8px; border-left: 4px solid #1E88E5;">
            <h5 style="margin: 0 0 8px 0; color: #1E88E5;">🌤️ Current Weather</h5>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${getWeatherIcon(weather.weather[0].main)}</span>
                <div>
                    <strong>${Math.round(weather.main.temp)}°C</strong><br>
                    <small>${weather.weather[0].description}</small>
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 12px;">
                Humidity: ${weather.main.humidity}% | Wind: ${Math.round(weather.wind.speed * 3.6)} km/h
            </div>
        </div>
    `;
    
    const shelterInfo = shelters.length > 0 ? `
        <div style="margin: 10px 0; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 8px; border-left: 4px solid #FF9800;">
            <h5 style="margin: 0 0 8px 0; color: #FF9800;">🏠 Nearby Shelters (${shelters.length})</h5>
            ${shelters.slice(0, 3).map(shelter => `
                <div style="margin: 5px 0; padding: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                    <strong>${shelter.name}</strong><br>
                    <small>${shelter.distance} km away</small>
                </div>
            `).join('')}
        </div>
    ` : `
        <div style="margin: 10px 0; padding: 10px; background: rgba(158, 158, 158, 0.1); border-radius: 8px; border-left: 4px solid #9E9E9E;">
            <h5 style="margin: 0 0 8px 0; color: #9E9E9E;">🏠 No Shelters Found</h5>
            <small>No emergency shelters found in this area.</small>
        </div>
    `;
    
    const content = `
        <div style="max-width: 400px;">
            <h4 style="margin: 0 0 16px 0; color: #1E88E5; text-align: center;">
                📍 Disaster Information
            </h4>
            <h5 style="margin: 0 0 8px 0; color: white;">${locationName}</h5>
            <small style="color: rgba(255, 255, 255, 0.7);">${lat.toFixed(4)}, ${lng.toFixed(4)}</small>
            
            ${alertInfo}
            ${weatherInfo}
            ${shelterInfo}
            
            <div style="margin-top: 16px; text-align: center;">
                <button onclick="getEmergencyContacts(${lat}, ${lng})" 
                        style="background: #E53935; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                    🚨 Emergency Contacts
                </button>
                <button onclick="getEvacuationRoutes(${lat}, ${lng})" 
                        style="background: #FF9800; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    🛣️ Evacuation Routes
                </button>
            </div>
        </div>
    `;
    
    showPopup('Disaster Information', content, 'info', ['Close']);
}

// Get weather icon
function getWeatherIcon(weatherMain) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Snow': '❄️',
        'Thunderstorm': '⛈️',
        'Drizzle': '🌦️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️'
    };
    return icons[weatherMain] || '🌤️';
}

// Get emergency contacts for location
function getEmergencyContacts(lat, lng) {
    const content = `
        <div style="max-width: 400px;">
            <h4 style="margin: 0 0 16px 0; color: #E53935; text-align: center;">
                🚨 Emergency Contacts
            </h4>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(229, 57, 53, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #E53935;">Police</h5>
                <button onclick="makeCall('police')" style="background: #E53935; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;">
                    🚔 Call Police (100)
                </button>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #FF9800;">Fire Department</h5>
                <button onclick="makeCall('fire')" style="background: #FF9800; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;">
                    🚒 Call Fire (101)
                </button>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #4CAF50;">Ambulance</h5>
                <button onclick="makeCall('ambulance')" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;">
                    🚑 Call Ambulance (102)
                </button>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(30, 136, 229, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #1E88E5;">Disaster Management</h5>
                <button onclick="makeCall('disaster')" style="background: #1E88E5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;">
                    🆘 Call Disaster Helpline (1078)
                </button>
            </div>
        </div>
    `;
    
    showPopup('Emergency Contacts', content, 'error', ['Close']);
}

// Get evacuation routes for location
function getEvacuationRoutes(lat, lng) {
    const content = `
        <div style="max-width: 400px;">
            <h4 style="margin: 0 0 16px 0; color: #FF9800; text-align: center;">
                🛣️ Evacuation Routes
            </h4>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #FF9800;">Primary Routes</h5>
                <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
                    <li>Highway 1 - Northbound</li>
                    <li>Highway 2 - Southbound</li>
                    <li>Main Street - Eastbound</li>
                </ul>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(158, 158, 158, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #9E9E9E;">Assembly Points</h5>
                <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
                    <li>Central Park (2.3 km)</li>
                    <li>Community Center (1.8 km)</li>
                    <li>School Ground (3.1 km)</li>
                </ul>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #4CAF50;">Safety Tips</h5>
                <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); font-size: 12px;">
                    <li>Follow official evacuation orders</li>
                    <li>Take essential items only</li>
                    <li>Stay on designated routes</li>
                    <li>Keep family together</li>
                </ul>
            </div>
        </div>
    `;
    
    showPopup('Evacuation Routes', content, 'warning', ['Close']);
}

// Get user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                map.setView([userLocation.lat, userLocation.lng], 10);
                
                // Add user location marker
                L.marker([userLocation.lat, userLocation.lng])
                    .addTo(map)
                    .bindPopup('Your Location')
                    .openPopup();
                
                // Fetch alerts for user's area
                fetchNOAAAlertsForLocation(userLocation.lat, userLocation.lng);
                
                // Get nearby shelters based on user location
                getNearbyShelters(userLocation.lat, userLocation.lng);
            },
            (error) => {
                console.log('Location access denied, using default location');
                // Use default location (center of USA)
                userLocation = { lat: 39.8283, lng: -98.5795 };
                
                // Get nearby shelters for default location
                getNearbyShelters(userLocation.lat, userLocation.lng);
            }
        );
    } else {
        // Geolocation not supported, use default location
        userLocation = { lat: 39.8283, lng: -98.5795 };
        getNearbyShelters(userLocation.lat, userLocation.lng);
    }
}

// Fetch NOAA alerts for a specific location
async function fetchNOAAAlertsForLocation(lat, lng) {
    try {
        console.log('Fetching alerts for location:', lat, lng);
        const response = await fetch(`${NOAA_BASE_URL}/alerts/active?point=${lat},${lng}`);
        const data = await response.json();
        
        console.log('Local alerts found:', data.features ? data.features.length : 0);
        
        if (data.features && data.features.length > 0) {
            await displayAlerts(data.features);
            updateEmergencyHeader(data.features[0]); // Show most severe alert
        } else {
            // No local alerts - show "all clear" message
            showNoAlerts();
        }
    } catch (error) {
        console.error('Error fetching NOAA alerts:', error);
        showNoAlerts();
    }
}

// Fetch all active NOAA alerts
async function fetchNOAAAlerts() {
    try {
        console.log('Fetching NOAA alerts...');
        const response = await fetch(`${NOAA_BASE_URL}/alerts/active`);
        const data = await response.json();
        
        console.log('NOAA API Response:', data);
        console.log('Number of alerts found:', data.features ? data.features.length : 0);
        
        if (data.features && data.features.length > 0) {
            currentAlerts = data.features;
            
            // Log first few alerts for debugging
            data.features.slice(0, 3).forEach((alert, index) => {
                console.log(`Alert ${index + 1}:`, {
                    event: alert.properties.event,
                    severity: alert.properties.severity,
                    areaDesc: alert.properties.areaDesc,
                    hasGeometry: !!alert.geometry,
                    geometryType: alert.geometry ? alert.geometry.type : 'none'
                });
            });
            
            // Always display alerts regardless of user location
            await displayAlerts(data.features);
            
            // Update header with most severe alert
            if (data.features.length > 0) {
                updateEmergencyHeader(data.features[0]);
            }
        } else {
            console.log('No alerts found in NOAA response, creating sample alert for demonstration');
            // Create a sample alert for demonstration if no real alerts are found
            await createSampleAlerts();
        }
    } catch (error) {
        console.error('Error fetching NOAA alerts:', error);
        console.log('Creating sample alerts due to API error');
        await createSampleAlerts();
    }
}

// Create sample alerts for demonstration
async function createSampleAlerts() {
    const sampleAlerts = [
        {
            properties: {
                event: "Flood Watch",
                severity: "Moderate",
                areaDesc: "Benton; Carroll; Washington; Madison; Crawford; Franklin; Sebastian; Pushmataha; Choctaw; Ottawa; Mayes; Delaware; Okfuskee; Okmulgee; Wagoner; Cherokee; Adair; Muskogee; McIntosh; Sequoyah; Pittsburg; Haskell; Latimer; Le Flore",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                headline: "Flood Watch issued for multiple counties",
                description: "Heavy rainfall expected to cause flooding in low-lying areas."
            },
            geometry: null
        },
        {
            properties: {
                event: "Typhoon Warning",
                severity: "Extreme",
                areaDesc: "Philippines; Taiwan; Japan; South Korea; China",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                headline: "Super Typhoon approaching East Asia",
                description: "Category 5 typhoon with winds exceeding 150 mph expected to make landfall."
            },
            geometry: null
        },
        {
            properties: {
                event: "Earthquake Alert",
                severity: "Severe",
                areaDesc: "Indonesia; Malaysia; Singapore; Thailand",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
                headline: "Major earthquake detected in Southeast Asia",
                description: "7.2 magnitude earthquake with potential for aftershocks and tsunamis."
            },
            geometry: null
        },
        {
            properties: {
                event: "Drought Warning",
                severity: "Moderate",
                areaDesc: "India; Pakistan; Bangladesh; Nepal",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                headline: "Severe drought conditions in South Asia",
                description: "Extended dry period affecting agriculture and water supplies."
            },
            geometry: null
        },
        {
            properties: {
                event: "Heat Wave",
                severity: "Severe",
                areaDesc: "China; Mongolia; Kazakhstan; Russia",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                headline: "Extreme heat wave affecting Central Asia",
                description: "Temperatures exceeding 40°C with high humidity levels."
            },
            geometry: null
        }
    ];
    
    await displayAlerts(sampleAlerts);
    updateEmergencyHeader(sampleAlerts[0]);
}

// Display alerts on the map and in the UI
async function displayAlerts(alerts) {
    // Clear existing disaster overlays
    clearDisasterOverlays();
    
    if (!alerts || alerts.length === 0) {
        return;
    }
    
    // Show loading indicator
    showLoadingIndicator('Processing disaster alerts...');
    
    try {
        // Process alerts with and without coordinates
        for (const alert of alerts) {
            const properties = alert.properties;
            const geometry = alert.geometry;
            
            if (geometry && geometry.coordinates) {
                // Alert has geographic coordinates - display as polygon
                await displayAlertWithCoordinates(alert);
            } else {
                // Alert has only area description - geocode and display as marker
                await displayAlertWithGeocoding(alert);
            }
        }
        
        // Fit map to show all disaster areas if there are any
        if (disasterOverlays.length > 0 || alertMarkers.length > 0) {
            const allLayers = [...disasterOverlays, ...alertMarkers];
            const group = new L.featureGroup(allLayers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        // Show success message
        if (alerts.length > 0) {
            showToast(`Loaded ${alerts.length} disaster alert(s)`, 'success');
        }
    } catch (error) {
        console.error('Error displaying alerts:', error);
        hideLoadingIndicator();
        showToast('Error loading disaster alerts', 'error');
    }
}

// Display alert with geographic coordinates as polygon
async function displayAlertWithCoordinates(alert) {
    const properties = alert.properties;
    const geometry = alert.geometry;
    const coordinates = geometry.coordinates[0]; // First polygon
    
    // Create polygon for alert area with enhanced styling
    const polygon = L.polygon(coordinates.map(coord => [coord[1], coord[0]]), {
        color: getAlertColor(properties.severity),
        weight: 3,
        fillColor: getAlertColor(properties.severity),
        fillOpacity: 0.4,
        className: `disaster-area-${properties.severity.toLowerCase()}`
    }).addTo(map);
    
    disasterOverlays.push(polygon);
    
    // Add pulsing effect for severe alerts
    if (properties.severity === 'Severe' || properties.severity === 'Extreme') {
        polygon.setStyle({
            fillOpacity: 0.6,
            weight: 4
        });
    }
    
    // Calculate center of the polygon for marker placement
    const bounds = polygon.getBounds();
    const center = bounds.getCenter();
    
    // Create alert marker at center
    await createAlertMarker(center, properties);
    
    // Add popup to polygon
    addAlertPopup(polygon, properties, center);
}

// Geocode area description to coordinates
async function geocodeAreaDescription(areaDesc) {
    try {
        console.log('Geocoding area description:', areaDesc);
        
        // Clean up the area description and split by semicolons
        const areas = areaDesc
            .replace(/;/g, ',') // Replace semicolons with commas
            .split(',')
            .map(area => area.trim())
            .filter(area => area.length > 0);
        
        console.log('Parsed areas:', areas);
        
        // Determine region based on area names
        const region = determineRegion(areas);
        console.log('Determined region:', region);
        
        // Try multiple search strategies based on region
        const searchQueries = generateSearchQueries(areas[0], region);
        
        for (const searchQuery of searchQueries) {
            console.log('Trying search query:', searchQuery);
            
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
                );
                const data = await response.json();
                
                console.log('Geocoding response for', searchQuery, ':', data);
                
                if (data && data.length > 0) {
                    const result = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                        areaName: areas[0],
                        allAreas: areas,
                        region: region
                    };
                    console.log('Geocoding successful with query:', searchQuery, result);
                    return result;
                }
            } catch (error) {
                console.error('Error with search query:', searchQuery, error);
                continue; // Try next query
            }
        }
        
        // If all geocoding attempts fail, use region-specific fallback
        console.log('All geocoding attempts failed, using region fallback');
        return getRegionFallback(region, areas);
        
    } catch (error) {
        console.error('Geocoding error:', error);
        // Ultimate fallback
        return {
            lat: 20,
            lng: 0,
            areaName: 'Global',
            allAreas: ['Global'],
            region: 'global'
        };
    }
}

// Determine region based on area names
function determineRegion(areas) {
    const areaText = areas.join(' ').toLowerCase();
    
    if (areaText.includes('china') || areaText.includes('japan') || areaText.includes('korea') || 
        areaText.includes('taiwan') || areaText.includes('philippines') || areaText.includes('mongolia')) {
        return 'east_asia';
    }
    if (areaText.includes('india') || areaText.includes('pakistan') || areaText.includes('bangladesh') || 
        areaText.includes('nepal') || areaText.includes('sri lanka')) {
        return 'south_asia';
    }
    if (areaText.includes('indonesia') || areaText.includes('malaysia') || areaText.includes('singapore') || 
        areaText.includes('thailand') || areaText.includes('vietnam') || areaText.includes('cambodia')) {
        return 'southeast_asia';
    }
    if (areaText.includes('kazakhstan') || areaText.includes('russia') || areaText.includes('uzbekistan')) {
        return 'central_asia';
    }
    if (areaText.includes('usa') || areaText.includes('united states') || areaText.includes('canada') || 
        areaText.includes('mexico')) {
        return 'north_america';
    }
    
    return 'global';
}

// Generate search queries based on region
function generateSearchQueries(area, region) {
    const queries = [];
    
    switch (region) {
        case 'east_asia':
            queries.push(
                `${area}, China`,
                `${area}, Japan`,
                `${area}, Asia`,
                area
            );
            break;
        case 'south_asia':
            queries.push(
                `${area}, India`,
                `${area}, Pakistan`,
                `${area}, Asia`,
                area
            );
            break;
        case 'southeast_asia':
            queries.push(
                `${area}, Indonesia`,
                `${area}, Malaysia`,
                `${area}, Asia`,
                area
            );
            break;
        case 'central_asia':
            queries.push(
                `${area}, Kazakhstan`,
                `${area}, Russia`,
                `${area}, Asia`,
                area
            );
            break;
        case 'north_america':
            queries.push(
                `${area}, USA`,
                `${area}, United States`,
                `${area}, Oklahoma, USA`,
                `${area} County, Oklahoma, USA`,
                area
            );
            break;
        default:
            queries.push(
                area,
                `${area}, Asia`,
                `${area}, World`
            );
    }
    
    return queries;
}

// Get region-specific fallback coordinates
function getRegionFallback(region, areas) {
    const fallbacks = {
        'east_asia': { lat: 35.8617, lng: 104.1954 }, // China
        'south_asia': { lat: 20.5937, lng: 78.9629 }, // India
        'southeast_asia': { lat: -2.5489, lng: 118.0149 }, // Indonesia
        'central_asia': { lat: 48.0196, lng: 66.9237 }, // Kazakhstan
        'north_america': { lat: 35.5653, lng: -97.9289 }, // Oklahoma
        'global': { lat: 20, lng: 0 } // Global center
    };
    
    const fallback = fallbacks[region] || fallbacks['global'];
    return {
        lat: fallback.lat,
        lng: fallback.lng,
        areaName: areas[0],
        allAreas: areas,
        region: region
    };
}

// Display alert with area description using geocoding
async function displayAlertWithGeocoding(alert) {
    const properties = alert.properties;
    const areaDesc = properties.areaDesc;
    
    console.log('Processing alert with geocoding:', {
        event: properties.event,
        severity: properties.severity,
        areaDesc: areaDesc
    });
    
    try {
        // Geocode the area description to get coordinates
        const coordinates = await geocodeAreaDescription(areaDesc);
        
        console.log('Geocoding result:', coordinates);
        
        // Create alert marker at geocoded location
        await createAlertMarker(coordinates, properties);
        
        // Create a circle overlay to represent the affected area
        const circle = L.circle([coordinates.lat, coordinates.lng], {
            color: getAlertColor(properties.severity),
            weight: 2,
            fillColor: getAlertColor(properties.severity),
            fillOpacity: 0.3,
            radius: 80000, // 80km radius for county-level alerts
            className: `disaster-area-${properties.severity.toLowerCase()}`
        }).addTo(map);
        
        console.log('Created circle overlay');
        disasterOverlays.push(circle);
        
        // Add pulsing effect for severe alerts
        if (properties.severity === 'Severe' || properties.severity === 'Extreme') {
            circle.setStyle({
                fillOpacity: 0.5,
                weight: 3
            });
        }
        
        // Add popup to circle
        addAlertPopup(circle, properties, coordinates);
        
        // If there are multiple areas, create additional markers for better coverage
        if (coordinates.allAreas && coordinates.allAreas.length > 1) {
            console.log('Creating additional markers for:', coordinates.allAreas.slice(1));
            await createAdditionalAreaMarkers(coordinates.allAreas.slice(1), properties);
        }
        
        console.log('Successfully processed alert with geocoding');
        
    } catch (error) {
        console.error('Error in displayAlertWithGeocoding:', error);
        // Fallback: create a marker at a default location with the alert info
        const defaultLocation = { lat: 35.5653, lng: -97.9289 }; // Oklahoma City
        await createAlertMarker(defaultLocation, properties);
    }
}

// Create additional markers for multiple areas
async function createAdditionalAreaMarkers(areas, properties) {
    for (const area of areas.slice(0, 3)) { // Limit to first 3 additional areas
        try {
            const searchQuery = `${area}, USA`;
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await response.json();
            
            if (data && data.length > 0) {
                const coordinates = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    areaName: area
                };
                
                // Create smaller marker for additional areas
                const smallIcon = L.divIcon({
                    className: 'disaster-alert-marker-small',
                    html: `
                        <div class="alert-marker-content-small" style="
                            background: ${getAlertColor(properties.severity)};
                            color: white;
                            padding: 6px 12px;
                            border-radius: 15px;
                            font-size: 11px;
                            font-weight: bold;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            border: 1px solid white;
                            white-space: nowrap;
                            min-width: 80px;
                            text-align: center;
                            line-height: 1.1;
                        ">
                            ${getAlertIcon(properties.event)}
                        </div>
                    `,
                    iconSize: [80, 30],
                    iconAnchor: [40, 15]
                });
                
                const marker = L.marker([coordinates.lat, coordinates.lng], { icon: smallIcon }).addTo(map);
                alertMarkers.push(marker);
                
                // Add simple popup
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: ${getAlertColor(properties.severity)};">
                            ${properties.event} - ${area}
                        </h4>
                        <p style="margin: 0; font-size: 12px;">
                            <strong>Severity:</strong> ${properties.severity}<br>
                            <strong>Effective:</strong> ${new Date(properties.effective).toLocaleString()}
                        </p>
                    </div>
                `, {
                    maxWidth: 250,
                    className: 'disaster-popup-wrapper'
                });
            }
        } catch (error) {
            console.error(`Error geocoding additional area ${area}:`, error);
        }
    }
}

// Create alert marker
async function createAlertMarker(coordinates, properties) {
    console.log('Creating alert marker:', { coordinates, properties });
    
    // Calculate dynamic width based on text length
    const textLength = properties.event.length;
    const minWidth = 140;
    const maxWidth = 300;
    const dynamicWidth = Math.max(minWidth, Math.min(maxWidth, textLength * 8 + 40));
    
    const alertIcon = L.divIcon({
        className: 'disaster-alert-marker',
        html: `
            <div class="alert-marker-content" style="
                background: ${getAlertColor(properties.severity)};
                color: white;
                padding: 10px 16px;
                border-radius: 25px;
                font-size: 13px;
                font-weight: bold;
                box-shadow: 0 3px 12px rgba(0,0,0,0.4);
                border: 2px solid white;
                white-space: nowrap;
                min-width: ${dynamicWidth}px;
                text-align: center;
                animation: ${properties.severity === 'Severe' || properties.severity === 'Extreme' ? 'pulse 2s infinite' : 'none'};
                line-height: 1.2;
            ">
                ${getAlertIcon(properties.event)} ${properties.event}
            </div>
        `,
        iconSize: [dynamicWidth, 50],
        iconAnchor: [dynamicWidth / 2, 25]
    });
    
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: alertIcon }).addTo(map);
    alertMarkers.push(marker);
    
    console.log('Alert marker created and added to map');
    
    // Add popup to marker
    addAlertPopup(marker, properties, coordinates);
    
    console.log('Popup added to marker');
}

// Add alert popup to layer
function addAlertPopup(layer, properties, coordinates) {
    const popupContent = `
        <div class="disaster-popup" style="min-width: 280px;">
            <div class="popup-header" style="
                background: ${getAlertColor(properties.severity)};
                color: white;
                padding: 12px;
                margin: -12px -12px 12px -12px;
                border-radius: 8px 8px 0 0;
                text-align: center;
            ">
                <h4 style="margin: 0; font-size: 16px;">
                    ${getAlertIcon(properties.event)} ${properties.event}
                </h4>
                <div style="font-size: 12px; opacity: 0.9;">
                    ${properties.severity} Alert
                </div>
            </div>
            
            <div class="popup-content">
                <div class="alert-info">
                    <strong>Area:</strong> ${properties.areaDesc}<br>
                    <strong>Effective:</strong> ${new Date(properties.effective).toLocaleString()}<br>
                    <strong>Expires:</strong> ${new Date(properties.expires).toLocaleString()}
                </div>
                
                <div class="alert-description" style="
                    margin-top: 12px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    font-size: 13px;
                ">
                    ${properties.headline || properties.description}
                </div>
                
                <div class="alert-actions" style="margin-top: 12px; text-align: center;">
                    <button onclick="getEmergencyContacts(${coordinates.lat}, ${coordinates.lng})" 
                            style="
                                background: #E53935;
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 8px;
                            ">
                        🚨 Emergency Contacts
                    </button>
                    <button onclick="getEvacuationRoutes(${coordinates.lat}, ${coordinates.lng})" 
                            style="
                                background: #FF9800;
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 12px;
                            ">
                        🛣️ Evacuation Routes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    layer.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'disaster-popup-wrapper'
    });
}

// Display all alerts in a list format
function displayAllAlerts(alerts) {
    // This could be used to show a list of all active alerts
    console.log('Active alerts:', alerts.length);
    
    // Group alerts by severity
    const severeAlerts = alerts.filter(alert => 
        alert.properties.severity === 'Severe' || 
        alert.properties.severity === 'Extreme'
    );
    
    if (severeAlerts.length > 0) {
        updateEmergencyHeader(severeAlerts[0]);
    }
}

// Update the emergency header with alert information
function updateEmergencyHeader(alert) {
    const properties = alert.properties;
    const emergencyHeader = document.querySelector('.emergency-header');
    const emergencyContent = document.querySelector('.emergency-content');
    const emergencyMain = document.querySelector('.emergency-main');
    const countdown = document.getElementById('countdown');
    
    // Remove no-alerts class if present
    emergencyMain.classList.remove('no-alerts');
    
    // Update the alert message
    const alertMessage = `${properties.event.toUpperCase()} • ${properties.areaDesc} • ${getAlertAction(properties.event)}`;
    emergencyContent.innerHTML = `
        <span class="material-icons tornado-icon">${getAlertIcon(properties.event)}</span>
        <span>${alertMessage}</span>
    `;
    
    // Show countdown and update it
    countdown.style.display = 'block';
    const expires = new Date(properties.expires);
    const now = new Date();
    const timeDiff = expires - now;
    
    if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        countdown.textContent = `Expires in ${hours}h ${minutes}m`;
    } else {
        countdown.textContent = 'Expires soon';
    }
    
    // Change header color based on severity
    emergencyHeader.style.background = `linear-gradient(135deg, ${getAlertColor(properties.severity)} 0%, ${getAlertColor(properties.severity)}dd 100%)`;
}

// Show no alerts message
function showNoAlerts() {
    const emergencyHeader = document.querySelector('.emergency-header');
    const emergencyContent = document.querySelector('.emergency-content');
    const emergencyMain = document.querySelector('.emergency-main');
    const countdown = document.getElementById('countdown');
    
    emergencyMain.classList.add('no-alerts');
    emergencyContent.innerHTML = `
        <button class="back-nav-btn" onclick="window.history.back()" style="margin: 0;">
            <span class="material-icons">arrow_back</span>
        </button>
        <span>NO ACTIVE ALERTS • ALL CLEAR</span>
    `;
    
    countdown.style.display = 'none';
    emergencyHeader.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    emergencyHeader.style.animation = 'none';
}

// Get alert color based on severity
function getAlertColor(severity) {
    switch (severity) {
        case 'Extreme': return '#E53935';
        case 'Severe': return '#FF5722';
        case 'Moderate': return '#FF9800';
        case 'Minor': return '#FFC107';
        default: return '#4CAF50';
    }
}

// Get alert icon based on event type
function getAlertIcon(event) {
    const eventLower = event.toLowerCase();
    
    if (eventLower.includes('tornado')) return 'tornado';
    if (eventLower.includes('hurricane')) return 'storm';
    if (eventLower.includes('flood')) return 'water';
    if (eventLower.includes('fire')) return 'local_fire_department';
    if (eventLower.includes('storm')) return 'thunderstorm';
    if (eventLower.includes('snow')) return 'ac_unit';
    if (eventLower.includes('ice')) return 'ac_unit';
    if (eventLower.includes('wind')) return 'air';
    if (eventLower.includes('heat')) return 'wb_sunny';
    if (eventLower.includes('cold')) return 'ac_unit';
    
    return 'warning';
}

// Get alert action based on event type
function getAlertAction(event) {
    const eventLower = event.toLowerCase();
    
    if (eventLower.includes('tornado')) return 'SEEK SHELTER NOW';
    if (eventLower.includes('hurricane')) return 'EVACUATE IF ORDERED';
    if (eventLower.includes('flood')) return 'MOVE TO HIGHER GROUND';
    if (eventLower.includes('fire')) return 'EVACUATE IMMEDIATELY';
    if (eventLower.includes('storm')) return 'TAKE COVER';
    if (eventLower.includes('heat')) return 'STAY COOL';
    if (eventLower.includes('cold')) return 'STAY WARM';
    
    return 'TAKE PRECAUTIONS';
}



// Family members data
let familyMembers = [];

// Popup management
let popupCallback = null;

function showPopup(title, message, type = 'info', buttons = ['OK']) {
    // Close any existing popups first
    closePopup();
    
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.style.display = 'flex';
    popup.style.zIndex = '10001'; // Higher than map popups
    
    const icon = getPopupIcon(type);
    
    popup.innerHTML = `
        <div class="popup-container">
            <div class="popup-header">
                <div class="popup-icon ${type}">
                    <span class="material-icons">${icon}</span>
                </div>
                <div class="popup-title">${title}</div>
            </div>
            <div class="popup-message">${message}</div>
            <div class="popup-buttons">
                ${buttons.map((button, index) => {
                    let buttonClass = 'secondary';
                    if (index === 0) buttonClass = 'primary';
                    if (button.toLowerCase().includes('cancel') || button.toLowerCase().includes('close')) buttonClass = 'secondary';
                    if (button.toLowerCase().includes('emergency') || button.toLowerCase().includes('disaster')) buttonClass = 'danger';
                    
                    return `<button class="popup-btn ${buttonClass}" onclick="handlePopupButton('${button}', ${selectedLocation ? `{lat: ${selectedLocation.lat}, lng: ${selectedLocation.lng}}` : 'null'})">${button}</button>`;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Close popup when clicking outside
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closePopup();
        }
    });
    
    // Close popup with Escape key
    const handleEscape = function(e) {
        if (e.key === 'Escape') {
            closePopup();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Handle popup button clicks
function handlePopupButton(buttonText, location) {
    if (buttonText === 'Get Disaster Info' && location) {
        getLocationName(location.lat, location.lng).then(locationName => {
            getDisasterInfo(location.lat, location.lng, locationName);
        });
    } else if (buttonText === 'Emergency Contacts' && location) {
        getEmergencyContacts(location.lat, location.lng);
    } else if (buttonText === 'Evacuation Routes' && location) {
        getEvacuationRoutes(location.lat, location.lng);
    } else if (buttonText === 'Cancel' || buttonText === 'Close' || buttonText === 'OK') {
        closePopup();
    }
}

function closePopup() {
    const popups = document.querySelectorAll('.popup-overlay');
    popups.forEach(popup => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    });
    
    // Also close any map popups
    if (map) {
        map.closePopup();
    }
}

function confirmPopup() {
    document.getElementById('popup-overlay').style.display = 'none';
    if (popupCallback) {
        popupCallback(true);
        popupCallback = null;
    }
}

function showConfirmPopup(title, message, callback) {
    popupCallback = callback;
    showPopup(title, message, 'warning', ['Cancel', 'Yes']);
}

function getPopupIcon(type) {
    switch (type) {
        case 'success': return 'check_circle';
        case 'warning': return 'warning';
        case 'error': return 'error';
        default: return 'info';
    }
}

// Add family member functionality
function addFamilyMember() {
    const nameInput = document.getElementById('family-member-name');
    const name = nameInput.value.trim();
    
    if (name === '') {
        showPopup('Error', 'Please enter a name', 'error');
        return;
    }
    
    if (familyMembers.some(member => member.name.toLowerCase() === name.toLowerCase())) {
        showPopup('Error', 'This family member already exists', 'error');
        return;
    }
    
    const newMember = {
        id: Date.now(),
        name: name,
        status: 'safe' // safe, unsafe
    };
    
    familyMembers.push(newMember);
    nameInput.value = '';
    renderFamilyMembers();
    
    // Save to localStorage
    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
    
    showPopup('Success', `${name} has been added to your family list`, 'success');
}

// Render family members list
function renderFamilyMembers() {
    const container = document.getElementById('family-members-list');
    
    if (familyMembers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6); margin: 20px 0;">No family members added yet</p>';
        return;
    }
    
    container.innerHTML = familyMembers.map(member => `
        <div class="family-member-item" data-id="${member.id}">
            <div class="family-member-info">
                <div class="status-icon status-${member.status}">
                    <span class="material-icons">${getStatusIcon(member.status)}</span>
                </div>
                <span class="family-member-name">${member.name}</span>
            </div>
            <div class="family-member-actions">
                <div class="family-status-buttons">
                    <button class="status-btn safe ${member.status === 'safe' ? 'active' : ''}" 
                            onclick="updateFamilyStatus(${member.id}, 'safe')">
                        Safe
                    </button>
                    <button class="status-btn unsafe ${member.status === 'unsafe' ? 'active' : ''}" 
                            onclick="updateFamilyStatus(${member.id}, 'unsafe')">
                        Not Safe
                    </button>
                </div>
                <button class="delete-btn" onclick="deleteFamilyMember(${member.id})" title="Delete ${member.name}">
                    <span class="material-icons" style="font-size: 14px;">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Update family member status
function updateFamilyStatus(memberId, status) {
    const member = familyMembers.find(m => m.id === memberId);
    if (member) {
        member.status = status;
        renderFamilyMembers();
        
        // Save to localStorage
        localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
    }
}

// Delete family member
function deleteFamilyMember(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (member) {
        showConfirmPopup(
            'Delete Family Member', 
            `Are you sure you want to delete ${member.name}?`,
            (confirmed) => {
                if (confirmed) {
                    familyMembers = familyMembers.filter(m => m.id !== memberId);
                    renderFamilyMembers();
                    
                    // Save to localStorage
                    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
                    
                    showPopup('Success', `${member.name} has been removed from your family list`, 'success');
                }
            }
        );
    }
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'safe': return 'check';
        case 'unsafe': return 'close';
        case 'unknown': return 'help';
        default: return 'help';
    }
}

// Load family members from localStorage
function loadFamilyMembers() {
    const saved = localStorage.getItem('familyMembers');
    if (saved) {
        familyMembers = JSON.parse(saved);
        renderFamilyMembers();
    }
}



// Make emergency call
function makeCall(service) {
    const numbers = {
        '911': '911',
        'medical': '911',
        'fire': '911',
        'police': '911'
    };
    
    showConfirmPopup(
        'Emergency Call',
        `Call ${service} emergency services?`,
        (confirmed) => {
            if (confirmed) {
                window.location.href = `tel:${numbers[service]}`;
            }
        }
    );
}

// Shelter data - will be populated based on user location
let nearbyShelters = [];

// Get nearby shelters based on user location
async function getNearbyShelters(lat, lng) {
    try {
        // Using OpenStreetMap Nominatim API to find nearby community centers, schools, etc.
        const radius = 5000; // 5km radius
        const categories = ['community_centre', 'school', 'university', 'hospital', 'place_of_worship'];
        
        let allShelters = [];
        
        for (const category of categories) {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${category}&lat=${lat}&lon=${lng}&radius=${radius}&limit=5`
            );
            
            if (response.ok) {
                const data = await response.json();
                allShelters = allShelters.concat(data.map(place => ({
                    id: place.place_id,
                    name: place.display_name.split(',')[0],
                    address: place.display_name,
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    distance: calculateDistance(lat, lng, parseFloat(place.lat), parseFloat(place.lon)),
                    type: category.replace('_', ' '),
                    capacity: Math.floor(Math.random() * 100) + 20 // Random capacity for demo
                })));
            }
        }
        
        // Sort by distance and take top 3
        nearbyShelters = allShelters
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
        
        renderShelters();
        
    } catch (error) {
        console.error('Error fetching shelters:', error);
        // Fallback to default shelters
        nearbyShelters = [
            {
                id: 'central',
                name: 'Central Community Center',
                address: 'Community Center',
                lat: lat + 0.01,
                lng: lng + 0.01,
                distance: 0.8,
                type: 'community centre',
                capacity: 65
            },
            {
                id: 'north',
                name: 'North Elementary School',
                address: 'Elementary School',
                lat: lat + 0.02,
                lng: lng - 0.01,
                distance: 1.2,
                type: 'school',
                capacity: 45
            },
            {
                id: 'south',
                name: 'South High School',
                address: 'High School',
                lat: lat - 0.01,
                lng: lng + 0.02,
                distance: 2.1,
                type: 'school',
                capacity: 85
            }
        ];
        renderShelters();
    }
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Render shelters in the UI
function renderShelters() {
    const shelterContainer = document.querySelector('.shelter-info');
    if (!shelterContainer) return;
    
    const shelterItems = shelterContainer.querySelectorAll('.shelter-item');
    shelterItems.forEach((item, index) => {
        if (nearbyShelters[index]) {
            const shelter = nearbyShelters[index];
            const nameEl = item.querySelector('.shelter-name');
            const capacityEl = item.querySelector('.shelter-capacity');
            const navigateBtn = item.querySelector('.navigate-btn');
            
            if (nameEl) nameEl.textContent = shelter.name;
            if (capacityEl) {
                capacityEl.textContent = `${shelter.distance.toFixed(1)} miles • ${shelter.capacity}% capacity`;
            }
            if (navigateBtn) {
                navigateBtn.onclick = () => navigateToShelter(shelter.id);
            }
            
            // Update capacity bar
            const capacityFill = item.querySelector('.capacity-fill');
            if (capacityFill) {
                capacityFill.style.width = `${shelter.capacity}%`;
            }
        }
    });
}

// Navigate to shelter
function navigateToShelter(shelterId) {
    const shelter = nearbyShelters.find(s => s.id === shelterId);
    if (shelter) {
        // Open in Google Maps
        const url = `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`;
        window.open(url, '_blank');
    }
}

// Export functions for global access
window.addFamilyMember = addFamilyMember;
window.updateFamilyStatus = updateFamilyStatus;
window.deleteFamilyMember = deleteFamilyMember;
window.makeCall = makeCall;
window.navigateToShelter = navigateToShelter;
window.closePopup = closePopup;
window.confirmPopup = confirmPopup;

// Load family members when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadFamilyMembers();
});

// Show loading indicator
function showLoadingIndicator(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(42, 42, 62, 0.95);
        color: white;
        padding: 20px;
        border-radius: 12px;
        z-index: 10002;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(loadingDiv);
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2A2A3E;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        border-left: 4px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#E53935' : '#1E88E5'};
        z-index: 10003;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}
