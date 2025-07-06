import config from './config.js';

// Weather API class
class WeatherAPI {
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

    init() {
        this.setupEventListeners();
        this.initMap();
        this.loadCurrentWeather();
        this.requestNotificationPermission();
        this.generateRecommendations();
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
            this.currentCity = city;
            await this.loadCurrentWeather();
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

    generateRecommendations() {
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

        // Weather recommendation cards with specific styling
        const recommendations = [
            {
                icon: 'fas fa-umbrella',
                title: 'Take Umbrella',
                description: 'Rain expected in the next few hours',
                priority: 'high',
                color: '#3498db',
                bgGradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                iconBg: 'linear-gradient(135deg, #5dade2 0%, #3498db 100%)'
            },
            {
                icon: 'fas fa-tshirt',
                title: 'Wear Light Clothes',
                description: 'Temperature is warm and comfortable',
                priority: 'medium',
                color: '#2ecc71',
                bgGradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                iconBg: 'linear-gradient(135deg, #58d68d 0%, #2ecc71 100%)'
            },
            {
                icon: 'fas fa-sun',
                title: 'Apply Sunscreen',
                description: 'High UV index detected',
                priority: 'high',
                color: '#f39c12',
                bgGradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                iconBg: 'linear-gradient(135deg, #f7dc6f 0%, #f39c12 100%)'
            },
            {
                icon: 'fas fa-wind',
                title: 'Secure Loose Items',
                description: 'Strong winds expected',
                priority: 'medium',
                color: '#9b59b6',
                bgGradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                iconBg: 'linear-gradient(135deg, #bb8fce 0%, #9b59b6 100%)'
            },
            {
                icon: 'fas fa-car',
                title: 'Drive Carefully',
                description: 'Wet road conditions',
                priority: 'high',
                color: '#e74c3c',
                bgGradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                iconBg: 'linear-gradient(135deg, #ec7063 0%, #e74c3c 100%)'
            },
            {
                icon: 'fas fa-home',
                title: 'Stay Indoors',
                description: 'Severe weather warning',
                priority: 'critical',
                color: '#8b0000',
                bgGradient: 'linear-gradient(135deg, #8b0000 0%, #660000 100%)',
                iconBg: 'linear-gradient(135deg, #a52a2a 0%, #8b0000 100%)'
            }
        ];

        recommendationsGrid.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card" style="
                background: linear-gradient(135deg, ${rec.color} 0%, ${rec.color}dd 100%);
                border-radius: 15px;
                padding: 20px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                min-height: 200px;
                color: white;
                position: relative;
                overflow: hidden;
                width: 100%;
                box-sizing: border-box;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="
                        width: 50px;
                        height: 50px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                    ">
                        <i class="${rec.icon}"></i>
                    </div>
                    <div style="
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: ${rec.priority === 'high' ? '#e74c3c' : '#f39c12'};
                        box-shadow: 0 0 10px ${rec.priority === 'high' ? '#e74c3c' : '#f39c12'};
                    "></div>
                </div>
                
                <div style="flex: 1;">
                    <h4 style="
                        font-size: 1.2rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: white;
                    ">${rec.title}</h4>
                    <p style="
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.9);
                        line-height: 1.4;
                        margin-bottom: 0;
                    ">${rec.description}</p>
                </div>
                
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.2);
                ">
                    <span style="
                        padding: 4px 12px;
                        border-radius: 15px;
                        font-size: 0.7rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        background: rgba(255,255,255,0.2);
                        color: white;
                    ">${rec.priority}</span>
                    <div style="
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.8rem;
                    ">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showSuccess(message) {
        // Simple success display - you could enhance this with a toast notification
        alert(message);
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
document.addEventListener('DOMContentLoaded', function() {
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
});