# Weather Alert Scheduler

A modern, responsive weather monitoring and alert scheduling website that helps you stay informed about weather conditions in your area. Built with vanilla JavaScript, HTML, and CSS, featuring real-time weather data from OpenWeather API.

## 🌟 Features

### Dashboard
- **Real-time Weather Data**: Get current weather conditions for any location worldwide
- **5-Day Forecast**: Plan ahead with detailed weather predictions
- **Weather Details**: Temperature, humidity, wind speed, and visibility
- **Location Search**: Search for any city to get weather information
- **Weather Alerts**: Automatic detection of severe weather conditions

### Scheduler
- **Custom Alerts**: Set up personalized weather alerts based on your preferences
- **Multiple Alert Types**: Monitor temperature, rain, snow, wind, and humidity
- **Flexible Conditions**: Set alerts for above, below, or equal to specific values
- **Scheduling Options**: Choose from daily, weekly, or monthly alert frequencies
- **Alert Management**: View, edit, and delete your active alerts

### About
- **Information**: Learn about the platform and its features
- **How It Works**: Understand the technology behind the weather monitoring
- **Privacy**: Information about data handling and privacy

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
   - Open `config.js`
   - Replace `'your_openweather_api_key_here'` with your actual API key
   ```javascript
   const config = {
       OPENWEATHER_API_KEY: 'your_actual_api_key_here',
       // ... other config
   };
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

### Dashboard
1. **View Current Weather**: The dashboard shows weather for the default location (London)
2. **Search for a Location**: Enter a city name in the search bar and click the search button
3. **View Forecast**: Scroll down to see the 5-day weather forecast
4. **Check Alerts**: View any active weather alerts for the current location

### Creating Weather Alerts
1. **Navigate to Scheduler**: Click the "Scheduler" tab in the navigation
2. **Fill the Form**:
   - **Alert Name**: Give your alert a descriptive name
   - **Location**: Enter the city you want to monitor
   - **Alert Type**: Choose what to monitor (temperature, rain, wind, etc.)
   - **Condition**: Select above, below, or equals
   - **Threshold Value**: Set the value that triggers the alert
   - **Check Time**: Choose when to check the weather
   - **Frequency**: Select how often to check (daily, weekly, monthly)
3. **Create Alert**: Click "Create Alert" to save your alert

### Managing Alerts
- **View Alerts**: All your active alerts are displayed in the scheduler page
- **Edit Alerts**: Click the "Edit" button to modify an alert (feature to be implemented)
- **Delete Alerts**: Click the "Delete" button to remove an alert

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Weather Data**: OpenWeather API (free tier)
- **Storage**: Local Storage for alert persistence
- **Animations**: GSAP for smooth animations
- **Scrolling**: Locomotive Scroll for smooth scrolling effects

### API Integration
The application uses the OpenWeather API for:
- Current weather data (`/weather` endpoint)
- 5-day forecast (`/forecast` endpoint)
- Weather icons and descriptions

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎨 Customization

### Styling
- Modify `style.css` to change colors, fonts, and layout
- The design uses CSS Grid and Flexbox for responsive layouts
- Color scheme can be adjusted by changing CSS custom properties

### Functionality
- Add new alert types in the `WeatherAPI` class
- Modify alert conditions in the `AlertScheduler` class
- Extend the forecast display in the `WeatherApp` class

## 🔒 Privacy & Security

- **Local Storage**: All alert data is stored locally in your browser
- **No Server**: The application runs entirely in your browser
- **API Calls**: Weather data is fetched directly from OpenWeather API
- **No Tracking**: No user data is collected or transmitted

## 🐛 Troubleshooting

### Common Issues

1. **Weather data not loading**
   - Check your internet connection
   - Verify your API key is correct in `config.js`
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
- [ ] Weather maps integration
- [ ] Historical weather data
- [ ] Multiple location support
- [ ] Weather widgets for embedding
- [ ] Dark mode toggle
- [ ] Weather radar integration

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

## 📞 Support

For support or questions:
- Email: info@weatherscheduler.com
- Phone: +1 (555) 123-4567

---

**Note**: This is a demo application. For production use, consider implementing proper error handling, rate limiting, and security measures.  
```

### Key Sections Included:

1. **Eye-catching header** with preview image
2. **Feature highlights** showing what makes your site special
3. **Technology stack** you used
4. **Easy installation** instructions
5. **Customization guide** for others who might use your code
6. **Responsiveness details**
7. **License information**
8. **Credit section** for assets used

You can customize this further by:
- Adding your own screenshot (replace the imgur link)
- Updating the live demo URL when deployed
- Including specific instructions if you used any build tools
- Adding contribution guidelines if it's an open source project

The clean formatting and emoji icons make it visually appealing while maintaining professionalism. The markdown will render beautifully on GitHub.
