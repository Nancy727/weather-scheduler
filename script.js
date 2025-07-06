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
        const alertsList = document.getElementById('activeAlertsList');
        if (!alertsList) return;

        alertsList.innerHTML = this.alerts.length === 0 
            ? '<p style="text-align: center; color: #666;">No active alerts</p>'
            : this.alerts.map(alert => `
                <div class="alert-card">
                    <div class="alert-card-header">
                        <span class="alert-name">${alert.name}</span>
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
}

// Weather App class
class WeatherApp {
    constructor() {
        this.weatherAPI = new WeatherAPI();
        this.currentCity = config.DEFAULT_CITY;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCurrentWeather();
        this.requestNotificationPermission();
    }

    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const locationInput = document.getElementById('locationInput');

        if (searchBtn && locationInput) {
            searchBtn.addEventListener('click', () => this.searchLocation());
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchLocation();
            });
        }

        // Alert form
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    Loading();

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
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

  // Initialize moving text for works section
  initMovingText();

  // Handle video backgrounds for works section
  const elems = document.querySelectorAll(".elem");
  const works = document.querySelector("#works");
  
  elems.forEach(function(elem) {
    elem.addEventListener("mouseenter", function() {
      const videoSrc = elem.getAttribute("data-video");
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
          works.appendChild(video);
        }
        video.src = videoSrc;
        video.play();
        works.style.transition = 'background-image 0.5s ease';
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
});