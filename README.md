# WeatherAlertScheduler

A modern, responsive weather monitoring and smart alert scheduling platform that helps you stay informed, prepared, and empowered—whether you're a citizen, farmer, or emergency responder. Built with vanilla JavaScript, HTML, and CSS, featuring real-time weather data from OpenWeather API.

## 🌟 Core Modules

### 1. Weather Dashboard
- **Real-time Weather Data**: Get current weather conditions for any location worldwide
- **5-Day Forecast**: Plan ahead with detailed weather predictions
- **Weather Details**: Temperature, humidity, wind speed, and visibility
- **Location Search**: Search for any city to get weather information
- **Custom Alerts**: Automatic detection of severe weather conditions
- **Interactive Maps**: Visualize weather patterns globally

### 2. Smart Agriculture
- **Crop-specific Alerts**: Weather-driven farming intelligence for optimal crop management
- **Irrigation Planner**: Recommendations based on weather and soil
- **Sowing/Harvest Advisory**: Best times for planting and harvesting
- **Pest & Disease Alerts**: Early warnings for agricultural risks
- **Farm Map**: Visualize your fields, zones, and weather overlays

### 3. Disaster Response
- **Severe Weather Alerts**: Real-time notifications for critical events
- **Evacuation Routes**: Map-based guidance for emergencies
- **Shelter Mapping**: Find nearby safe locations
- **Emergency Notifications**: Stay informed and safe

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- An OpenWeather API key (free tier available)

### Installation

1. **Clone or download the project files**

2. **Get an OpenWeather API Key**
   - Visit [OpenWeather API](https://openweathermap.org/api)
   - Sign up for a free account
   - Get your API key from the dashboard

3. **Configure the API Key**
   - Open `js/smart-agriculture.js` and `js/dashboard.js`
   - Replace the placeholder API key with your actual API key in the code:
   ```js
   const OPENWEATHER_API_KEY = 'your_actual_api_key_here';
   ```

4. **Run the Application**
   - Open `index.html` in your web browser
   - Or serve the files using a local server:
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (if you have http-server installed)
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```

5. **Access the Application**
   - Navigate to `http://localhost:8000` in your browser

## 📱 Usage

### Weather Dashboard
- View current weather and 5-day forecast for any location
- Use the interactive map to explore weather patterns
- Set up custom alerts for severe weather

### Smart Agriculture
- Visualize your farm and crop zones on the map
- Get crop-specific weather alerts and irrigation advice
- Receive pest/disease warnings and weekly farming tasks

### Disaster Response
- Receive real-time severe weather alerts
- View evacuation routes and shelter locations on the map
- Get emergency notifications and safety tips

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Weather Data**: OpenWeather API (free tier)
- **Maps**: Leaflet.js for interactive mapping
- **Animations**: GSAP for smooth animations
- **Scrolling**: Locomotive Scroll for smooth scrolling effects

### API Integration
The application uses the OpenWeather API for:
- Current weather data (`/weather` endpoint)
- 5-day forecast (`/forecast` endpoint)
- Air quality and alerts

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎨 Customization

### Styling
- Modify `css/style.css`, `css/home.css`, and `css/about.css` to change colors, fonts, and layout
- The design uses CSS Grid and Flexbox for responsive layouts

### Functionality
- Add new alert types or modules in the respective JS files
- Extend the dashboard, agriculture, or disaster response features as needed

## 🔒 Privacy & Security

- **Local Storage**: All alert data is stored locally in your browser
- **No Server**: The application runs entirely in your browser
- **API Calls**: Weather data is fetched directly from OpenWeather API
- **No Tracking**: No user data is collected or transmitted

## 🐛 Troubleshooting

### Common Issues

1. **Weather data not loading**
   - Check your internet connection
   - Verify your API key is correct in the JS files
   - Ensure the API key has the necessary permissions

2. **Alerts not working**
   - Check browser notification permissions
   - Verify the alert time is set correctly
   - Ensure the location name is valid

3. **Page not loading properly**
   - Check browser console for JavaScript errors
   - Ensure all files are in the same directory
   - Try serving the files through a local server

### Browser Console Errors
- Check the browser's developer console (F12) for error messages
- Common issues include CORS errors when running locally
- API rate limiting may occur with the free tier

## 📈 Future Enhancements

- [ ] Email notifications for alerts
- [ ] Push notifications for mobile devices
- [ ] Historical weather data
- [ ] Multiple location support
- [ ] Weather widgets for embedding
- [ ] Dark mode toggle
- [ ] Weather radar integration
- [ ] More advanced farm analytics

## 🤝 Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [OpenWeather API](https://openweathermap.org/) for weather data
- [Font Awesome](https://fontawesome.com/) for icons
- [GSAP](https://greensock.com/gsap/) for animations
- [Locomotive Scroll](https://locomotivemtl.github.io/locomotive-scroll/) for smooth scrolling
- [Leaflet.js](https://leafletjs.com/) for interactive maps

## 📞 Support

For support or questions:
- Email: info@weatheralertscheduler.com
- Phone: +1 (555) 123-4567

---

**Note**: This is a demo application. For production use, consider implementing proper error handling, rate limiting, and security measures.  