import config from './js/config.js';
import { WeatherAPI } from './js/script.js';

const weatherAPI = new WeatherAPI();

// --- Weather Panel Logic ---
async function updateWeatherPanel() {
    const locationEl = document.getElementById('currentLocation');
    const nowEl = document.getElementById('currentWeather');
    const nowIcon = document.getElementById('currentWeatherIcon');
    const upcomingEl = document.getElementById('upcomingWeather');
    const alertsEl = document.getElementById('weatherAlerts');

    let lat, lon, city;
    
    // Check if user has manually set their location
    const savedLocation = localStorage.getItem('userPreferredLocation');
    if (savedLocation) {
        try {
            const locationData = JSON.parse(savedLocation);
            city = locationData.city;
            lat = locationData.lat;
            lon = locationData.lon;
        } catch (error) {
            localStorage.removeItem('userPreferredLocation');
        }
    }
    
    // If no saved location, try geolocation
    if (!city) {
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            
            // Get a better location name using reverse geocoding
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=8&addressdetails=1`
                );
                const data = await response.json();
                
                if (data.display_name) {
                    // Extract a more meaningful location name
                    const parts = data.display_name.split(', ');
                    if (parts.length >= 4) {
                        // Try to get city, state, and country
                        const cityPart = parts[0];
                        const statePart = parts[parts.length - 2];
                        const countryPart = parts[parts.length - 1];
                        city = `${cityPart}, ${statePart}, ${countryPart}`;
                    } else if (parts.length >= 3) {
                        const cityPart = parts[0];
                        const countryPart = parts[parts.length - 1];
                        city = `${cityPart}, ${countryPart}`;
                    } else {
                        city = data.display_name;
                    }
                } else {
                    // Fallback to weather API city name
                    const weather = await weatherAPI.getCurrentWeatherByCoords(lat, lon);
                    city = weather.name;
                }
            } catch (error) {
                // Fallback to weather API city name
                const weather = await weatherAPI.getCurrentWeatherByCoords(lat, lon);
                city = weather.name;
            }
        } catch {
            // Fallback to default city
            city = config.DEFAULT_CITY;
            const coords = await weatherAPI.getCoordinates(city);
            lat = coords.lat;
            lon = coords.lon;
        }
    }
    
    // Clean up the city name if it's too long
    if (city && city.length > 30) {
        const parts = city.split(',');
        city = parts[0] + (parts[1] ? ', ' + parts[1] : '') + (parts[2] ? ', ' + parts[2] : '');
    }
    
    locationEl.textContent = city || 'Unknown Location';
    
    // Add a click handler to allow manual location setting
    locationEl.style.cursor = 'pointer';
    locationEl.title = 'Click to set your location manually';
    locationEl.onclick = () => setManualLocation();

    // Fetch current weather and forecast
    const current = await weatherAPI.getCurrentWeatherByCoords(lat, lon);
    const forecast = await weatherAPI.getForecastByCoords(lat, lon);
    nowEl.textContent = `${current.weather[0].main}, ${Math.round(current.main.temp)}°C`;
    nowIcon.className = weatherAPI.getWeatherIcon(current.weather[0].icon);

    // Find next weather change in forecast
    let nextWeather = null;
    const nowTime = Date.now() / 1000;
    for (const item of forecast.list) {
        if (item.dt > nowTime && item.weather[0].main !== current.weather[0].main) {
            nextWeather = item;
            break;
        }
    }
    if (nextWeather) {
        const date = new Date(nextWeather.dt * 1000);
        const hour = date.getHours();
        upcomingEl.textContent = `${nextWeather.weather[0].main} at ${hour}:00`;
    } else {
        upcomingEl.textContent = 'No major change soon';
    }

    // Fetch alerts (One Call API)
    let alerts = [];
    try {
        const oneCallResp = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${config.OPENWEATHER_API_KEY}&units=metric`);
        const oneCall = await oneCallResp.json();
        alerts = oneCall.alerts || [];
    } catch {}
    alertsEl.innerHTML = alerts.length
        ? alerts.map(a => `<span class="weather-alert"><i class="fas fa-exclamation-triangle"></i> ${a.event}</span>`).join('')
        : '<span class="weather-alert info"><i class="fas fa-info-circle"></i> No active alerts</span>';
}

// Function to set manual location
async function setManualLocation() {
    const location = prompt('Enter your location (e.g., Jamalpur, Bihar, India):');
    if (location && location.trim()) {
        try {
            const coords = await weatherAPI.getCoordinates(location.trim());
            const locationData = {
                city: location.trim(),
                lat: coords.lat,
                lon: coords.lon
            };
            localStorage.setItem('userPreferredLocation', JSON.stringify(locationData));
            
            // Update the weather panel
            await updateWeatherPanel();
            
            // Show success message
            const scheduler = window.weatherScheduler;
            if (scheduler && scheduler.showToast) {
                scheduler.showToast(`📍 Location set to: ${location.trim()}`, 'success');
            }
        } catch (error) {
            alert('Could not find that location. Please try a different format (e.g., "Jamalpur, Bihar" or "Mumbai, India")');
        }
    }
}

document.addEventListener('DOMContentLoaded', updateWeatherPanel);

// ============================================================================
// MAX HEAP IMPLEMENTATION FOR PRIORITY QUEUE
// ============================================================================

class MaxHeap {
    constructor() {
        this.heap = [];
    }
    insert(event) {
        this.heap.push(event);
        this.bubbleUp(this.heap.length - 1);
    }
    extractMax() {
        if (this.heap.length === 0) return null;
        
        const max = this.heap[0];
        const last = this.heap.pop();
        
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        
        return max;
    }
    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }
    getAll() {
        return [...this.heap];
    }
    size() {
        return this.heap.length;
    }
    bubbleUp(index) {
        const parentIndex = Math.floor((index - 1) / 2);
        
        if (parentIndex >= 0 && this.heap[parentIndex].priorityScore < this.heap[index].priorityScore) {
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            this.bubbleUp(parentIndex);
        }
    }
    bubbleDown(index) {
        const leftChildIndex = 2 * index + 1;
        const rightChildIndex = 2 * index + 2;
        let largestIndex = index;

        if (leftChildIndex < this.heap.length && 
            this.heap[leftChildIndex].priorityScore > this.heap[largestIndex].priorityScore) {
            largestIndex = leftChildIndex;
        }

        if (rightChildIndex < this.heap.length && 
            this.heap[rightChildIndex].priorityScore > this.heap[largestIndex].priorityScore) {
            largestIndex = rightChildIndex;
        }

        if (largestIndex !== index) {
            [this.heap[index], this.heap[largestIndex]] = [this.heap[largestIndex], this.heap[index]];
            this.bubbleDown(largestIndex);
        }
    }
    removeById(eventId) {
        const index = this.heap.findIndex(event => event.id === eventId);
        if (index === -1) return false;
        const last = this.heap.pop();
        if (index < this.heap.length) {
            this.heap[index] = last;
            this.bubbleDown(index);
        }
        return true;
    }
}

// ============================================================================
// WEATHER SCHEDULER CLASS WITH ENHANCED PRIORITY QUEUE FUNCTIONALITY
// ============================================================================

class WeatherScheduler {
    constructor() {
        // Initialize data structures
        this.events = [];
        this.eventMap = new Map(); // Track events by ID for quick access
        this.priorityQueue = new MaxHeap(); // Max-heap for priority management
        this.map = null;
        this.currentLocation = null;
        this.markers = [];
        
        this.init();
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    init() {
        this.loadEvents();
        this.initMap();
        this.setupEventListeners();
        this.renderEvents();
    }

    initMap() {
        // Initialize Leaflet map
        this.map = L.map('map').setView([40.7128, -74.0060], 10); // Default to NYC
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add a default marker for current location
        this.addCurrentLocationMarker();
    }

    setupEventListeners() {
        // Form submission
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Get current location button
        const getLocationBtn = document.getElementById('getLocationBtn');
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        }

        // Location input - move map when location is entered
        const locationInput = document.getElementById('eventLocation');
        if (locationInput) {
            let debounceTimer;
            locationInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const location = e.target.value.trim();
                    if (location.length > 3) { // Only search if location has meaningful length
                        this.moveMapToLocation(location);
                    }
                }, 1000); // Wait 1 second after user stops typing
            });
        }

        // Top priority button
        const topPriorityBtn = document.getElementById('topPriorityBtn');
        if (topPriorityBtn) {
            topPriorityBtn.addEventListener('click', () => this.showTopPriorityEvent());
        }

        // Refresh weather button
        const refreshWeatherBtn = document.getElementById('refreshWeatherBtn');
        if (refreshWeatherBtn) {
            refreshWeatherBtn.addEventListener('click', () => this.refreshWeather());
        }

        // Set default date to today
        const dateInput = document.getElementById('eventDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }

        // Event filters
        const filterIds = [
            'filterHighPriority',
            'filterWeatherAffected',
            'filterRisky',
            'filterToday',
            'sortBy'
        ];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.renderEvents());
            }
        });
    }

    // ============================================================================
    // LOCATION AND MAP METHODS
    // ============================================================================

    async getCurrentLocation() {
        const locationBtn = document.getElementById('getLocationBtn');
        const locationInput = document.getElementById('eventLocation');
        const mapInfo = document.getElementById('mapInfo');

        if (!navigator.geolocation) {
            this.showMessage('Geolocation is not supported by this browser.', 'error');
            return;
        }

        // Show loading state
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<span class="location-icon">⏳</span> Getting Location...';
        mapInfo.textContent = 'Getting your current location...';

        try {
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;
            
            this.currentLocation = { lat: latitude, lng: longitude };
            
            // Get address from coordinates
            const address = await this.getAddressFromCoords(latitude, longitude);
            locationInput.value = address;
            
            // Update map
            this.map.setView([latitude, longitude], 13);
            this.addCurrentLocationMarker();
            
            // Update map info
            mapInfo.textContent = `Current location: ${address}`;
            
            this.showMessage('Location obtained successfully!', 'success');
            
        } catch (error) {
            console.error('Error getting location:', error);
            this.showMessage('Unable to get your location. Please enter it manually.', 'error');
            mapInfo.textContent = 'Location access denied. Please enter location manually.';
        } finally {
            // Reset button state
            locationBtn.disabled = false;
            locationBtn.innerHTML = '<span class="location-icon">📍</span> Get Current Location';
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    async getAddressFromCoords(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
                // Extract city and state from the full address
                const parts = data.display_name.split(', ');
                if (parts.length >= 3) {
                    return `${parts[0]}, ${parts[parts.length - 3]}, ${parts[parts.length - 1]}`;
                }
                return data.display_name;
            }
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            console.error('Error getting address:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }

    addCurrentLocationMarker() {
        // Clear existing current location marker
        this.markers.forEach(marker => {
            if (marker.isCurrentLocation) {
                this.map.removeLayer(marker);
            }
        });

        if (this.currentLocation) {
            const currentMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="background: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(this.map);
            
            currentMarker.isCurrentLocation = true;
            this.markers.push(currentMarker);
            
            // Add popup
            currentMarker.bindPopup('<b>Your Current Location</b><br>Click "Get Current Location" to update');
        }
    }

    // ============================================================================
    // ENHANCED PRIORITY CALCULATION
    // ============================================================================

    getPriorityScore(event, weather) {
        let priorityScore = 20; // Lower base score (0-100 scale)
        
        // Event type weights (higher = more important)
        const typeWeights = {
            'emergency': 35,    // Very high priority
            'outdoor': 20,      // High priority (weather dependent)
            'travel': 15,       // Medium-high priority
            'work': 10,         // Medium priority
            'personal': 5,      // Medium-low priority
            'indoor': 0         // Low priority (weather independent)
        };
        
        priorityScore += typeWeights[event.type] || 5;
        
        // Weather impact on priority
        if (weather) {
            const weatherWeights = {
                'stormy': 25,   // Severe weather - high impact
                'snowy': 20,    // Snow - high impact
                'rainy': 15,    // Rain - medium-high impact
                'cloudy': 5,    // Cloudy - low impact
                'sunny': 0      // Sunny - minimal impact
            };
            
            priorityScore += weatherWeights[weather.condition] || 0;
            
            // Additional weather factors (reduced impact)
            if (weather.temperature < 0 || weather.temperature > 35) {
                priorityScore += 5; // Extreme temperatures
            }
            
            if (weather.windSpeed > 20) {
                priorityScore += 8; // High winds
            }
        }
        
        // Time-based priority (events happening soon get higher priority)
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        const now = new Date();
        const hoursUntilEvent = (eventDateTime - now) / (1000 * 60 * 60);
        
        if (hoursUntilEvent < 24) {
            priorityScore += 15; // Within 24 hours
        } else if (hoursUntilEvent < 72) {
            priorityScore += 8; // Within 3 days
        }
        
        // Clamp score between 0 and 100
        priorityScore = Math.max(0, Math.min(100, priorityScore));
        
        return Math.round(priorityScore);
    }

    // ============================================================================
    // FORM HANDLING AND EVENT MANAGEMENT
    // ============================================================================

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const eventData = {
            id: Date.now().toString(),
            title: formData.get('eventTitle') || document.getElementById('eventTitle').value,
            date: formData.get('eventDate') || document.getElementById('eventDate').value,
            time: formData.get('eventTime') || document.getElementById('eventTime').value,
            location: formData.get('eventLocation') || document.getElementById('eventLocation').value,
            type: formData.get('eventType') || document.getElementById('eventType').value,
            description: formData.get('eventDescription') || document.getElementById('eventDescription').value,
            createdAt: new Date().toISOString()
        };

        // Validate required fields
        if (!eventData.title || !eventData.date || !eventData.time || !eventData.location || !eventData.type) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        try {
            // Get coordinates for the event location
            const coords = await weatherAPI.getCoordinates(eventData.location);
            const lat = coords.lat;
            const lon = coords.lon;

            // Fetch forecast for the event date/time
            const forecast = await weatherAPI.getForecastByCoords(lat, lon);
            // Find the forecast closest to the event's date/time
            const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
            let closest = forecast.list[0];
            let minDiff = Math.abs(eventDateTime - new Date(closest.dt * 1000));
            for (const item of forecast.list) {
                const diff = Math.abs(eventDateTime - new Date(item.dt * 1000));
                if (diff < minDiff) {
                    closest = item;
                    minDiff = diff;
                }
            }
            // Store weather info
            eventData.weather = {
                condition: closest.weather[0].main.toLowerCase(),
                description: closest.weather[0].description,
                temperature: Math.round(closest.main.temp),
                humidity: closest.main.humidity,
                windSpeed: Math.round(closest.wind.speed * 3.6) // m/s to km/h
            };

            // Fetch alerts (One Call API)
            let alerts = [];
            try {
                const oneCallResp = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${config.OPENWEATHER_API_KEY}&units=metric`);
                const oneCall = await oneCallResp.json();
                alerts = oneCall.alerts || [];
            } catch {}
            eventData.alerts = alerts;
            eventData.hasWeatherAlert = alerts.length > 0;
            eventData.weatherAlertText = alerts.length > 0 ? alerts.map(a => a.event).join(', ') : '';

            // --- Risk Detection ---
            const riskyTypes = ['outdoor', 'travel', 'emergency'];
            const riskyWeather = ['rainy', 'stormy', 'snowy', 'rain', 'storm', 'snow'];
            eventData.isRisky = false;
            eventData.riskReason = '';
            if (
                riskyTypes.includes(eventData.type) &&
                (riskyWeather.includes(eventData.weather.condition) || eventData.hasWeatherAlert)
            ) {
                eventData.isRisky = true;
                if (eventData.hasWeatherAlert) {
                    eventData.riskReason = 'Weather Alert: ' + eventData.weatherAlertText;
                } else {
                    eventData.riskReason = 'Forecast: ' + eventData.weather.condition;
                }
            }

            // --- Rescheduling Suggestion ---
            eventData.rescheduleSuggestion = null;
            if (eventData.isRisky) {
                // Try to find a safer time in the next 2 days
                const safeWeather = ['clear', 'sunny', 'cloudy'];
                for (const item of forecast.list) {
                    const cond = item.weather[0].main.toLowerCase();
                    if (safeWeather.includes(cond)) {
                        const dt = new Date(item.dt * 1000);
                        if (dt > eventDateTime) {
                            eventData.rescheduleSuggestion = {
                                date: dt.toISOString().split('T')[0],
                                time: dt.toTimeString().slice(0,5),
                                condition: cond,
                                temp: Math.round(item.main.temp)
                            };
                            break;
                        }
                    }
                }
            }

            // Calculate priority score and label
            const priorityScore = this.getPriorityScore(eventData, eventData.weather);
            eventData.priorityScore = priorityScore;
            eventData.priority = this.getPriorityLabel(priorityScore);

        } catch (error) {
            console.error('Error getting weather data:', error);
            eventData.weather = null;
            eventData.priorityScore = 20; // Default base priority
            eventData.priority = 'low';
            eventData.alerts = [];
            eventData.hasWeatherAlert = false;
            eventData.weatherAlertText = '';
        }

        // Add event to all data structures
        this.events.push(eventData);
        this.eventMap.set(eventData.id, eventData);
        this.priorityQueue.insert(eventData);
        
        // Save to localStorage
        this.saveEvents();
        
        // Add marker to map
        this.addEventMarker(eventData);
        
        // Render events
        this.renderEvents();
        
        // Reset form
        e.target.reset();
        document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
        
        this.showMessage(`Event added! Priority: ${eventData.priority}${eventData.hasWeatherAlert ? ' | Alert: ' + eventData.weatherAlertText : ''}`, eventData.hasWeatherAlert ? 'warning' : 'success');
    }

    getPriorityLabel(priorityScore) {
        if (priorityScore >= 75) return 'critical';
        if (priorityScore >= 55) return 'high';
        if (priorityScore >= 35) return 'medium';
        if (priorityScore >= 15) return 'low';
        return 'very-low';
    }

    // ============================================================================
    // WEATHER DATA METHODS
    // ============================================================================

    async getWeatherData(location, date) {
        // This method is now unused, but kept for backward compatibility
        return null;
    }

    // ============================================================================
    // MAP MARKER METHODS
    // ============================================================================

    addEventMarker(event) {
        // For now, use a random location near the current location
        // In a real implementation, you would geocode the location
        let lat, lng;
        
        if (this.currentLocation) {
            // Add some random offset to simulate different locations
            lat = this.currentLocation.lat + (Math.random() - 0.5) * 0.01;
            lng = this.currentLocation.lng + (Math.random() - 0.5) * 0.01;
        } else {
            // Default to NYC area
            lat = 40.7128 + (Math.random() - 0.5) * 0.01;
            lng = -74.0060 + (Math.random() - 0.5) * 0.01;
        }

        const markerColor = this.getPriorityColor(event.priority);
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'event-marker',
                html: `<div style="background: ${markerColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        // Store event ID with marker for later removal
        marker.eventId = event.id;

        // Add popup with event details
        const popupContent = `
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #333;">${event.title}</h4>
                <p style="margin: 4px 0; color: #666;"><strong>Date:</strong> ${event.date}</p>
                <p style="margin: 4px 0; color: #666;"><strong>Time:</strong> ${event.time}</p>
                <p style="margin: 4px 0; color: #666;"><strong>Location:</strong> ${event.location}</p>
                <p style="margin: 4px 0; color: #666;"><strong>Type:</strong> ${event.type}</p>
                <p style="margin: 4px 0; color: #666;"><strong>Priority:</strong> <span style="color: ${markerColor}; font-weight: bold;">${event.priority} (${event.priorityScore})</span></p>
                ${event.weather ? `<p style="margin: 4px 0; color: #666;"><strong>Weather:</strong> ${event.weather.condition}, ${event.weather.temperature}°C</p>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        this.markers.push(marker);
    }

    getPriorityColor(priority) {
        const colors = {
            'critical': '#ff0000',
            'high': '#ff6b6b',
            'medium': '#feca57',
            'low': '#48dbfb',
            'very-low': '#a8e6cf'
        };
        return colors[priority] || '#48dbfb';
    }

    // ============================================================================
    // EVENT RENDERING AND DISPLAY
    // ============================================================================

    renderEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;

        // --- FILTERS ---
        let events = this.priorityQueue.getAll();
        const filterHigh = document.getElementById('filterHighPriority')?.checked;
        const filterWeather = document.getElementById('filterWeatherAffected')?.checked;
        const filterRisky = document.getElementById('filterRisky')?.checked;
        const filterToday = document.getElementById('filterToday')?.checked;
        const sortBy = document.getElementById('sortBy')?.value || 'priority';

        if (filterHigh) events = events.filter(e => e.priority === 'critical' || e.priority === 'high');
        if (filterWeather) events = events.filter(e => e.hasWeatherAlert);
        if (filterRisky) events = events.filter(e => e.isRisky);
        if (filterToday) {
            const today = new Date().toISOString().split('T')[0];
            events = events.filter(e => e.date === today);
        }

        // --- SORT ---
        if (sortBy === 'priority') {
            events = events.sort((a, b) => b.priorityScore - a.priorityScore);
        } else if (sortBy === 'datetime') {
            events = events.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        } else if (sortBy === 'type') {
            events = events.sort((a, b) => a.type.localeCompare(b.type));
        }

        container.innerHTML = events.map(event => this.createEventCard(event)).join('');
        // Add event listeners to delete buttons
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.event-card').dataset.eventId;
                this.deleteEvent(eventId);
            });
        });

        // Update digest
        this.updateWeatherDigest();
    }

    createEventCard(event) {
        const priorityClass = `priority-${event.priority}`;
        const weatherIcon = event.weather ? `<i class="fas fa-${
            event.weather.condition.includes('rain') ? 'cloud-showers-heavy' :
            event.weather.condition.includes('storm') ? 'bolt' :
            event.weather.condition.includes('snow') ? 'snowflake' :
            event.weather.condition.includes('cloud') ? 'cloud' :
            'sun'}"></i>` : '';
        const weatherInfo = event.weather ? 
            `<div class="event-detail">
                ${weatherIcon}
                <span>${event.weather.description}, ${event.weather.temperature}°C</span>
            </div>` : '';
        const alertInfo = event.hasWeatherAlert ?
            `<div class="event-detail">
                <i class="fas fa-exclamation-triangle" style="color:#ff6b6b"></i>
                <span>${event.weatherAlertText}</span>
            </div>` : '';
        const riskIndicator = event.isRisky ?
            `<div class="risk-indicator"><i class="fas fa-exclamation-triangle"></i> Risky: ${event.riskReason}</div>` : '';
        const reschedule = event.rescheduleSuggestion ?
            `<div class="reschedule-suggestion"><i class="fas fa-sync-alt"></i> Reschedule Suggested: ${event.rescheduleSuggestion.date} ${event.rescheduleSuggestion.time} (${event.rescheduleSuggestion.condition}, ${event.rescheduleSuggestion.temp}°C)</div>` : '';

        // Add risky/weather-affected class for styling
        let cardClass = 'event-card';
        if (event.isRisky) cardClass += ' risky';
        else if (event.hasWeatherAlert) cardClass += ' weather-affected';

        return `
            <div class="${cardClass}" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-title">${event.title}</div>
                    <div class="event-priority ${priorityClass}">
                        ${event.priority} (${event.priorityScore})
                    </div>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <i>📅</i>
                        <span>${event.date}</span>
                    </div>
                    <div class="event-detail">
                        <i>🕒</i>
                        <span>${event.time}</span>
                    </div>
                    <div class="event-detail">
                        <i>📍</i>
                        <span>${event.location}</span>
                    </div>
                    <div class="event-detail">
                        <i>🏷️</i>
                        <span>${event.type}</span>
                    </div>
                    ${weatherInfo}
                    ${alertInfo}
                </div>
                ${riskIndicator}
                ${reschedule}
                ${event.description ? `<p style="color: #666; margin: 10px 0; font-style: italic;">${event.description}</p>` : ''}
                <div class="event-actions">
                    <button class="event-btn delete-btn">Delete</button>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // PRIORITY QUEUE INTERFACE METHODS
    // ============================================================================

    showTopPriorityEvent() {
        const topEvent = this.priorityQueue.peek();
        
        if (!topEvent) {
            this.showMessage('No events found!', 'info');
            return;
        }

        const weatherInfo = topEvent.weather ? 
            `\nWeather: ${topEvent.weather.condition}, ${topEvent.weather.temperature}°C` : '';

        const message = `🏆 TOP PRIORITY EVENT 🏆

Title: ${topEvent.title}
Date: ${topEvent.date}
Time: ${topEvent.time}
Location: ${topEvent.location}
Type: ${topEvent.type}
Priority: ${topEvent.priority} (Score: ${topEvent.priorityScore})${weatherInfo}

${topEvent.description ? `Description: ${topEvent.description}` : ''}`;

        alert(message);
    }

    // ============================================================================
    // EVENT MANAGEMENT METHODS
    // ============================================================================

    deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event?')) {
            // Remove from all data structures
            this.events = this.events.filter(event => event.id !== eventId);
            this.eventMap.delete(eventId);
            this.priorityQueue.removeById(eventId);
            
            // Save to localStorage
            this.saveEvents();
            
            // Re-render events
            this.renderEvents();
            
            // Remove marker from map
            this.markers = this.markers.filter(marker => {
                if (marker.eventId === eventId) {
                    this.map.removeLayer(marker);
                    return false;
                }
                return true;
            });
            
            this.showMessage('Event deleted successfully!', 'success');
        }
    }

    async refreshWeather() {
        const btn = document.getElementById('refreshWeatherBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        btn.disabled = true;

        try {
            // Update weather panel
            await updateWeatherPanel();
            
            // Check existing events for new alerts
            let newAlerts = 0;
            let newRisks = 0;
            
            for (const event of this.events) {
                try {
                    const coords = await weatherAPI.getCoordinates(event.location);
                    const forecast = await weatherAPI.getForecastByCoords(coords.lat, coords.lon);
                    
                    // Check for new alerts
                    const oneCallResp = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lon}&appid=${config.OPENWEATHER_API_KEY}&units=metric`);
                    const oneCall = await oneCallResp.json();
                    const alerts = oneCall.alerts || [];
                    
                    if (alerts.length > 0 && !event.hasWeatherAlert) {
                        newAlerts++;
                        event.hasWeatherAlert = true;
                        event.weatherAlertText = alerts.map(a => a.event).join(', ');
                        event.isRisky = true;
                        event.riskReason = 'Weather Alert: ' + event.weatherAlertText;
                    }
                    
                    // Check for new weather risks
                    const eventDateTime = new Date(`${event.date}T${event.time}`);
                    let closest = forecast.list[0];
                    let minDiff = Math.abs(eventDateTime - new Date(closest.dt * 1000));
                    for (const item of forecast.list) {
                        const diff = Math.abs(eventDateTime - new Date(item.dt * 1000));
                        if (diff < minDiff) {
                            closest = item;
                            minDiff = diff;
                        }
                    }
                    
                    const newCondition = closest.weather[0].main.toLowerCase();
                    const riskyWeather = ['rainy', 'stormy', 'snowy', 'rain', 'storm', 'snow'];
                    const riskyTypes = ['outdoor', 'travel', 'emergency'];
                    
                    if (riskyTypes.includes(event.type) && riskyWeather.includes(newCondition) && !event.isRisky) {
                        newRisks++;
                        event.isRisky = true;
                        event.riskReason = 'Forecast: ' + newCondition;
                    }
                    
                } catch (error) {
                    console.error('Error refreshing weather for event:', error);
                }
            }
            
            // Save updated events
            this.saveEvents();
            this.renderEvents();
            
            // Show notifications
            if (newAlerts > 0) {
                this.showToast(`⚠️ ${newAlerts} new weather alert(s) detected!`, 'warning');
            }
            if (newRisks > 0) {
                this.showToast(`⚠️ ${newRisks} event(s) now flagged as risky!`, 'warning');
            }
            if (newAlerts === 0 && newRisks === 0) {
                this.showToast('✅ Weather refreshed - no new alerts', 'success');
            }
            
        } catch (error) {
            console.error('Error refreshing weather:', error);
            this.showToast('❌ Error refreshing weather data', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem;">×</button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // ============================================================================
    // MAP LOCATION METHODS
    // ============================================================================

    async moveMapToLocation(location) {
        try {
            // Show loading state on map
            const mapInfo = document.getElementById('mapInfo');
            if (mapInfo) {
                mapInfo.textContent = `Searching for ${location}...`;
            }

            // Get coordinates for the location
            const coords = await weatherAPI.getCoordinates(location);
            
            // Move map to the location
            this.map.setView([coords.lat, coords.lon], 13);
            
            // Add a temporary marker for the searched location
            this.addLocationMarker(coords.lat, coords.lon, location);
            
            // Update map info
            if (mapInfo) {
                mapInfo.textContent = `Location: ${location}`;
            }
            
            // Show success message
            this.showToast(`📍 Map moved to ${location}`, 'success');
            
        } catch (error) {
            console.error('Error moving map to location:', error);
            const mapInfo = document.getElementById('mapInfo');
            if (mapInfo) {
                mapInfo.textContent = `Could not find location: ${location}`;
            }
            this.showToast(`❌ Could not find location: ${location}`, 'error');
        }
    }

    addLocationMarker(lat, lng, location) {
        // Remove any existing location markers (but keep current location marker)
        this.markers.forEach(marker => {
            if (marker.isLocationMarker) {
                this.map.removeLayer(marker);
            }
        });

        // Add new location marker
        const locationMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'location-marker',
                html: '<div style="background: #48dbfb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            })
        }).addTo(this.map);
        
        locationMarker.isLocationMarker = true;
        locationMarker.bindPopup(`<b>${location}</b><br>Event location`);
        this.markers.push(locationMarker);
        
        // Auto-remove this marker after 10 seconds
        setTimeout(() => {
            if (locationMarker.parentNode) {
                this.map.removeLayer(locationMarker);
                this.markers = this.markers.filter(m => m !== locationMarker);
            }
        }, 10000);
    }

    // ============================================================================
    // STORAGE METHODS
    // ============================================================================

    saveEvents() {
        localStorage.setItem('schedulerEvents', JSON.stringify(this.events));
    }

    loadEvents() {
        const saved = localStorage.getItem('schedulerEvents');
        this.events = saved ? JSON.parse(saved) : [];
        
        // Populate data structures from loaded events
        this.eventMap.clear();
        this.priorityQueue = new MaxHeap();
        
        this.events.forEach(event => {
            // Ensure priority data exists for legacy events
            if (!event.priorityScore) {
                const priorityScore = this.getPriorityScore(event, event.weather);
                event.priorityScore = priorityScore;
                event.priority = this.getPriorityLabel(priorityScore);
            }
            
            this.eventMap.set(event.id, event);
            this.priorityQueue.insert(event);
        });
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    updateWeatherDigest() {
        const safeCount = this.events.filter(e => !e.isRisky && !e.hasWeatherAlert && !e.rescheduleSuggestion).length;
        const riskyCount = this.events.filter(e => e.isRisky).length;
        const reschedCount = this.events.filter(e => e.rescheduleSuggestion).length;
        document.getElementById('safeEventsCount').textContent = safeCount;
        document.getElementById('riskyEventsCount').textContent = riskyCount;
        document.getElementById('rescheduleCount').textContent = reschedCount;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the scheduler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.weatherScheduler = new WeatherScheduler();
}); 