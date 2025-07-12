# CSS Structure Documentation

## Overview
The Weather Alert Scheduler project now uses a modular CSS architecture with separate CSS files for different pages and components. This approach improves maintainability, reduces file sizes, and makes the codebase more organized.

## CSS Files Structure

### 1. `common.css` - Shared Styles
**Purpose**: Contains styles that are used across all pages
**Includes**:
- Font face declarations
- Global reset and base styles
- Navigation styles
- Footer styles
- Loader/loading screen styles
- Common utility classes
- Responsive breakpoints for mobile navigation

### 2. `home.css` - Home Page Styles
**Purpose**: Styles specific to the home page (index.html)
**Includes**:
- Hero section styles
- Works/Features section with animated elements
- Gallery/Portfolio section with masonry layout
- Responsive design for home page elements

### 3. `dashboard.css` - Dashboard Page Styles
**Purpose**: Styles specific to the dashboard page (dashboard.html)
**Includes**:
- Full-width map section styles
- Weather cards and current weather display
- Forecast section with grid layout
- Recommendations section with cards
- Alerts section styling
- Map controls and legend
- Responsive design for dashboard elements

### 4. `scheduler.css` - Scheduler Page Styles
**Purpose**: Styles specific to the scheduler page (scheduler.html)
**Includes**:
- Alert form styling
- Active alerts list
- Form controls and buttons
- Responsive design for scheduler elements

### 5. `about.css` - About Page Styles
**Purpose**: Styles specific to the about page (about.html)
**Includes**:
- Hero section with stats
- Mission section styling
- Features showcase grid
- How it works section
- Technology stack display
- Contact section styling
- Responsive design for about page elements

## HTML File Updates

Each HTML file now includes the appropriate CSS files:

### index.html
```html
<link rel="stylesheet" href="common.css" />
<link rel="stylesheet" href="home.css" />
```

### dashboard.html
```html
<link rel="stylesheet" href="common.css" />
<link rel="stylesheet" href="dashboard.css" />
```

### scheduler.html
```html
<link rel="stylesheet" href="common.css" />
<link rel="stylesheet" href="scheduler.css" />
```

### about.html
```html
<link rel="stylesheet" href="common.css" />
<link rel="stylesheet" href="about.css" />
```

## Benefits of This Structure

1. **Modularity**: Each page has its own CSS file, making it easier to maintain and update specific page styles
2. **Performance**: Only the necessary CSS is loaded for each page, reducing file sizes
3. **Organization**: Clear separation of concerns with shared styles in common.css
4. **Maintainability**: Easier to find and modify styles for specific pages
5. **Scalability**: Easy to add new pages with their own CSS files
6. **Team Collaboration**: Multiple developers can work on different page styles without conflicts

## Responsive Design

All CSS files include responsive design with the following breakpoints:
- **Desktop**: 1024px and above
- **Tablet**: 768px to 1023px
- **Mobile**: 480px to 767px
- **Small Mobile**: Below 480px

## Color Scheme

The project uses a consistent color scheme across all pages:
- **Primary Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Text Colors**: `#333` (dark), `#666` (medium), `#fff` (white)
- **Background Colors**: `#f8f9fa` (light), `#fff` (white), `#000` (black)
- **Accent Colors**: Various colors for alerts and status indicators

## Font Usage

- **Primary Font**: "FreightBig Pro" (custom font files)
- **Fallback Fonts**: System fonts for better compatibility
- **Font Weights**: 100 (light), 400 (regular), 500 (medium), 600 (semi-bold)

## Animation and Transitions

- Smooth transitions (0.3s ease) for interactive elements
- Hover effects with transform and shadow changes
- Floating animations for decorative elements
- Gradient animations for visual appeal

## Browser Compatibility

The CSS is designed to work with:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Future Considerations

1. **CSS Variables**: Consider implementing CSS custom properties for better theme management
2. **CSS Modules**: For larger projects, consider using CSS modules or styled-components
3. **PostCSS**: Implement PostCSS for autoprefixing and optimization
4. **CSS Minification**: Minify CSS files for production deployment 