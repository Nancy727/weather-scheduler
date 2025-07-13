// Agriculture Alert JavaScript
// OpenWeather API integration for agricultural weather data

// OpenWeather API configuration
const OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// User location
let userLocation = null;

// Initialize agriculture page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Agriculture page loaded');
    getUserLocation();
    initializeAgricultureAlerts();
});

// Get user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Fetch agricultural weather data
                fetchAgriculturalWeatherData(userLocation.lat, userLocation.lng);
                
            },
            (error) => {
                console.log('Location access denied, using default location');
                // Use default location (agricultural area)
                userLocation = { lat: 39.8283, lng: -98.5795 };
                fetchAgriculturalWeatherData(userLocation.lat, userLocation.lng);
            }
        );
    } else {
        console.log('Geolocation not supported');
        userLocation = { lat: 39.8283, lng: -98.5795 };
        fetchAgriculturalWeatherData(userLocation.lat, userLocation.lng);
    }
}

// Fetch comprehensive agricultural weather data
async function fetchAgriculturalWeatherData(lat, lng) {
    try {
        console.log('Fetching agricultural weather data...');
        
        // Fetch current weather
        const weatherResponse = await fetch(
            `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            updateAgriculturalWeatherDisplay(weatherData);
        }
        
        // Fetch 5-day forecast for agricultural planning
        const forecastResponse = await fetch(
            `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();
            updateAgriculturalForecast(forecastData);
        }
        
    } catch (error) {
        console.error('Error fetching agricultural weather data:', error);
        showFallbackAgriculturalData();
    }
}

// Update agricultural weather display
function updateAgriculturalWeatherDisplay(weatherData) {
    const temp = Math.round(weatherData.main.temp);
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const description = weatherData.weather[0].description;
    
    // Update weather elements
    updateWeatherElement('current-temp', `${temp}°C`);
    updateWeatherElement('current-humidity', `${humidity}%`);
    updateWeatherElement('current-wind', `${windSpeed} m/s`);
    updateWeatherElement('current-conditions', description.charAt(0).toUpperCase() + description.slice(1));
    
    // Generate agricultural recommendations
    generateAgriculturalRecommendations(weatherData);
    
    console.log('Agricultural weather updated:', { temp, humidity, windSpeed, description });
}

// Update agricultural forecast
function updateAgriculturalForecast(forecastData) {
    const forecasts = forecastData.list.slice(0, 5); // Next 5 days
    
    // Update forecast elements if they exist
    const forecastContainer = document.querySelector('.forecast-container');
    if (forecastContainer) {
        forecastContainer.innerHTML = forecasts.map((forecast, index) => {
            const date = new Date(forecast.dt * 1000);
            const temp = Math.round(forecast.main.temp);
            const humidity = forecast.main.humidity;
            const description = forecast.weather[0].description;
            
            return `
                <div class="forecast-item">
                    <div class="forecast-date">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="forecast-temp">${temp}°C</div>
                    <div class="forecast-humidity">${humidity}%</div>
                    <div class="forecast-desc">${description}</div>
                </div>
            `;
        }).join('');
    }
}

// Generate agricultural recommendations based on weather
function generateAgriculturalRecommendations(weatherData) {
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    
    let recommendations = [];
    
    // Temperature-based recommendations
    if (temp < 5) {
        recommendations.push('❄️ Protect crops from frost damage');
        recommendations.push('🌱 Delay planting of sensitive crops');
    } else if (temp > 35) {
        recommendations.push('🔥 Increase irrigation frequency');
        recommendations.push('🌿 Provide shade for sensitive plants');
    } else if (temp >= 15 && temp <= 25) {
        recommendations.push('✅ Optimal temperature for most crops');
    }
    
    // Humidity-based recommendations
    if (humidity > 80) {
        recommendations.push('💧 High humidity - watch for fungal diseases');
        recommendations.push('🌬️ Ensure proper ventilation in greenhouses');
    } else if (humidity < 30) {
        recommendations.push('🌵 Low humidity - increase irrigation');
        recommendations.push('💦 Consider misting systems');
    }
    
    // Wind-based recommendations
    if (windSpeed > 10) {
        recommendations.push('💨 High winds - secure structures');
        recommendations.push('🌾 Protect tall crops from wind damage');
    }
    
    // Weather condition recommendations
    if (weatherMain.includes('rain')) {
        recommendations.push('🌧️ Rain expected - delay spraying operations');
        recommendations.push('🚜 Avoid heavy machinery on wet soil');
    } else if (weatherMain.includes('snow')) {
        recommendations.push('❄️ Snow expected - protect winter crops');
    } else if (weatherMain.includes('storm')) {
        recommendations.push('⛈️ Storm warning - secure equipment');
        recommendations.push('🏠 Move livestock to shelter');
    }
    
    // Update recommendations display
    updateRecommendationsDisplay(recommendations);
}

// Update recommendations display
function updateRecommendationsDisplay(recommendations) {
    const recommendationsContainer = document.querySelector('.agricultural-recommendations');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = recommendations.map(rec => 
            `<div class="recommendation-item">${rec}</div>`
        ).join('');
    }
}

// Update weather element helper
function updateWeatherElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Show fallback agricultural data
function showFallbackAgriculturalData() {
    console.log('Using fallback agricultural data');
    
    // Update with fallback values
    updateWeatherElement('current-temp', '22°C');
    updateWeatherElement('current-humidity', '65%');
    updateWeatherElement('current-wind', '5 m/s');
    updateWeatherElement('current-conditions', 'Partly cloudy');
    
    // Show fallback recommendations
    const fallbackRecommendations = [
        '✅ Monitor soil moisture levels',
        '🌱 Check crop health regularly',
        '🌾 Prepare for seasonal changes',
        '💧 Maintain irrigation schedule'
    ];
    
    updateRecommendationsDisplay(fallbackRecommendations);
}

// Initialize agriculture alerts
function initializeAgricultureAlerts() {
    // Set up crop monitoring
    setupCropMonitoring();
    
    // Set up weather alerts
    setupWeatherAlerts();
}

// Setup crop monitoring
function setupCropMonitoring() {
    const crops = ['wheat', 'corn', 'soybeans', 'rice', 'cotton'];
    
    crops.forEach(crop => {
        // Simulate crop health monitoring
        const health = Math.floor(Math.random() * 100) + 50; // 50-100%
        updateCropHealth(crop, health);
    });
}

// Update crop health display
function updateCropHealth(crop, health) {
    const cropElement = document.querySelector(`[data-crop="${crop}"]`);
    if (cropElement) {
        const healthBar = cropElement.querySelector('.health-bar');
        const healthText = cropElement.querySelector('.health-text');
        
        if (healthBar) {
            healthBar.style.width = `${health}%`;
            healthBar.className = `health-bar ${getHealthClass(health)}`;
        }
        
        if (healthText) {
            healthText.textContent = `${health}%`;
        }
    }
}

// Get health class based on percentage
function getHealthClass(health) {
    if (health >= 80) return 'excellent';
    if (health >= 60) return 'good';
    if (health >= 40) return 'fair';
    return 'poor';
}

// Setup weather alerts
function setupWeatherAlerts() {
    // Check for extreme weather conditions
    setInterval(() => {
        if (userLocation) {
            checkExtremeWeatherConditions();
        }
    }, 300000); // Check every 5 minutes
}

// Check for extreme weather conditions
async function checkExtremeWeatherConditions() {
    try {
        const response = await fetch(
            `${OPENWEATHER_BASE_URL}/weather?lat=${userLocation.lat}&lon=${userLocation.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (response.ok) {
            const data = await response.json();
            const temp = data.main.temp;
            const windSpeed = data.wind.speed;
            
            // Generate alerts for extreme conditions
            if (temp < 0) {
                showWeatherAlert('Frost Warning', 'Temperatures below freezing detected. Protect crops immediately.');
            } else if (temp > 35) {
                showWeatherAlert('Heat Warning', 'High temperatures detected. Increase irrigation and provide shade.');
            } else if (windSpeed > 15) {
                showWeatherAlert('Wind Warning', 'High winds detected. Secure equipment and protect structures.');
            }
        }
    } catch (error) {
        console.error('Error checking extreme weather:', error);
    }
}

// Show weather alert
function showWeatherAlert(title, message) {
    const alertContainer = document.querySelector('.weather-alerts');
    if (alertContainer) {
        const alertElement = document.createElement('div');
        alertElement.className = 'weather-alert';
        alertElement.innerHTML = `
            <div class="alert-header">
                <span class="alert-title">${title}</span>
                <span class="alert-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="alert-message">${message}</div>
        `;
        
        alertContainer.appendChild(alertElement);
        
        // Remove alert after 30 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 30000);
    }
}

// Export functions for global access
window.getUserLocation = getUserLocation;
window.fetchAgriculturalWeatherData = fetchAgriculturalWeatherData;
