// Smart Agriculture Weather Intelligence System
// Comprehensive weather-driven farming assistant

// Configuration
const OPENWEATHER_API_KEY = '1a86ceeae9887eebaa68668f73b317a1';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Global variables
let userLocation = null;
let weatherData = null;
let forecastData = null;
let farmMap = null;
let userCrops = [];

// Crop database with weather sensitivity
const cropDatabase = {
    'rice': {
        name: 'Rice',
        icon: '🌾',
        optimalTemp: { min: 20, max: 35 },
        optimalHumidity: { min: 60, max: 80 },
        waterNeeds: 'high',
        pests: ['rice blast', 'brown planthopper'],
        diseases: ['bacterial blight', 'tungro virus'],
        weatherRisks: {
            highHumidity: 'Fungal disease risk',
            lowTemp: 'Growth retardation',
            highTemp: 'Sterility risk',
            drought: 'Severe yield loss'
        }
    },
    'wheat': {
        name: 'Wheat',
        icon: '🌾',
        optimalTemp: { min: 15, max: 25 },
        optimalHumidity: { min: 40, max: 70 },
        waterNeeds: 'moderate',
        pests: ['aphids', 'armyworms'],
        diseases: ['rust', 'powdery mildew'],
        weatherRisks: {
            highHumidity: 'Rust and mildew risk',
            lowTemp: 'Frost damage',
            highTemp: 'Heat stress',
            drought: 'Reduced yield'
        }
    },
    'maize': {
        name: 'Maize',
        icon: '🌽',
        optimalTemp: { min: 18, max: 32 },
        optimalHumidity: { min: 50, max: 75 },
        waterNeeds: 'high',
        pests: ['fall armyworm', 'corn borer'],
        diseases: ['southern corn leaf blight'],
        weatherRisks: {
            highHumidity: 'Disease pressure',
            lowTemp: 'Poor germination',
            highTemp: 'Pollen sterility',
            drought: 'Severe yield loss'
        }
    },
    'sugarcane': {
        name: 'Sugarcane',
        icon: '🎋',
        optimalTemp: { min: 20, max: 38 },
        optimalHumidity: { min: 60, max: 85 },
        waterNeeds: 'very high',
        pests: ['sugarcane borer', 'aphids'],
        diseases: ['red rot', 'smut'],
        weatherRisks: {
            highHumidity: 'Disease spread',
            lowTemp: 'Growth reduction',
            highTemp: 'Water stress',
            drought: 'Critical yield loss'
        }
    },
    'tomato': {
        name: 'Tomato',
        icon: '🍅',
        optimalTemp: { min: 18, max: 28 },
        optimalHumidity: { min: 50, max: 70 },
        waterNeeds: 'moderate',
        pests: ['tomato hornworm', 'aphids'],
        diseases: ['early blight', 'late blight'],
        weatherRisks: {
            highHumidity: 'Blight diseases',
            lowTemp: 'Poor fruit set',
            highTemp: 'Blossom drop',
            drought: 'Fruit cracking'
        }
    },
    'potato': {
        name: 'Potato',
        icon: '🥔',
        optimalTemp: { min: 15, max: 25 },
        optimalHumidity: { min: 60, max: 80 },
        waterNeeds: 'moderate',
        pests: ['colorado potato beetle'],
        diseases: ['late blight', 'early blight'],
        weatherRisks: {
            highHumidity: 'Blight risk',
            lowTemp: 'Frost damage',
            highTemp: 'Tuber quality loss',
            drought: 'Reduced tuber size'
        }
    }
};

// Initialize the smart agriculture system
document.addEventListener('DOMContentLoaded', function() {
    console.log('Smart Agriculture Weather Intelligence System loaded');
    
    // Test map container immediately
    setTimeout(() => {
        testMapContainer();
    }, 100);
    
    initializeSystem();
});

// Test map container visibility
function testMapContainer() {
    const mapContainer = document.getElementById('farm-map');
    if (mapContainer) {
        console.log('Map container found:', mapContainer);
        console.log('Map container dimensions:', {
            width: mapContainer.offsetWidth,
            height: mapContainer.offsetHeight,
            style: mapContainer.style.cssText
        });
        
        // Add a visible border for debugging
        mapContainer.style.border = '2px solid red';
        mapContainer.style.backgroundColor = '#e0e0e0';
        
        // Check if Leaflet is loaded
        if (typeof L !== 'undefined') {
            console.log('Leaflet is loaded:', L.version);
        } else {
            console.error('Leaflet is not loaded!');
        }
    } else {
        console.error('Map container not found!');
    }
}

// Initialize the complete system
async function initializeSystem() {
    try {
        await getUserLocation();
        
        // Try to create a simple map first for testing
        try {
            createSimpleTestMap();
        } catch (error) {
            console.error('Simple test map failed:', error);
        }
        
        // Initialize map with retry mechanism
        let mapInitialized = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!mapInitialized && retryCount < maxRetries) {
            try {
                initializeMap();
                mapInitialized = true;
                console.log('Map initialized successfully');
            } catch (error) {
                retryCount++;
                console.error(`Map initialization attempt ${retryCount} failed:`, error);
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                }
            }
        }
        
        if (!mapInitialized) {
            console.error('Failed to initialize map after all retries');
            showToast('Warning', 'Map initialization failed, but other features are available', 'warning');
            
            // Try to create a basic map as fallback
            try {
                createBasicMap();
            } catch (error) {
                console.error('Basic map fallback also failed:', error);
            }
        }
        
        loadUserCrops();
        await fetchWeatherData();
        setupEventListeners();
        
    } catch (error) {
        console.error('Error in system initialization:', error);
        showToast('Error', 'System initialization failed: ' + error.message, 'danger');
    }
}

// Create a simple test map
function createSimpleTestMap() {
    console.log('Creating simple test map...');
    
    const mapContainer = document.getElementById('farm-map');
    if (!mapContainer) {
        console.error('Map container not found for test map');
        return;
    }
    
    // Clear any existing content
    mapContainer.innerHTML = '';
    
    try {
        // Create a very simple map
        const testMap = L.map('farm-map', {
            center: [30.7333, 76.7794], // Ludhiana, India
            zoom: 10
        });
        
        // Add a simple tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(testMap);
        
        // Add a simple marker
        L.marker([30.7333, 76.7794]).addTo(testMap)
            .bindPopup('Test Farm Location')
            .openPopup();
        
        // Add click event to change location
        testMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            console.log('Map clicked at:', lat, lng);
            
            // Update user location
            userLocation = { lat, lng };
            
            // Update map marker
            testMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    testMap.removeLayer(layer);
                }
            });
            
            L.marker([lat, lng]).addTo(testMap)
                .bindPopup(`New Farm Location<br>${lat.toFixed(4)}, ${lng.toFixed(4)}`)
                .openPopup();
            
            // Fetch weather data for new location
            fetchWeatherData();
            
            // Update location display
            updateLocationDisplay();
        });
        
        console.log('Simple test map created successfully');
        
        // Store the test map
        window.testMap = testMap;
        
    } catch (error) {
        console.error('Error creating simple test map:', error);
        
        // Show error in map container
        mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #ffebee; border: 2px solid #f44336; border-radius: 8px; color: #c62828;">
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3>Map Error</h3>
                    <p>${error.message}</p>
                    <button onclick="createSimpleTestMap()" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Retry</button>
                </div>
            </div>
        `;
    }
}

// Get user's current location
async function getUserLocation() {
    try {
        if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            console.log('Location obtained:', userLocation);
            updateLocationDisplay();
        } else {
            throw new Error('Geolocation not supported');
        }
    } catch (error) {
        console.log('Using default location (agricultural area)');
        userLocation = { lat: 30.7333, lng: 76.7794 }; // Ludhiana, India
        updateLocationDisplay();
    }
}

// Update location display
function updateLocationDisplay() {
    const locationElement = document.getElementById('farmLocation');
    if (locationElement) {
        // Reverse geocode to get location name
        reverseGeocode(userLocation.lat, userLocation.lng);
    }
}

// Reverse geocode to get location name
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                const location = data[0];
                const locationName = location.name + (location.state ? `, ${location.state}` : '') + (location.country ? `, ${location.country}` : '');
                document.getElementById('farmLocation').textContent = locationName;
                return locationName;
            }
        }
    } catch (error) {
        console.log('Using coordinates as location name');
        const coordName = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        document.getElementById('farmLocation').textContent = coordName;
        return coordName;
    }
}

// Search for location by name
async function searchLocation() {
    const searchInput = document.getElementById('locationSearch');
    const query = searchInput.value.trim();
    
    if (!query) {
        showToast('Error', 'Please enter a location name', 'warning');
        return;
    }
    
    try {
        console.log('Searching for location:', query);
        
        // Geocode the location
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.length === 0) {
                showToast('Error', 'Location not found', 'danger');
                return;
            }
            
            if (data.length === 1) {
                // Single result, use it directly
                const location = data[0];
                updateLocation(location.lat, location.lon, location.name);
            } else {
                // Multiple results, show selection dialog
                showLocationSelection(data);
            }
        } else {
            showToast('Error', 'Failed to search location', 'danger');
        }
        
    } catch (error) {
        console.error('Error searching location:', error);
        showToast('Error', 'Failed to search location: ' + error.message, 'danger');
    }
}

// Show location selection dialog
function showLocationSelection(locations) {
    const locationList = locations.map((loc, index) => {
        const name = loc.name + (loc.state ? `, ${loc.state}` : '') + (loc.country ? `, ${loc.country}` : '');
        return `${index + 1}. ${name}`;
    }).join('\n');
    
    const selection = prompt(`Multiple locations found. Please select one:\n\n${locationList}\n\nEnter the number (1-${locations.length}):`);
    
    const selectedIndex = parseInt(selection) - 1;
    
    if (selectedIndex >= 0 && selectedIndex < locations.length) {
        const location = locations[selectedIndex];
        const name = location.name + (location.state ? `, ${location.state}` : '') + (location.country ? `, ${location.country}` : '');
        updateLocation(location.lat, location.lon, name);
    }
}

// Update location and refresh data
async function updateLocation(lat, lng, name) {
    console.log('Updating location to:', lat, lng, name);
    
    // Update user location
    userLocation = { lat, lng };
    
    // Update location display
    document.getElementById('farmLocation').textContent = name;
    
    // Update map if it exists
    if (window.testMap) {
        // Clear existing markers
        window.testMap.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                window.testMap.removeLayer(layer);
            }
        });
        
        // Add new marker
        L.marker([lat, lng]).addTo(window.testMap)
            .bindPopup(`Farm Location<br>${name}`)
            .openPopup();
        
        // Center map on new location
        window.testMap.setView([lat, lng], 12);
    }
    
    // Clear search input
    document.getElementById('locationSearch').value = '';
    
    // Fetch new weather data
    await fetchWeatherData();
    
    showToast('Success', `Location updated to ${name}`, 'safe');
}

// Initialize the farm map
function initializeMap() {
    try {
        console.log('Initializing map...');
        console.log('User location:', userLocation);
        
        if (!userLocation) {
            console.error('No user location available for map initialization');
            return;
        }
        
        const mapContainer = document.getElementById('farm-map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        console.log('Map container found, creating map...');
        
        // Create the map
        farmMap = L.map('farm-map', {
            center: [userLocation.lat, userLocation.lng],
            zoom: 15,
            zoomControl: true,
            attributionControl: true
        });
        
        console.log('Map created successfully');
        
        // Add OpenStreetMap layer (most reliable)
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });
        
        // Add satellite layer
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        });
        
        // Add terrain layer
        const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        });
        
        console.log('Tile layers created');
        
        // Layer control
        const baseMaps = {
            "Street": osmLayer,
            "Satellite": satelliteLayer,
            "Terrain": terrainLayer
        };
        
        L.control.layers(baseMaps).addTo(farmMap);
        
        // Start with OpenStreetMap (most reliable)
        osmLayer.addTo(farmMap);
        
        console.log('Base layers added to map');
        
        // Add farm boundary (simulated)
        addFarmBoundary();
        
        // Add crop zones
        addCropZones();
        
        // Add farm marker with custom icon
        const farmIcon = L.divIcon({
            className: 'farm-marker',
            html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏠</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        const farmMarker = L.marker([userLocation.lat, userLocation.lng], { icon: farmIcon }).addTo(farmMap);
        farmMarker.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #4CAF50;">🏠 Your Farm</h4>
                <p style="margin: 5px 0;">📍 Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</p>
                <p style="margin: 5px 0;">🌾 Crops: ${userCrops.length} active</p>
                <p style="margin: 5px 0;">🌤️ Weather monitoring: Active</p>
                <button onclick="showFarmDetails()" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">View Details</button>
            </div>
        `).openPopup();
        
        // Add weather overlay if available
        if (weatherData) {
            addWeatherOverlay();
        }
        
        // Add map controls
        addMapControls();
        
        // Force map refresh
        setTimeout(() => {
            farmMap.invalidateSize();
            console.log('Map size invalidated');
        }, 100);
        
        console.log('Map initialization completed successfully');
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showToast('Error', 'Failed to initialize map: ' + error.message, 'danger');
    }
}

// Fetch comprehensive weather data
async function fetchWeatherData() {
    if (!userLocation) return;
    
    try {
        console.log('Fetching comprehensive weather data for:', userLocation);
        
        // Show loading state
        showLoadingState();
        
        // Fetch current weather
        const weatherResponse = await fetch(
            `${OPENWEATHER_BASE_URL}/weather?lat=${userLocation.lat}&lon=${userLocation.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (weatherResponse.ok) {
            weatherData = await weatherResponse.json();
            console.log('Current weather data:', weatherData);
            updateWeatherDashboard();
        } else {
            console.error('Weather API error:', weatherResponse.status);
            showToast('Error', 'Failed to fetch current weather', 'danger');
        }
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${OPENWEATHER_BASE_URL}/forecast?lat=${userLocation.lat}&lon=${userLocation.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (forecastResponse.ok) {
            forecastData = await forecastResponse.json();
            console.log('Forecast data:', forecastData);
            updateForecastData();
        } else {
            console.error('Forecast API error:', forecastResponse.status);
            showToast('Error', 'Failed to fetch weather forecast', 'danger');
        }
        
        // Fetch air quality data (if available)
        try {
            const airQualityResponse = await fetch(
                `${OPENWEATHER_BASE_URL}/air_pollution?lat=${userLocation.lat}&lon=${userLocation.lng}&appid=${OPENWEATHER_API_KEY}`
            );
            
            if (airQualityResponse.ok) {
                const airQualityData = await airQualityResponse.json();
                console.log('Air quality data:', airQualityData);
                updateAirQualityData(airQualityData);
            }
        } catch (error) {
            console.log('Air quality data not available');
        }
        
        // Generate all recommendations
        generateCropAlerts();
        generateIrrigationRecommendations();
        generateWeeklyTasks();
        generateSowingHarvestAdvisory();
        
        // Hide loading state
        hideLoadingState();
        
        showToast('Success', 'Weather data updated successfully', 'safe');
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showToast('Error', 'Failed to fetch weather data: ' + error.message, 'danger');
        hideLoadingState();
    }
}

// Show loading state
function showLoadingState() {
    const elements = ['currentTemp', 'currentHumidity', 'currentWind', 'rainForecast'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'Loading...';
            element.style.opacity = '0.6';
        }
    });
}

// Hide loading state
function hideLoadingState() {
    const elements = ['currentTemp', 'currentHumidity', 'currentWind', 'rainForecast'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.opacity = '1';
        }
    });
}

// Update air quality data
function updateAirQualityData(airQualityData) {
    if (!airQualityData || !airQualityData.list || !airQualityData.list[0]) return;
    
    const aqi = airQualityData.list[0].main.aqi;
    const components = airQualityData.list[0].components;
    
    // Add air quality to weather alerts if poor
    if (aqi >= 4) {
        const alertsContainer = document.getElementById('weatherAlerts');
        if (alertsContainer) {
            const airQualityAlert = document.createElement('div');
            airQualityAlert.className = 'weather-alert-item';
            airQualityAlert.innerHTML = `
                <div class="alert-icon">🌫️</div>
                <div class="alert-text">Poor air quality (AQI: ${aqi}) - may affect crop health</div>
            `;
            alertsContainer.appendChild(airQualityAlert);
        }
    }
}

// Update weather dashboard
function updateWeatherDashboard() {
    if (!weatherData) return;
    
    const temp = Math.round(weatherData.main.temp);
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const description = weatherData.weather[0].description;
    
    // Update weather elements
    document.getElementById('currentTemp').textContent = `${temp}°C`;
    document.getElementById('currentHumidity').textContent = `${humidity}%`;
    document.getElementById('currentWind').textContent = `${windSpeed} km/h`;
    
    // Update rain forecast
    updateRainForecast();
    
    // Update weather alerts
    updateWeatherAlerts();
}

// Update rain forecast
function updateRainForecast() {
    if (!forecastData) {
        document.getElementById('rainForecast').textContent = 'No data';
        return;
    }
    
    const nextRain = findNextRain();
    if (nextRain) {
        const date = new Date(nextRain.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const rainAmount = nextRain.rain ? Math.round(nextRain.rain['3h'] || 0) : 0;
        document.getElementById('rainForecast').textContent = `${dayName} (${rainAmount}mm)`;
    } else {
        document.getElementById('rainForecast').textContent = 'No rain expected';
    }
}

// Find next rain in forecast
function findNextRain() {
    if (!forecastData) return null;
    
    return forecastData.list.find(forecast => {
        return forecast.weather[0].main.toLowerCase().includes('rain') ||
               (forecast.rain && forecast.rain['3h'] > 0);
    });
}

// Update weather alerts
function updateWeatherAlerts() {
    if (!weatherData || !forecastData) return;
    
    const alertsContainer = document.getElementById('weatherAlerts');
    const alerts = [];
    
    // Check for severe weather conditions
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    
    // Temperature alerts
    if (temp < 5) {
        alerts.push({
            icon: '❄️',
            text: 'Frost risk - protect sensitive crops'
        });
    } else if (temp > 35) {
        alerts.push({
            icon: '🔥',
            text: 'Heat stress - increase irrigation'
        });
    }
    
    // Humidity alerts
    if (humidity > 80) {
        alerts.push({
            icon: '💧',
            text: 'High humidity - fungal disease risk'
        });
    } else if (humidity < 30) {
        alerts.push({
            icon: '🌵',
            text: 'Low humidity - drought conditions'
        });
    }
    
    // Wind alerts
    if (windSpeed > 15) {
        alerts.push({
            icon: '💨',
            text: 'High winds - secure farm equipment'
        });
    }
    
    // Weather condition alerts
    if (weatherMain.includes('storm')) {
        alerts.push({
            icon: '⛈️',
            text: 'Storm warning - move livestock to shelter'
        });
    }
    
    // Render alerts
    if (alerts.length > 0) {
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="weather-alert-item">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-text">${alert.text}</div>
            </div>
        `).join('');
    } else {
        alertsContainer.innerHTML = `
            <div class="weather-alert-item">
                <div class="alert-icon">✅</div>
                <div class="alert-text">Weather conditions are favorable for farming</div>
            </div>
        `;
    }
}

// Update forecast data
function updateForecastData() {
    if (!forecastData) return;
    
    // Update map with weather zones if needed
    if (farmMap) {
        addWeatherOverlay();
    }
}

// Add farm boundary (simulated)
function addFarmBoundary() {
    if (!userLocation || !farmMap) return;
    
    // Create a simulated farm boundary (rectangle around the farm)
    const farmSize = 0.01; // Approximately 1km x 1km
    const farmBounds = [
        [userLocation.lat - farmSize/2, userLocation.lng - farmSize/2],
        [userLocation.lat + farmSize/2, userLocation.lng + farmSize/2]
    ];
    
    const farmBoundary = L.rectangle(farmBounds, {
        color: '#4CAF50',
        weight: 3,
        fillColor: '#4CAF50',
        fillOpacity: 0.1
    }).addTo(farmMap);
    
    farmBoundary.bindPopup(`
        <div style="text-align: center;">
            <h4 style="margin: 0 0 10px 0; color: #4CAF50;">🏠 Farm Boundary</h4>
            <p style="margin: 5px 0;">Area: ~1 km²</p>
            <p style="margin: 5px 0;">Status: Active monitoring</p>
        </div>
    `);
}

// Add crop zones to the map
function addCropZones() {
    if (!userLocation || !farmMap || userCrops.length === 0) return;
    
    const cropColors = {
        'rice': '#8BC34A',
        'wheat': '#FFC107',
        'maize': '#FF9800',
        'sugarcane': '#795548',
        'tomato': '#F44336',
        'potato': '#9C27B0'
    };
    
    userCrops.forEach((crop, index) => {
        const cropInfo = cropDatabase[crop.type];
        if (!cropInfo) return;
        
        // Create crop zone (smaller area within farm boundary)
        const zoneSize = 0.002; // Smaller than farm boundary
        const zoneOffset = (index - userCrops.length/2) * 0.003;
        
        const zoneBounds = [
            [userLocation.lat - zoneSize/2 + zoneOffset, userLocation.lng - zoneSize/2 + zoneOffset],
            [userLocation.lat + zoneSize/2 + zoneOffset, userLocation.lng + zoneSize/2 + zoneOffset]
        ];
        
        const cropZone = L.rectangle(zoneBounds, {
            color: cropColors[crop.type] || '#4CAF50',
            weight: 2,
            fillColor: cropColors[crop.type] || '#4CAF50',
            fillOpacity: 0.3
        }).addTo(farmMap);
        cropZone.cropZone = true;
        
        // Add crop marker
        const cropIcon = L.divIcon({
            className: 'crop-marker',
            html: `<div style="background: ${cropColors[crop.type] || '#4CAF50'}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px;">${cropInfo.icon}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const cropMarker = L.marker([
            userLocation.lat + zoneOffset,
            userLocation.lng + zoneOffset
        ], { icon: cropIcon }).addTo(farmMap);
        cropMarker.cropZone = true;
        
        const riskLevel = calculateCropRisk(crop);
        const riskColor = riskLevel === 'critical' ? '#F44336' : riskLevel === 'risky' ? '#FF9800' : '#4CAF50';
        
        cropZone.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: ${cropColors[crop.type] || '#4CAF50'};">
                    ${cropInfo.icon} ${crop.name}
                </h4>
                <p style="margin: 5px 0;">Type: ${cropInfo.name}</p>
                <p style="margin: 5px 0;">Planted: ${crop.plantedDate.toLocaleDateString()}</p>
                <p style="margin: 5px 0; color: ${riskColor};">
                    Status: ${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                </p>
                <button onclick="viewCropDetails('${crop.type}')" style="background: ${cropColors[crop.type] || '#4CAF50'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">View Details</button>
            </div>
        `);
        
        cropMarker.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: ${cropColors[crop.type] || '#4CAF50'};">
                    ${cropInfo.icon} ${crop.name}
                </h4>
                <p style="margin: 5px 0;">Status: ${riskLevel}</p>
            </div>
        `);
    });
}

// Add weather overlay to map
function addWeatherOverlay() {
    if (!weatherData || !farmMap) return;
    
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    
    // Remove existing weather overlays
    farmMap.eachLayer(layer => {
        if (layer.weatherOverlay) {
            farmMap.removeLayer(layer);
        }
    });
    
    // Add weather zones based on conditions
    if (weatherMain.includes('rain')) {
        const rainCircle = L.circle([userLocation.lat, userLocation.lng], {
            color: '#2196F3',
            weight: 2,
            fillColor: '#2196F3',
            fillOpacity: 0.2,
            radius: 3000
        }).addTo(farmMap);
        rainCircle.weatherOverlay = true;
        rainCircle.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #2196F3;">🌧️ Rain Zone</h4>
                <p style="margin: 5px 0;">Rain detected in your area</p>
                <p style="margin: 5px 0;">Recommendation: Delay outdoor operations</p>
            </div>
        `);
    }
    
    if (temp > 35) {
        const heatCircle = L.circle([userLocation.lat, userLocation.lng], {
            color: '#FF5722',
            weight: 2,
            fillColor: '#FF5722',
            fillOpacity: 0.15,
            radius: 2000
        }).addTo(farmMap);
        heatCircle.weatherOverlay = true;
        heatCircle.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #FF5722;">🔥 Heat Zone</h4>
                <p style="margin: 5px 0;">High temperature: ${temp}°C</p>
                <p style="margin: 5px 0;">Recommendation: Increase irrigation</p>
            </div>
        `);
    }
    
    if (humidity > 80) {
        const humidityCircle = L.circle([userLocation.lat, userLocation.lng], {
            color: '#9C27B0',
            weight: 2,
            fillColor: '#9C27B0',
            fillOpacity: 0.1,
            radius: 2500
        }).addTo(farmMap);
        humidityCircle.weatherOverlay = true;
        humidityCircle.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #9C27B0;">💧 High Humidity Zone</h4>
                <p style="margin: 5px 0;">Humidity: ${humidity}%</p>
                <p style="margin: 5px 0;">Recommendation: Watch for fungal diseases</p>
            </div>
        `);
    }
}

// Add map controls
function addMapControls() {
    if (!farmMap) return;
    
    try {
        // Add scale control
        L.control.scale({
            imperial: true,
            metric: true,
            position: 'bottomleft'
        }).addTo(farmMap);
        
        // Add fullscreen control if available
        if (typeof L.control.fullscreen !== 'undefined') {
            L.control.fullscreen({
                position: 'topleft',
                title: {
                    'false': 'View Fullscreen',
                    'true': 'Exit Fullscreen'
                }
            }).addTo(farmMap);
        }
        
        // Add custom control for farm information
        const farmInfoControl = L.Control.extend({
            options: {
                position: 'topright'
            },
            
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = `
                    <a href="#" title="Farm Information" style="background: #4CAF50; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; display: block;">
                        <i class="fas fa-info-circle"></i>
                    </a>
                `;
                
                L.DomEvent.on(container, 'click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    showFarmDetails();
                });
                
                return container;
            }
        });
        
        farmMap.addControl(new farmInfoControl());
        
        console.log('Map controls added successfully');
        
    } catch (error) {
        console.error('Error adding map controls:', error);
    }
}

// Create basic map fallback
function createBasicMap() {
    try {
        console.log('Creating basic map fallback...');
        
        const mapContainer = document.getElementById('farm-map');
        if (!mapContainer) return;
        
        // Create a simple map with just OpenStreetMap
        farmMap = L.map('farm-map', {
            center: [userLocation.lat, userLocation.lng],
            zoom: 13,
            zoomControl: true
        });
        
        // Add only OpenStreetMap layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(farmMap);
        
        // Add simple farm marker
        L.marker([userLocation.lat, userLocation.lng]).addTo(farmMap)
            .bindPopup('🏠 Your Farm Location')
            .openPopup();
        
        console.log('Basic map created successfully');
        
    } catch (error) {
        console.error('Error creating basic map:', error);
        
        // If even basic map fails, show a placeholder
        const mapContainer = document.getElementById('farm-map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; border-radius: 8px; color: #666;">
                    <div style="text-align: center;">
                        <i class="fas fa-map" style="font-size: 48px; margin-bottom: 16px; color: #ccc;"></i>
                        <p>Map temporarily unavailable</p>
                        <p style="font-size: 12px;">Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</p>
                    </div>
                </div>
            `;
        }
    }
}

// Show farm details modal
function showFarmDetails() {
    const farmInfo = `
        <div style="text-align: left; max-width: 400px;">
            <h3 style="color: #4CAF50; margin-bottom: 15px;">🏠 Farm Information</h3>
            <p><strong>Location:</strong> ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</p>
            <p><strong>Total Crops:</strong> ${userCrops.length}</p>
            <p><strong>Farm Size:</strong> ~1 km²</p>
            <p><strong>Weather Monitoring:</strong> Active</p>
            <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
            
            <h4 style="color: #4CAF50; margin: 15px 0 10px 0;">🌾 Active Crops:</h4>
            ${userCrops.map(crop => {
                const cropInfo = cropDatabase[crop.type];
                const riskLevel = calculateCropRisk(crop);
                return `<p style="margin: 5px 0;">• ${cropInfo.icon} ${crop.name} (${riskLevel})</p>`;
            }).join('')}
        </div>
    `;
    
    alert(farmInfo);
}

// Load user crops from localStorage
function loadUserCrops() {
    const savedCrops = localStorage.getItem('userCrops');
    if (savedCrops) {
        userCrops = JSON.parse(savedCrops);
    } else {
        // Default crops for demonstration
        userCrops = [
            { type: 'rice', name: 'Rice Field 1', plantedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            { type: 'wheat', name: 'Wheat Field 2', plantedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
            { type: 'tomato', name: 'Tomato Garden', plantedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ];
        localStorage.setItem('userCrops', JSON.stringify(userCrops));
    }
    
    renderCropGrid();
}

// Render crop grid
function renderCropGrid() {
    const cropGrid = document.getElementById('cropGrid');
    if (!cropGrid) return;
    
    cropGrid.innerHTML = userCrops.map(crop => {
        const cropInfo = cropDatabase[crop.type];
        const riskLevel = calculateCropRisk(crop);
        
        return `
            <div class="crop-card ${riskLevel}">
                <div class="crop-status ${riskLevel}"></div>
                <div class="crop-name">${cropInfo.icon} ${crop.name}</div>
                <div class="crop-alert" id="alert-${crop.type}">Analyzing weather conditions...</div>
                <div class="crop-actions">
                    <button class="crop-action-btn" onclick="viewCropDetails('${crop.type}')">Details</button>
                    <button class="crop-action-btn" onclick="removeCrop('${crop.type}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

// Calculate crop risk level
function calculateCropRisk(crop) {
    if (!weatherData || !cropDatabase[crop.type]) return 'safe';
    
    const cropInfo = cropDatabase[crop.type];
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    
    let riskScore = 0;
    
    // Temperature risk
    if (temp < cropInfo.optimalTemp.min || temp > cropInfo.optimalTemp.max) {
        riskScore += 2;
    }
    
    // Humidity risk
    if (humidity > cropInfo.optimalHumidity.max) {
        riskScore += 1;
    }
    
    // Weather condition risk
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    if (weatherMain.includes('storm') || weatherMain.includes('thunder')) {
        riskScore += 2;
    }
    
    if (riskScore >= 3) return 'critical';
    if (riskScore >= 1) return 'risky';
    return 'safe';
}

// Generate crop-specific alerts
function generateCropAlerts() {
    if (!weatherData || !forecastData) return;
    
    userCrops.forEach(crop => {
        const cropInfo = cropDatabase[crop.type];
        const alertElement = document.getElementById(`alert-${crop.type}`);
        if (!alertElement) return;
        
        const alerts = [];
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const weatherMain = weatherData.weather[0].main.toLowerCase();
        
        // Temperature-based alerts
        if (temp < cropInfo.optimalTemp.min) {
            alerts.push(cropInfo.weatherRisks.lowTemp);
        } else if (temp > cropInfo.optimalTemp.max) {
            alerts.push(cropInfo.weatherRisks.highTemp);
        }
        
        // Humidity-based alerts
        if (humidity > cropInfo.optimalHumidity.max) {
            alerts.push(cropInfo.weatherRisks.highHumidity);
        }
        
        // Pest and disease alerts based on weather
        if (humidity > 75 && temp > 25) {
            alerts.push(`High ${cropInfo.pests[0]} risk - consider preventive spray`);
        }
        
        // Weather condition alerts
        if (weatherMain.includes('rain') && crop.type === 'tomato') {
            alerts.push('Rain expected - delay harvesting to prevent fruit cracking');
        }
        
        if (alerts.length > 0) {
            alertElement.textContent = alerts[0];
            alertElement.style.color = '#E65100';
        } else {
            alertElement.textContent = 'Conditions favorable';
            alertElement.style.color = '#4CAF50';
        }
    });
}

// Generate irrigation recommendations
function generateIrrigationRecommendations() {
    if (!forecastData) return;
    
    const irrigationStatus = document.getElementById('irrigationStatus');
    if (!irrigationStatus) return;
    
    const nextRain = findNextRain();
    const daysUntilRain = nextRain ? Math.ceil((nextRain.dt * 1000 - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    
    let recommendation = '';
    let icon = 'fas fa-info-circle';
    let color = '#2196F3';
    
    if (nextRain && daysUntilRain <= 1) {
        recommendation = 'Rain expected tomorrow - skip irrigation today to conserve water';
        icon = 'fas fa-cloud-rain';
        color = '#4CAF50';
    } else if (nextRain && daysUntilRain <= 3) {
        recommendation = `Rain expected in ${daysUntilRain} days - reduce irrigation frequency`;
        icon = 'fas fa-cloud';
        color = '#FF9800';
    } else if (!nextRain || daysUntilRain > 7) {
        recommendation = 'No rain forecast for 7+ days - maintain regular irrigation schedule';
        icon = 'fas fa-tint';
        color = '#F44336';
    } else {
        recommendation = 'Weather conditions normal - follow standard irrigation schedule';
    }
    
    irrigationStatus.innerHTML = `
        <div class="irrigation-icon" style="color: ${color}">
            <i class="${icon}"></i>
        </div>
        <div class="irrigation-text">${recommendation}</div>
    `;
}

// Generate weekly farming tasks
function generateWeeklyTasks() {
    if (!forecastData) return;
    
    const weeklyTasks = document.getElementById('weeklyTasks');
    if (!weeklyTasks) return;
    
    const tasks = [];
    const today = new Date();
    
    // Generate tasks for the next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayForecast = getDayForecast(date);
        const task = generateDayTask(dayForecast, date, i);
        
        if (task) {
            tasks.push({
                day: dayName,
                task: task.task,
                priority: task.priority,
                icon: task.icon
            });
        }
    }
    
    // Render tasks
    weeklyTasks.innerHTML = tasks.map(task => `
        <div class="task-item ${task.priority}">
            <div class="task-icon">${task.icon}</div>
            <div class="task-content">
                <div class="task-day">${task.day}</div>
                <div class="task-description">${task.task}</div>
            </div>
        </div>
    `).join('');
}

// Get forecast for specific day
function getDayForecast(date) {
    if (!forecastData) return null;
    
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);
    
    return forecastData.list.find(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        forecastDate.setHours(12, 0, 0, 0);
        return forecastDate.getTime() === targetDate.getTime();
    });
}

// Generate task for specific day
function generateDayTask(forecast, date, dayIndex) {
    if (!forecast) return null;
    
    const temp = forecast.main.temp;
    const humidity = forecast.main.humidity;
    const weatherMain = forecast.weather[0].main.toLowerCase();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Weekend tasks
    if (isWeekend && dayIndex === 0) {
        return {
            task: 'Weekend maintenance: Check irrigation systems and equipment',
            priority: 'safe',
            icon: '🔧'
        };
    }
    
    // Weather-based tasks
    if (weatherMain.includes('rain')) {
        return {
            task: 'Rain expected - postpone spraying and harvesting operations',
            priority: 'warning',
            icon: '🌧️'
        };
    }
    
    if (temp > 30) {
        return {
            task: 'High temperature - increase irrigation frequency for sensitive crops',
            priority: 'warning',
            icon: '🔥'
        };
    }
    
    if (humidity > 80) {
        return {
            task: 'High humidity - apply fungicide to prevent disease spread',
            priority: 'warning',
            icon: '💧'
        };
    }
    
    if (temp < 10) {
        return {
            task: 'Low temperature - protect frost-sensitive crops',
            priority: 'danger',
            icon: '❄️'
        };
    }
    
    // Regular tasks
    const regularTasks = [
        'Monitor crop health and soil moisture levels',
        'Check for pest infestations and apply treatments if needed',
        'Harvest mature crops and prepare for next planting cycle',
        'Apply fertilizers and soil amendments',
        'Maintain farm equipment and irrigation systems'
    ];
    
    return {
        task: regularTasks[dayIndex % regularTasks.length],
        priority: 'safe',
        icon: '✅'
    };
}

// Generate sowing and harvest advisory
function generateSowingHarvestAdvisory() {
    if (!forecastData) return;
    
    const advisoryContainer = document.getElementById('sowingHarvestAdvisory');
    if (!advisoryContainer) return;
    
    const currentMonth = new Date().getMonth();
    const advisories = [];
    
    // Seasonal sowing recommendations
    if (currentMonth >= 5 && currentMonth <= 7) {
        advisories.push({
            icon: '🌾',
            task: 'Rice sowing window: June-July (monsoon season)',
            priority: 'safe'
        });
    }
    
    if (currentMonth >= 10 && currentMonth <= 11) {
        advisories.push({
            icon: '🌾',
            task: 'Wheat sowing window: October-November (post-monsoon)',
            priority: 'safe'
        });
    }
    
    // Weather-based harvest recommendations
    const nextRain = findNextRain();
    if (nextRain) {
        const daysUntilRain = Math.ceil((nextRain.dt * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysUntilRain <= 2) {
            advisories.push({
                icon: '⚠️',
                task: `Harvest crops before rain in ${daysUntilRain} days`,
                priority: 'warning'
            });
        }
    }
    
    // Temperature-based recommendations
    const avgTemp = calculateAverageTemperature();
    if (avgTemp > 35) {
        advisories.push({
            icon: '🔥',
            task: 'High temperatures - delay harvesting to early morning',
            priority: 'warning'
        });
    }
    
    if (avgTemp < 15) {
        advisories.push({
            icon: '❄️',
            task: 'Low temperatures - protect harvested crops from frost',
            priority: 'danger'
        });
    }
    
    // Render advisories
    if (advisories.length > 0) {
        advisoryContainer.innerHTML = advisories.map(advisory => `
            <div class="task-item ${advisory.priority}">
                <div class="task-icon">${advisory.icon}</div>
                <div class="task-content">
                    <div class="task-description">${advisory.task}</div>
                </div>
            </div>
        `).join('');
    } else {
        advisoryContainer.innerHTML = `
            <div class="task-item safe">
                <div class="task-icon">✅</div>
                <div class="task-content">
                    <div class="task-description">Current conditions are optimal for farming operations</div>
                </div>
            </div>
        `;
    }
}

// Calculate average temperature from forecast
function calculateAverageTemperature() {
    if (!forecastData) return 0;
    
    const temperatures = forecastData.list.slice(0, 8).map(forecast => forecast.main.temp);
    return temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
}

// Add new crop
function addNewCrop() {
    const cropType = prompt('Enter crop type (rice, wheat, maize, sugarcane, tomato, potato):');
    if (!cropType || !cropDatabase[cropType]) {
        showToast('Error', 'Invalid crop type', 'danger');
        return;
    }
    
    const cropName = prompt('Enter crop name/field name:');
    if (!cropName) return;
    
    const newCrop = {
        type: cropType,
        name: cropName,
        plantedDate: new Date()
    };
    
    userCrops.push(newCrop);
    localStorage.setItem('userCrops', JSON.stringify(userCrops));
    renderCropGrid();
    generateCropAlerts();
    
    showToast('Success', `${cropDatabase[cropType].name} added successfully`, 'safe');
}

// Remove crop
function removeCrop(cropType) {
    userCrops = userCrops.filter(crop => crop.type !== cropType);
    localStorage.setItem('userCrops', JSON.stringify(userCrops));
    renderCropGrid();
    generateCropAlerts();
    
    showToast('Success', 'Crop removed successfully', 'safe');
}

// View crop details
function viewCropDetails(cropType) {
    const crop = userCrops.find(c => c.type === cropType);
    const cropInfo = cropDatabase[cropType];
    
    if (!crop || !cropInfo) return;
    
    const details = `
Crop: ${cropInfo.name}
Planted: ${crop.plantedDate.toLocaleDateString()}
Optimal Temperature: ${cropInfo.optimalTemp.min}°C - ${cropInfo.optimalTemp.max}°C
Optimal Humidity: ${cropInfo.optimalHumidity.min}% - ${cropInfo.optimalHumidity.max}%
Water Needs: ${cropInfo.waterNeeds}
Common Pests: ${cropInfo.pests.join(', ')}
Common Diseases: ${cropInfo.diseases.join(', ')}
    `;
    
    alert(details);
}

// Refresh weather data
function refreshWeatherData() {
    fetchWeatherData();
    showToast('Info', 'Refreshing weather data...', 'safe');
}

// Setup event listeners
function setupEventListeners() {
    // Auto-refresh weather data every 30 minutes
    setInterval(fetchWeatherData, 30 * 60 * 1000);
    
    // Check for severe weather alerts every 5 minutes
    setInterval(checkSevereWeatherAlerts, 5 * 60 * 1000);
}

// Check for severe weather alerts
function checkSevereWeatherAlerts() {
    if (!weatherData) return;
    
    const temp = weatherData.main.temp;
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    
    if (temp < 0) {
        showToast('Frost Alert', 'Temperatures below freezing - protect crops immediately', 'danger');
    } else if (weatherMain.includes('storm')) {
        showToast('Storm Warning', 'Severe weather approaching - secure farm equipment', 'danger');
    } else if (temp > 40) {
        showToast('Heat Alert', 'Extreme heat - increase irrigation and provide shade', 'warning');
    }
}

// Show toast notification
function showToast(title, message, type = 'safe') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon">
                <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'check-circle'}"></i>
            </div>
            <div class="toast-title">${title}</div>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Update crop zones when crops change
function updateCropZones() {
    if (!farmMap) return;
    
    // Remove existing crop zones
    farmMap.eachLayer(layer => {
        if (layer.cropZone) {
            farmMap.removeLayer(layer);
        }
    });
    
    // Add updated crop zones
    addCropZones();
}

// Add new crop
function addNewCrop() {
    const cropType = prompt('Enter crop type (rice, wheat, maize, sugarcane, tomato, potato):');
    if (!cropType || !cropDatabase[cropType]) {
        showToast('Error', 'Invalid crop type', 'danger');
        return;
    }
    
    const cropName = prompt('Enter crop name/field name:');
    if (!cropName) return;
    
    const newCrop = {
        type: cropType,
        name: cropName,
        plantedDate: new Date()
    };
    
    userCrops.push(newCrop);
    localStorage.setItem('userCrops', JSON.stringify(userCrops));
    renderCropGrid();
    updateCropZones();
    generateCropAlerts();
    
    showToast('Success', `${cropDatabase[cropType].name} added successfully`, 'safe');
}

// Remove crop
function removeCrop(cropType) {
    userCrops = userCrops.filter(crop => crop.type !== cropType);
    localStorage.setItem('userCrops', JSON.stringify(userCrops));
    renderCropGrid();
    updateCropZones();
    generateCropAlerts();
    
    showToast('Success', 'Crop removed successfully', 'safe');
}

// Export functions for global access
window.refreshWeatherData = refreshWeatherData;
window.addNewCrop = addNewCrop;
window.removeCrop = removeCrop;
window.viewCropDetails = viewCropDetails;
window.showFarmDetails = showFarmDetails;
window.createSimpleTestMap = createSimpleTestMap;
window.testMapContainer = testMapContainer;
window.searchLocation = searchLocation;
window.updateLocation = updateLocation; 