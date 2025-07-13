import config from './config.js';

// Weather API class
export class WeatherAPI {
    constructor() {
        this.apiKey = config.OPENWEATHER_API_KEY;
        this.baseUrl = config.OPENWEATHER_BASE_URL;
    }

    async getCurrentWeather(city) {
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?q=${city}&appid=${this.apiKey}&units=metric`
            );
            if (!response.ok) throw new Error('City not found');
            return await response.json();
        } catch (error) {
            console.error('Error fetching current weather:', error);
            throw error;
        }
    }

    async getForecast(city) {
        try {
            const response = await fetch(
                `${this.baseUrl}/forecast?q=${city}&appid=${this.apiKey}&units=metric`
            );
            if (!response.ok) throw new Error('City not found');
            return await response.json();
        } catch (error) {
            console.error('Error fetching forecast:', error);
            throw error;
        }
    }

    getWeatherIcon(weatherCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-clouds',
            '04n': 'fas fa-clouds',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        return iconMap[weatherCode] || 'fas fa-cloud';
    }

    async getCoordinates(city) {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        if (!data.length) throw new Error('Location not found');
        return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
    }

    async getCurrentWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            if (!response.ok) throw new Error('Weather data not found');
            return await response.json();
        } catch (error) {
            console.error('Error fetching weather by coordinates:', error);
            throw error;
        }
    }

    async getForecastByCoords(lat, lon) {
        try {
            const response = await fetch(
                `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            if (!response.ok) throw new Error('Forecast data not found');
            return await response.json();
        } catch (error) {
            console.error('Error fetching forecast by coordinates:', error);
            throw error;
        }
    }
}

// Alert Scheduler class
class AlertScheduler {
    constructor() {
        this.alerts = JSON.parse(localStorage.getItem('weatherAlerts')) || [];
        this.weatherAPI = new WeatherAPI();
    }

    addAlert(alert) {
        alert.id = Date.now();
        alert.createdAt = new Date().toISOString();
        alert.status = 'active';
        this.alerts.push(alert);
        this.saveAlerts();
        this.renderAlerts();
        this.scheduleAlert(alert);
    }

    removeAlert(alertId) {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        this.saveAlerts();
        this.renderAlerts();
    }

    saveAlerts() {
        localStorage.setItem('weatherAlerts', JSON.stringify(this.alerts));
    }

    async checkAlert(alert) {
        try {
            const weather = await this.weatherAPI.getCurrentWeather(alert.location);
            let shouldTrigger = false;

            switch (alert.type) {
                case 'temperature':
                    const temp = weather.main.temp;
                    if (alert.condition === 'above' && temp > alert.value) shouldTrigger = true;
                    if (alert.condition === 'below' && temp < alert.value) shouldTrigger = true;
                    if (alert.condition === 'equals' && Math.abs(temp - alert.value) < 1) shouldTrigger = true;
                    break;
                case 'rain':
                    if (weather.rain && weather.rain['1h'] > alert.value) shouldTrigger = true;
                    break;
                case 'wind':
                    if (weather.wind.speed > alert.value) shouldTrigger = true;
                    break;
                case 'humidity':
                    if (alert.condition === 'above' && weather.main.humidity > alert.value) shouldTrigger = true;
                    if (alert.condition === 'below' && weather.main.humidity < alert.value) shouldTrigger = true;
                    break;
            }

            if (shouldTrigger) {
                this.showNotification(alert, weather);
            }
        } catch (error) {
            console.error('Error checking alert:', error);
        }
    }

    scheduleAlert(alert) {
        const [hours, minutes] = alert.time.split(':');
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const timeUntilCheck = scheduledTime.getTime() - now.getTime();
        setTimeout(() => {
            this.checkAlert(alert);
            this.scheduleAlert(alert); // Reschedule for next day
        }, timeUntilCheck);
    }

    showNotification(alert, weather) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Weather Alert: ${alert.name}`, {
                body: `Alert condition met for ${alert.location}`,
                icon: '/favicon.ico'
            });
        } else {
            // Fallback to browser alert
            alert(`Weather Alert: ${alert.name}\nAlert condition met for ${alert.location}`);
        }
    }

    renderAlerts() {
        const alertsGrid = document.getElementById('alertsGrid');
        if (!alertsGrid) return;

        alertsGrid.innerHTML = this.alerts.length === 0 
            ? '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No active alerts</p>'
            : this.alerts.map(alert => `
                <div class="alert-card ${this.getAlertSeverity(alert)}">
                    <div class="alert-header">
                        <span class="alert-title">${alert.name}</span>
                        <span class="alert-status ${alert.status}">${alert.status}</span>
                    </div>
                    <div class="alert-details">
                        <p><strong>Location:</strong> ${alert.location}</p>
                        <p><strong>Type:</strong> ${alert.type} ${alert.condition} ${alert.value}</p>
                        <p><strong>Time:</strong> ${alert.time} (${alert.frequency})</p>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-small btn-edit" onclick="alertScheduler.editAlert(${alert.id})">Edit</button>
                        <button class="btn-small btn-delete" onclick="alertScheduler.removeAlert(${alert.id})">Delete</button>
                    </div>
                </div>
            `).join('');
    }

    getAlertSeverity(alert) {
        // Determine alert severity based on type and value
        if (alert.type === 'temperature' && Math.abs(alert.value) > 30) return 'warning';
        if (alert.type === 'wind' && alert.value > 50) return 'warning';
        if (alert.type === 'rain' && alert.value > 20) return 'warning';
        return 'info';
    }
}

// Weather App class
class WeatherApp {
    constructor() {
        this.weatherAPI = new WeatherAPI();
        this.currentCity = config.DEFAULT_CITY;
        this.map = null;
        this.markers = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initMap();
        await this.loadCurrentWeather();
        this.requestNotificationPermission();
        await this.generateRecommendations();
        this.renderAlerts();
    }

    initMap() {
        // Initialize the map
        this.map = L.map('worldMap').setView([20, 0], 2);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add click event to map
        this.map.on('click', (e) => {
            this.getWeatherByCoordinates(e.latlng.lat, e.latlng.lng);
        });
    }

    async getWeatherByCoordinates(lat, lng) {
        try {
            const response = await fetch(
                `${this.weatherAPI.baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${this.weatherAPI.apiKey}&units=metric`
            );
            if (!response.ok) throw new Error('Location not found');
            const weather = await response.json();
            this.updateCurrentWeather(weather);
            this.addMapMarker(lat, lng, weather);
            await this.generateRecommendations();
        } catch (error) {
            console.error('Error fetching weather by coordinates:', error);
        }
    }

    addMapMarker(lat, lng, weather) {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Create custom icon based on weather
        const iconColor = this.getWeatherIconColor(weather.weather[0].main);
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
        marker.bindPopup(`
            <div style="text-align: center;">
                <h4>${weather.name}</h4>
                <p>${Math.round(weather.main.temp)}°C</p>
                <p>${weather.weather[0].description}</p>
            </div>
        `);
        this.markers.push(marker);
    }

    getWeatherIconColor(weatherMain) {
        const colors = {
            'Clear': '#ffd700',
            'Clouds': '#87ceeb',
            'Rain': '#4682b4',
            'Drizzle': '#4682b4',
            'Thunderstorm': '#483d8b',
            'Snow': '#ffffff',
            'Mist': '#d3d3d3',
            'Fog': '#d3d3d3'
        };
        return colors[weatherMain] || '#87ceeb';
    }

    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const locationInput = document.getElementById('locationInput');
        const currentLocationBtn = document.getElementById('currentLocationBtn');

        if (searchBtn && locationInput) {
            searchBtn.addEventListener('click', () => this.searchLocation());
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchLocation();
            });
        }

        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        }
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    this.getWeatherByCoordinates(latitude, longitude);
                    this.map.setView([latitude, longitude], 10);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    this.showError('Unable to get your location');
                }
            );
        } else {
            this.showError('Geolocation is not supported by this browser');
        }
    }

    // Alert form
    setupAlertForm() {
        const alertForm = document.getElementById('alertForm');
        if (alertForm) {
            alertForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createAlert();
            });
        }
    }

    async searchLocation() {
        const locationInput = document.getElementById('locationInput');
        const city = locationInput.value.trim();
        if (!city) return;
        try {
            // Use geocoding API to get coordinates
            const coords = await this.weatherAPI.getCoordinates(city);
            // Fetch weather by coordinates
            const weather = await this.weatherAPI.getCurrentWeather(`${coords.name},${coords.country}`);
            this.updateCurrentWeather(weather);
            const forecast = await this.weatherAPI.getForecast(`${coords.name},${coords.country}`);
            this.updateForecast(forecast);
            this.updateAlerts(weather);
            // Center and zoom map to city
            if (this.map && coords.lat && coords.lon) {
                this.map.setView([coords.lat, coords.lon], 10, { animate: true });
                this.addMapMarker(coords.lat, coords.lon, weather);
            }
            await this.generateRecommendations();
            locationInput.value = '';
        } catch (error) {
            this.showError('City not found. Please try again.');
        }
    }

    async loadCurrentWeather() {
        try {
            const weather = await this.weatherAPI.getCurrentWeather(this.currentCity);
            const forecast = await this.weatherAPI.getForecast(this.currentCity);
            this.updateCurrentWeather(weather);
            this.updateForecast(forecast);
            this.updateAlerts(weather);
            await this.generateRecommendations();
        } catch (error) {
            this.showError('Failed to load weather data');
        }
    }

    updateCurrentWeather(weather) {
        document.getElementById('currentCity').textContent = weather.name;
        document.getElementById('currentTemp').textContent = Math.round(weather.main.temp);
        document.getElementById('weatherDesc').textContent = weather.weather[0].description;
        document.getElementById('humidity').textContent = weather.main.humidity;
        document.getElementById('windSpeed').textContent = Math.round(weather.wind.speed * 3.6); // Convert to km/h
        document.getElementById('visibility').textContent = (weather.visibility / 1000).toFixed(1);
        
        const weatherIcon = document.getElementById('weatherIcon');
        weatherIcon.className = this.weatherAPI.getWeatherIcon(weather.weather[0].icon);
        // --- Set sunrise/sunset in sun card ---
        if (weather.sys && weather.sys.sunrise && weather.sys.sunset) {
            const sunrise = new Date(weather.sys.sunrise * 1000);
            const sunset = new Date(weather.sys.sunset * 1000);
            const options = { hour: '2-digit', minute: '2-digit', hour12: true };
            document.getElementById('sunriseTime').textContent = sunrise.toLocaleTimeString([], options);
            document.getElementById('sunsetTime').textContent = sunset.toLocaleTimeString([], options);
        }
    }

    updateForecast(forecast) {
        const forecastGrid = document.getElementById('forecastGrid');
        if (!forecastGrid) return;

        // Group forecast by day and get daily averages
        const dailyForecast = this.groupForecastByDay(forecast.list);
        
        forecastGrid.innerHTML = dailyForecast.map(day => `
            <div class="forecast-card">
                <div class="forecast-date">${this.formatDate(day.date)}</div>
                <div class="forecast-temp">${Math.round(day.temp)}°C</div>
                <div class="forecast-desc">${day.description}</div>
                <div class="forecast-icon">
                    <i class="${this.weatherAPI.getWeatherIcon(day.icon)}"></i>
                </div>
            </div>
        `).join('');

        // Prepare data for analytics chart
        const analyticsData = dailyForecast.map(day => ({
            date: day.date,
            temp: day.temp,
            humidity: day.humidity || (day.main && day.main.humidity) || null,
            wind: day.wind || (day.wind_speed || null),
            rain: day.rain || 0
        }));
        this.renderWeatherTrendsChart(analyticsData);
        // Render easy stats for common people
        const statsRow = document.getElementById('weatherStatsRow');
        if (statsRow) {
            if (!analyticsData.length) { statsRow.innerHTML = ''; return; }
            const avgTemp = (analyticsData.reduce((a, b) => a + (b.temp || 0), 0) / analyticsData.length).toFixed(1);
            const maxWind = Math.max(...analyticsData.map(d => d.wind || 0));
            const totalRain = analyticsData.reduce((a, b) => a + (b.rain || 0), 0).toFixed(1);
            const mostHumid = analyticsData.reduce((a, b) => (b.humidity > (a.humidity || 0) ? b : a), analyticsData[0]);
            statsRow.innerHTML = `
                <span class="analytics-stat"><b>Avg Temp:</b> ${avgTemp}°C</span>
                <span class="analytics-stat"><b>Highest Wind:</b> ${maxWind} m/s</span>
                <span class="analytics-stat"><b>Total Rain:</b> ${totalRain} mm</span>
                <span class="analytics-stat"><b>Most Humid Day:</b> ${mostHumid.date.toLocaleDateString('en-US', { weekday: 'short' })} (${mostHumid.humidity}%)</span>
            `;
        }
    }

    groupForecastByDay(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
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

        return Object.values(dailyData).map(day => ({
            ...day,
            temp: day.temp / day.count
        }));
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    updateAlerts(weather) {
        const alertsContainer = document.getElementById('alertsContainer');
        if (!alertsContainer) return;

        // Check for severe weather conditions
        const alerts = [];
        
        if (weather.main.temp > 35) {
            alerts.push({
                title: 'High Temperature Warning',
                message: 'Extreme heat conditions detected. Stay hydrated and avoid prolonged sun exposure.',
                severity: 'severe'
            });
        }

        if (weather.wind.speed > 20) {
            alerts.push({
                title: 'High Wind Warning',
                message: 'Strong winds detected. Secure loose objects and exercise caution.',
                severity: 'moderate'
            });
        }

        if (weather.rain && weather.rain['1h'] > 10) {
            alerts.push({
                title: 'Heavy Rain Alert',
                message: 'Heavy rainfall detected. Be aware of potential flooding.',
                severity: 'moderate'
            });
        }

        alertsContainer.innerHTML = alerts.length === 0 
            ? '<p style="text-align: center; color: #666;">No active weather alerts</p>'
            : alerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            `).join('');
    }

    createAlert() {
        const formData = {
            name: document.getElementById('alertName').value,
            location: document.getElementById('alertLocation').value,
            type: document.getElementById('alertType').value,
            condition: document.getElementById('alertCondition').value,
            value: parseFloat(document.getElementById('alertValue').value),
            time: document.getElementById('alertTime').value,
            frequency: document.getElementById('alertFrequency').value
        };

        alertScheduler.addAlert(formData);
        document.getElementById('alertForm').reset();
        this.showSuccess('Alert created successfully!');
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    showError(message) {
        // Simple error display - you could enhance this with a toast notification
        alert(message);
    }

    async generateRecommendations() {
        const recommendationsGrid = document.getElementById('recommendationsGrid');
        const recommendationTime = document.getElementById('recommendationTime');
        if (!recommendationsGrid) return;

        // Update timestamp
        if (recommendationTime) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            recommendationTime.textContent = `Updated at ${timeString}`;
        }

        // Get current weather and air quality
        let weather = null;
        let airQuality = null;
        try {
            weather = await this.weatherAPI.getCurrentWeather(this.currentCity);
            console.log('DEBUG: Weather object for recommendations:', weather);
            // Air quality API (OpenWeather):
            // Only fetch if we have coordinates
            if (weather.coord) {
                const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${weather.coord.lat}&lon=${weather.coord.lon}&appid=${this.weatherAPI.apiKey}`;
                const aqRes = await fetch(aqUrl);
                if (aqRes.ok) {
                    const aqData = await aqRes.json();
                    airQuality = aqData.list && aqData.list[0] ? aqData.list[0] : null;
                }
            }
        } catch (e) {}

        // Build recommendations based on weather
        const recs = [];
        if (weather) {
            const main = weather.weather[0].main.toLowerCase();
            const desc = weather.weather[0].description.toLowerCase();
            const temp = weather.main.temp;
            const uv = weather.uvi || null; // If available
            // Rain
            if (main.includes('rain') || desc.includes('rain') || weather.rain) {
                recs.push({
                    icon: 'fas fa-umbrella',
                    title: 'Take Umbrella',
                    description: 'Rain expected. Carry an umbrella!',
                    priority: 'high',
                    color: '#3498db'
                });
            }
            // Storm
            if (main.includes('storm') || desc.includes('storm')) {
                recs.push({
                    icon: 'fas fa-home',
                    title: 'Stay Indoors',
                    description: 'Severe weather warning. Stay safe!',
                    priority: 'critical',
                    color: '#8b0000'
                });
            }
            // Clouds
            if (main.includes('cloud')) {
                recs.push({
                    icon: 'fas fa-cloud',
                    title: 'Cloudy Skies',
                    description: 'It is cloudy. Plan accordingly.',
                    priority: 'medium',
                    color: '#7f8c8d'
                });
            }
            // Hot
            if (temp >= 30) {
                recs.push({
                    icon: 'fas fa-tshirt',
                    title: 'Wear Light Clothes',
                    description: 'It is hot outside. Dress lightly.',
                    priority: 'medium',
                    color: '#f39c12'
                });
            }
            // Cold
            if (temp <= 10) {
                recs.push({
                    icon: 'fas fa-thermometer-empty',
                    title: 'Dress Warmly',
                    description: 'It is cold. Wear warm clothes.',
                    priority: 'high',
                    color: '#2980b9'
                });
            }
            // Windy
            if (weather.wind && weather.wind.speed > 10) {
                recs.push({
                    icon: 'fas fa-wind',
                    title: 'Secure Loose Items',
                    description: 'Strong winds expected.',
                    priority: 'medium',
                    color: '#9b59b6'
                });
            }
            // UV
            if (uv && uv > 7) {
                recs.push({
                    icon: 'fas fa-sun',
                    title: 'Apply Sunscreen',
                    description: 'High UV index detected. Protect your skin.',
                    priority: 'high',
                    color: '#f7b731'
                });
            }
        }
        // Default if nothing else
        if (recs.length === 0) {
            recs.push({
                icon: 'fas fa-smile',
                title: 'Enjoy Your Day',
                description: 'Weather looks good. Have a great day!',
                priority: 'medium',
                color: '#2ecc71'
            });
        }
        recommendationsGrid.innerHTML = recs.map(rec => `
            <div class="recommendation-card" style="background: linear-gradient(135deg, ${rec.color} 0%, ${rec.color}dd 100%); border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; min-height: 200px; color: white; position: relative; overflow: hidden; width: 100%; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="${rec.icon}"></i>
                    </div>
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${rec.priority === 'high' ? '#e74c3c' : rec.priority === 'critical' ? '#8b0000' : '#f39c12'}; box-shadow: 0 0 10px ${rec.priority === 'high' ? '#e74c3c' : rec.priority === 'critical' ? '#8b0000' : '#f39c12'};"></div>
                </div>
                <div style="flex: 1;">
                    <h4 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; color: white;">${rec.title}</h4>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.9); line-height: 1.4; margin-bottom: 0;">${rec.description}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <span style="padding: 4px 12px; border-radius: 15px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.2); color: white;">${rec.priority}</span>
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 0.8rem;"><i class="fas fa-arrow-right"></i></div>
                </div>
            </div>
        `).join('');

        // --- Dynamic Alerts for Bad Weather, High UV, Poor Air Quality ---
        const alertsContainer = document.getElementById('alertsGrid');
        if (!alertsContainer) return;
        const alerts = [];
        if (weather) {
            const main = weather.weather[0].main.toLowerCase();
            const desc = weather.weather[0].description.toLowerCase();
            const temp = weather.main.temp;
            // Severe weather
            if (main.includes('storm') || desc.includes('storm')) {
                alerts.push({
                    title: 'Severe Weather Warning',
                    message: 'Stormy conditions detected. Stay indoors and stay safe!',
                    severity: 'severe'
                });
            }
            if (main.includes('rain') && weather.rain && (weather.rain['1h'] > 10 || weather.rain['3h'] > 10)) {
                alerts.push({
                    title: 'Heavy Rain Alert',
                    message: 'Heavy rainfall detected. Be aware of potential flooding.',
                    severity: 'moderate'
                });
            }
            if (weather.wind && weather.wind.speed > 20) {
                alerts.push({
                    title: 'High Wind Warning',
                    message: 'Strong winds detected. Secure loose objects and exercise caution.',
                    severity: 'moderate'
                });
            }
            // High UV
            if (weather.uvi && weather.uvi > 7) {
                alerts.push({
                    title: 'High UV Index',
                    message: 'UV index is very high. Protect your skin and avoid direct sunlight.',
                    severity: 'moderate'
                });
            }
        }
        // Poor air quality
        if (airQuality && airQuality.main && airQuality.main.aqi >= 4) {
            alerts.push({
                title: 'Poor Air Quality',
                message: 'Air quality is poor. Limit outdoor activities.',
                severity: 'moderate'
            });
        }
        alertsContainer.innerHTML = alerts.length === 0
            ? '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No active alerts</p>'
            : alerts.map(alert => `
                <div class="alert-card ${alert.severity}">
                    <div class="alert-header">
                        <span class="alert-title">${alert.title}</span>
                    </div>
                    <div class="alert-details">
                        <p>${alert.message}</p>
                    </div>
                </div>
            `).join('');
    }

    showSuccess(message) {
        // Simple success display - you could enhance this with a toast notification
        alert(message);
    }

    renderWeatherTrendsChart(forecast) {
        if (!window.Chart) {
            setTimeout(() => this.renderWeatherTrendsChart(forecast), 300);
            return;
        }
        const ctx = document.getElementById('weatherTrendsChart').getContext('2d');
        // Prepare data
        const labels = forecast.map(day => day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        const temps = forecast.map(day => Math.round(day.temp));
        const humidity = forecast.map(day => day.humidity || null);
        const wind = forecast.map(day => day.wind || null);
        const rain = forecast.map(day => day.rain || 0);
        // Remove old chart if exists
        if (window.weatherTrendsChartInstance) {
            window.weatherTrendsChartInstance.destroy();
        }
        window.weatherTrendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: temps,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102,126,234,0.08)',
                        yAxisID: 'y',
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#667eea',
                        fill: true
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidity,
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(118,75,162,0.08)',
                        yAxisID: 'y1',
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#764ba2',
                        fill: false
                    },
                    {
                        label: 'Wind (m/s)',
                        data: wind,
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243,156,18,0.08)',
                        yAxisID: 'y2',
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#f39c12',
                        fill: false
                    },
                    {
                        label: 'Rain (mm)',
                        data: rain,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.15)',
                        yAxisID: 'y3',
                        type: 'bar',
                        borderWidth: 1,
                        barPercentage: 0.5,
                        categoryPercentage: 0.5
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Temperature (°C)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Humidity (%)' }
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Wind (m/s)' }
                    },
                    y3: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Rain (mm)' }
                    }
                }
            }
        });
    }
}

// Loading animation
function Loading() {
    var tl = gsap.timeline();
    tl.to("#yellow", {
        top: "-100%",
        delay: 0.5,
        duration: 0.5,
        ease: "expo.out"
    });
    tl.from("#yellow1", {
        top: "100%",
        delay: 0.5,
        duration: 0.5,
        ease: "expo.out"
    }, "anim");
    tl.to("#loader h1", {
        delay: 0.5,
        color: "black"
    }, "anim");

    tl.to("#loader", {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
            document.querySelector("#loader").style.display = "none";
        }
    });

    tl.to("#loader", {
        opacity: 0
    });
}

// Initialize feature cards animations
function initFeatureCards() {
    // Add GSAP animations for feature cards
    gsap.utils.toArray(".feature-card").forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 80%",
                toggleActions: "play none none none",
                scroller: "#main"
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            delay: i * 0.1
        });
    });

    // Add stagger animation for feature tags
    gsap.utils.toArray(".feature-tags span").forEach((tag, i) => {
        gsap.from(tag, {
            scrollTrigger: {
                trigger: tag,
                start: "top 90%",
                toggleActions: "play none none none",
                scroller: "#main"
            },
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            delay: i * 0.05
        });
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Small delay to ensure proper page refresh
    setTimeout(() => {
        Loading();
    }, 100);

    // Ensure proper page refresh functionality
    window.addEventListener('beforeunload', function() {
        // Clean up any scroll instances
        if (window.scroll) {
            window.scroll.destroy();
        }
    });

    // Handle browser refresh button
    window.addEventListener('unload', function() {
        if (window.scroll) {
            window.scroll.destroy();
        }
    });

    // Check if we're on the home page (has locomotive scroll)
    const mainContainer = document.querySelector('#main');
    let scroll;

    if (mainContainer) {
        // Initialize Locomotive Scroll for home page
        scroll = new LocomotiveScroll({
            el: mainContainer,
            smooth: true,
            multiplier: 0.8,
            inertia: 0.8,
            smartphone: {
                smooth: true
            },
            tablet: {
                smooth: true
            }
        });

        // Store scroll instance globally for cleanup
        window.scroll = scroll;

        // Navigation scroll effect and section highlighting for home page
        const updateActiveSection = () => {
            const sections = ['home', 'works', 'gallery'];
            const scrollPosition = scroll.scroll.instance.scroll.y + 200;

            sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.offsetHeight;
                    
                    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                        // Update navigation
                        document.querySelectorAll('.nav-links a').forEach(link => {
                            link.classList.remove('active');
                        });
                        const activeLink = document.querySelector(`a[href="index.html"]`);
                        if (activeLink) {
                            activeLink.classList.add('active');
                        }
                    }
                }
            });

            // Navigation background effect
            const nav = document.getElementById('nav');
            if (scrollPosition > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        };

        // Listen for scroll events with Locomotive Scroll
        scroll.on('scroll', (args) => {
            updateActiveSection();
        });
        
        // Initial call to set correct active state
        updateActiveSection();

        // Handle page refresh properly
        window.addEventListener('keydown', function(e) {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                if (scroll) {
                    scroll.destroy();
                }
            }
        });
    } else {
        // For separate pages, just handle navigation background
        window.addEventListener('scroll', function() {
            const nav = document.getElementById('nav');
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }

    // Initialize weather app and alert scheduler
    window.weatherApp = new WeatherApp();
    window.alertScheduler = new AlertScheduler();
    
    // Render existing alerts
    alertScheduler.renderAlerts();

    // Mobile menu functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const navCloseBtn = document.getElementById('navCloseBtn');
    
    console.log('Menu elements found:', { menuToggle, navLinksContainer, navCloseBtn });
    
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navLinksContainer.classList.toggle('active');
            if (navCloseBtn) {
                navCloseBtn.style.display = navLinksContainer.classList.contains('active') ? 'block' : 'none';
            }
            console.log('Menu toggled:', navLinksContainer.classList.contains('active'));
        });
        
        // Close menu when clicking on a link
        const navLinks = navLinksContainer.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                if (navCloseBtn) navCloseBtn.style.display = 'none';
            });
        });
        
        // Close menu when clicking the close button
        if (navCloseBtn) {
            navCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navLinksContainer.classList.remove('active');
                navCloseBtn.style.display = 'none';
                console.log('Menu closed via close button');
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinksContainer.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinksContainer.classList.remove('active');
                if (navCloseBtn) navCloseBtn.style.display = 'none';
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                navLinksContainer.classList.remove('active');
                if (navCloseBtn) navCloseBtn.style.display = 'none';
            }
        });
    }

    // Initialize feature cards animations
    initFeatureCards();

    // Handle video backgrounds for feature cards
    const featureCards = document.querySelectorAll(".feature-card");
    const works = document.querySelector("#works");
    
    featureCards.forEach(function(card) {
        card.addEventListener("mouseenter", function() {
            const videoSrc = card.getAttribute("data-video");
            if (videoSrc) {
                // Create video element if it doesn't exist
                let video = works.querySelector('video');
                if (!video) {
                    video = document.createElement('video');
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsinline = true;
                    video.style.position = 'absolute';
                    video.style.top = '0';
                    video.style.left = '0';
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    video.style.zIndex = '1';
                    video.style.opacity = '0.3';
                    works.appendChild(video);
                }
                video.src = videoSrc;
                video.play();
                works.style.transition = 'background-image 0.5s ease';
            }
        });

        card.addEventListener("mouseleave", function() {
            const video = works.querySelector('video');
            if (video) {
                video.style.opacity = '0';
                setTimeout(() => {
                    if (video.parentNode) {
                        video.parentNode.removeChild(video);
                    }
                }, 500);
            }
        });
    });

    // GSAP animations for forecast cards
    gsap.utils.toArray(".forecast-card").forEach((container, i) => {
        gsap.from(container, {
            scrollTrigger: {
                trigger: container,
                start: "top 80%",
                toggleActions: "play none none none",
                scroller: "#main"
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            delay: i * 0.1
        });
    });

    // GSAP animations for gallery items
    gsap.utils.toArray(".gallery-item").forEach((item, i) => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: "top 85%",
                toggleActions: "play none none none",
                scroller: "#main"
            },
            opacity: 0,
            y: 60,
            duration: 0.8,
            delay: i * 0.15
        });
    });

    // Stagger animation for gallery tags
    gsap.utils.toArray(".gallery-tags span").forEach((tag, i) => {
        gsap.from(tag, {
            scrollTrigger: {
                trigger: tag,
                start: "top 90%",
                toggleActions: "play none none none",
                scroller: "#main"
            },
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            delay: i * 0.05
        });
    });

    // --- Custom Task Name Dropdown Logic ---
    const taskNameSelect = document.getElementById('taskName');
    const customTaskNameInput = document.getElementById('customTaskName');
    if (taskNameSelect && customTaskNameInput) {
        taskNameSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                customTaskNameInput.style.display = 'block';
                customTaskNameInput.required = true;
            } else {
                customTaskNameInput.style.display = 'none';
                customTaskNameInput.required = false;
                customTaskNameInput.value = '';
            }
        });
    }

    // --- Update Task Form Submission Logic ---
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const taskNameSelect = document.getElementById('taskName');
            const customTaskNameInput = document.getElementById('customTaskName');
            let taskName = taskNameSelect.value;
            if (taskName === 'Other') {
                taskName = customTaskNameInput.value.trim();
                if (!taskName) {
                    customTaskNameInput.focus();
                    return;
                }
            }
            // Collect other fields
            const taskLocation = document.getElementById('taskLocation').value;
            const taskDate = document.getElementById('taskDate').value;
            const taskTime = document.getElementById('taskTime').value;
            const taskNotes = document.getElementById('taskNotes').value;
            // Save task (replace with your storage logic)
            const tasks = JSON.parse(localStorage.getItem('userTasks') || '[]');
            tasks.push({
                id: Date.now(),
                name: taskName,
                location: taskLocation,
                date: taskDate,
                time: taskTime,
                notes: taskNotes
            });
            localStorage.setItem('userTasks', JSON.stringify(tasks));
            // Optionally, update the task list UI
            if (typeof renderTasks === 'function') renderTasks();
            taskForm.reset();
            customTaskNameInput.style.display = 'none';
        });
    }

    // --- Render Tasks List ---
    function renderTasks() {
        const tasks = JSON.parse(localStorage.getItem('userTasks') || '[]');
        const list = document.getElementById('activeTasksList');
        if (!list) return;
        if (tasks.length === 0) {
            list.innerHTML = '<p style="color:#666;text-align:center;">No scheduled tasks</p>';
            return;
        }
        list.innerHTML = tasks.map(task => `
            <div class="task-card">
                <div><b>${task.name}</b> <span style="color:#888;font-size:0.95em;">(${task.location})</span></div>
                <div>${task.date} ${task.time}</div>
                <div style="color:#666;font-size:0.95em;">${task.notes || ''}</div>
            </div>
        `).join('');
    }

    // Initial render
    renderTasks();

    if (window.weatherApp.generateRecommendations) {
        await window.weatherApp.generateRecommendations();
    }

    const loginBtn = document.getElementById('loginNavBtn');
    if (!loginBtn) return;
    if (localStorage.getItem('isLoggedIn') === 'true') {
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        loginBtn.href = '#';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            window.location.reload();
        };
    } else {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
});

// --- Main Analytics Functions ---
async function runSchedulerAnalytics() {
  // Only run on scheduler.html
  if (!window.location.pathname.endsWith('scheduler.html')) return;

  // 1. Get all user tasks from localStorage
  const tasks = JSON.parse(localStorage.getItem('userTasks')) || [];

  // 2. Get weather for next 7 days for each task location
  const locations = [...new Set(tasks.map(t => t.location))];
  const weatherAPI = new WeatherAPI();
  const forecasts = {};
  for (const loc of locations) {
    try {
      forecasts[loc] = await weatherAPI.getForecast(loc);
    } catch (e) {
      forecasts[loc] = null;
    }
  }

  // 3. Perfect Day Generator: Rank next 7 days by weather quality
  const dayScores = [];
  for (let i = 0; i < 7; i++) {
    let score = 0, count = 0, summary = [];
    for (const loc of locations) {
      const forecast = forecasts[loc];
      if (!forecast) continue;
      // Find forecast for this day (group by date)
      const day = new Date();
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().slice(0, 10);
      const dayData = forecast.list.filter(item => item.dt_txt.startsWith(dayStr));
      if (dayData.length === 0) continue;
      // Average temp, rain, wind
      let temp = 0, rain = 0, wind = 0;
      dayData.forEach(item => {
        temp += item.main.temp;
        wind += item.wind.speed;
        rain += (item.rain ? (item.rain['3h'] || 0) : 0);
      });
      temp /= dayData.length;
      wind /= dayData.length;
      rain /= dayData.length;
      // Score: prefer mild temp, low rain, low wind
      let s = 100 - Math.abs(temp-22)*2 - rain*10 - wind*2;
      if (s < 0) s = 0;
      score += s;
      count++;
      summary.push(`${loc}: ${Math.round(temp)}°C, ${rain>0?rain.toFixed(1)+'mm rain, ':''}${Math.round(wind)}km/h wind`);
    }
    if (count > 0) {
      dayScores.push({
        date: new Date(Date.now() + i*86400000),
        score: Math.round(score/count),
        summary: summary.join(' | ')
      });
    }
  }
  dayScores.sort((a,b) => b.score - a.score);
  // Render day ranking
  const dayRankingList = document.getElementById('dayRankingList');
  if (dayRankingList) {
    dayRankingList.innerHTML = dayScores.map(day => `
      <div class="day-ranking-card">
        <div class="day">${day.date.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}</div>
        <div class="score">${day.score}</div>
        <div class="summary">${day.summary}</div>
      </div>
    `).join('');
  }

  // 4. Group tasks by geohash for map clustering
  const eventGroups = {};
  for (const task of tasks) {
    // For demo, fake geocode: random lat/lng per city
    let lat = 0, lng = 0;
    if (task.location === 'New York') { lat=40.71; lng=-74.01; }
    else if (task.location === 'London') { lat=51.51; lng=-0.13; }
    else if (task.location === 'Tokyo') { lat=35.68; lng=139.76; }
    else { lat = 20 + Math.random()*40; lng = -100 + Math.random()*200; }
    task._lat = lat; task._lng = lng;
    const hash = getGeohash(lat, lng, 2);
    if (!eventGroups[hash]) eventGroups[hash] = [];
    eventGroups[hash].push(task);
  }

  // 5. Heatmap: count tasks per location
  const heatmapData = Object.values(eventGroups).map(group => {
    const { _lat, _lng } = group[0];
    return { lat: _lat, lng: _lng, count: group.length };
  });

  // 6. Overcrowded spots: groups with >2 tasks
  const overcrowded = Object.values(eventGroups).filter(g => g.length > 2);
  const overcrowdedList = document.getElementById('overcrowdedList');
  if (overcrowdedList) {
    overcrowdedList.innerHTML = overcrowded.length === 0 ? '<p>No overcrowded spots!</p>' :
      overcrowded.map(group => `
        <div class="overcrowded-card">
          <div><b>Location:</b> ${group[0].location}</div>
          <div><b>Tasks:</b> ${group.length}</div>
        </div>
      `).join('');
  }

  // 7. Map: show task markers and heatmap
  if (window.L && document.getElementById('eventMap')) {
    const map = L.map('eventMap').setView([30, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Markers
    heatmapData.forEach(d => {
      L.circleMarker([d.lat, d.lng], {
        radius: 10 + d.count*2,
        color: '#e74c3c',
        fillColor: '#e74c3c',
        fillOpacity: 0.5
      }).addTo(map).bindPopup(`${d.count} task(s)`);
    });
    // Heatmap (simple: colored circles)
  }

  // 8. Travel Route Optimizer: suggest for each task
  const routeOptimizer = document.getElementById('routeOptimizer');
  if (routeOptimizer) {
    routeOptimizer.innerHTML = tasks.map(task => {
      // For demo, randomize route segments and weather
      const segments = [
        { from: 'Home', to: task.location, mode: 'bike', weather: Math.random() > 0.7 ? 'flooded' : 'clear' },
        { from: task.location, to: 'Home', mode: 'bus', weather: 'clear' }
      ];
      const bad = segments.find(s => s.weather !== 'clear');
      return `<div class="route-card">
        <div><b>Task:</b> ${task.name} (${task.location})</div>
        <div><b>Route:</b> ${segments.map(s => `${s.from} → ${s.to} (${s.mode}, ${s.weather})`).join('<br>')}</div>
        ${bad ? `<div style='color:#e74c3c;'><b>Suggestion:</b> ${bad.mode==='bike'&&bad.weather==='flooded' ? 'Bike path flooded → take bus' : 'Check route conditions'}</div>` : '<div style=\"color:#2ecc71;\"><b>All clear!</b></div>'}
      </div>`;
    }).join('');
  }
}

// Add Chart.js via CDN if not present
if (!window.Chart) {
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(chartScript);
}

// Add this function to render weather trends chart
function renderWeatherTrendsChart(forecast) {
    if (!window.Chart) {
        setTimeout(() => renderWeatherTrendsChart(forecast), 300);
        return;
    }
    const ctx = document.getElementById('weatherTrendsChart').getContext('2d');
    // Prepare data
    const labels = forecast.map(day => day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    const temps = forecast.map(day => Math.round(day.temp));
    const humidity = forecast.map(day => day.humidity || null);
    const wind = forecast.map(day => day.wind || null);
    const rain = forecast.map(day => day.rain || 0);
    // Remove old chart if exists
    if (window.weatherTrendsChartInstance) {
        window.weatherTrendsChartInstance.destroy();
    }
    window.weatherTrendsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temps,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.08)',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#667eea',
                    fill: true
                },
                {
                    label: 'Humidity (%)',
                    data: humidity,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118,75,162,0.08)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#764ba2',
                    fill: false
                },
                {
                    label: 'Wind (m/s)',
                    data: wind,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243,156,18,0.08)',
                    yAxisID: 'y2',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#f39c12',
                    fill: false
                },
                {
                    label: 'Rain (mm)',
                    data: rain,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.15)',
                    yAxisID: 'y3',
                    type: 'bar',
                    borderWidth: 1,
                    barPercentage: 0.5,
                    categoryPercentage: 0.5
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temperature (°C)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Humidity (%)' }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Wind (m/s)' }
                },
                y3: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Rain (mm)' }
                }
            }
        }
    });
}
