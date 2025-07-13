// Scheduler with localStorage, Heap, and Map Data Structures

// Data Structures
class MinHeap {
    constructor() {
        this.heap = [];
    }

    // Get parent index
    getParentIndex(index) {
        return Math.floor((index - 1) / 2);
    }

    // Get left child index
    getLeftChildIndex(index) {
        return 2 * index + 1;
    }

    // Get right child index
    getRightChildIndex(index) {
        return 2 * index + 2;
    }

    // Check if node has parent
    hasParent(index) {
        return this.getParentIndex(index) >= 0;
    }

    // Check if node has left child
    hasLeftChild(index) {
        return this.getLeftChildIndex(index) < this.heap.length;
    }

    // Check if node has right child
    hasRightChild(index) {
        return this.getRightChildIndex(index) < this.heap.length;
    }

    // Get parent value
    getParent(index) {
        return this.heap[this.getParentIndex(index)];
    }

    // Get left child value
    getLeftChild(index) {
        return this.heap[this.getLeftChildIndex(index)];
    }

    // Get right child value
    getRightChild(index) {
        return this.heap[this.getRightChildIndex(index)];
    }

    // Swap two elements
    swap(index1, index2) {
        [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
    }

    // Peek at the minimum element
    peek() {
        if (this.heap.length === 0) return null;
        return this.heap[0];
    }

    // Add element to heap
    add(element) {
        this.heap.push(element);
        this.heapifyUp();
    }

    // Remove and return minimum element
    poll() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const item = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown();

        return item;
    }

    // Move element up to maintain heap property
    heapifyUp() {
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.getParent(index).priority > this.heap[index].priority) {
            this.swap(this.getParentIndex(index), index);
            index = this.getParentIndex(index);
        }
    }

    // Move element down to maintain heap property
    heapifyDown() {
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (this.hasRightChild(index) && this.getRightChild(index).priority < this.getLeftChild(index).priority) {
                smallerChildIndex = this.getRightChildIndex(index);
            }

            if (this.heap[index].priority < this.heap[smallerChildIndex].priority) {
                break;
            } else {
                this.swap(index, smallerChildIndex);
            }
            index = smallerChildIndex;
        }
    }

    // Get heap size
    size() {
        return this.heap.length;
    }

    // Check if heap is empty
    isEmpty() {
        return this.heap.length === 0;
    }

    // Convert heap to array
    toArray() {
        return [...this.heap];
    }
}

// Event Manager with Map and Heap
class EventManager {
    constructor() {
        this.eventMap = new Map(); // Map for O(1) event lookup by ID
        this.priorityHeap = new MinHeap(); // Heap for priority-based scheduling
        this.userEmail = sessionStorage.getItem('userEmail') || 'default@user.com';
        this.loadEvents();
    }

    // Load events from localStorage
    loadEvents() {
        try {
            const storedEvents = localStorage.getItem(`events_${this.userEmail}`);
            if (storedEvents) {
                const events = JSON.parse(storedEvents);
                events.forEach(event => {
                    this.addEvent(event);
                });
                console.log(`Loaded ${events.length} events from localStorage`);
            }
        } catch (error) {
            console.error('Error loading events from localStorage:', error);
        }
    }

    // Save events to localStorage
    saveEvents() {
        try {
            const events = this.eventMap.values();
            const eventsArray = Array.from(events);
            localStorage.setItem(`events_${this.userEmail}`, JSON.stringify(eventsArray));
            console.log(`Saved ${eventsArray.length} events to localStorage`);
        } catch (error) {
            console.error('Error saving events to localStorage:', error);
        }
    }

    // Add new event
    addEvent(eventData) {
        const event = {
            id: eventData.id || Date.now().toString(),
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            taskType: eventData.taskType,
            priority: this.calculatePriority(eventData),
            weather: eventData.weather || {},
            location: eventData.location || '',
            description: eventData.description || '',
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Add to map for O(1) lookup
        this.eventMap.set(event.id, event);
        
        // Add to priority heap
        this.priorityHeap.add(event);
        
        this.saveEvents();
        return event;
    }

    // Calculate priority based on weather and task type
    calculatePriority(eventData) {
        let priority = 5; // Base priority (1-10, 1 being highest)

        // Task type priority adjustments
        const taskTypePriorities = {
            'Outdoor Work': 3,
            'Garden Maintenance': 4,
            'Construction': 2,
            'Sports': 5,
            'Travel': 6,
            'Indoor Work': 7,
            'Study': 8,
            'Meeting': 6,
            'Shopping': 7,
            'Exercise': 4,
            'Social Event': 6,
            'Medical': 1,
            'Emergency': 1
        };

        if (taskTypePriorities[eventData.taskType]) {
            priority = taskTypePriorities[eventData.taskType];
        }

        // Weather-based adjustments
        if (eventData.weather) {
            const weather = eventData.weather;
            
            // Reduce priority for outdoor tasks in bad weather
            if (['Outdoor Work', 'Garden Maintenance', 'Construction', 'Sports', 'Exercise'].includes(eventData.taskType)) {
                if (weather.main === 'Rain' || weather.main === 'Snow' || weather.main === 'Thunderstorm') {
                    priority += 2; // Lower priority (higher number)
                }
                if (weather.main === 'Clear' && weather.temp > 25) {
                    priority -= 1; // Higher priority for good weather
                }
            }

            // Increase priority for indoor tasks in bad weather
            if (['Indoor Work', 'Study', 'Meeting'].includes(eventData.taskType)) {
                if (weather.main === 'Rain' || weather.main === 'Snow') {
                    priority -= 1; // Higher priority
                }
            }
        }

        return Math.max(1, Math.min(10, priority)); // Ensure priority is between 1-10
    }

    // Get event by ID
    getEvent(id) {
        return this.eventMap.get(id);
    }

    // Get all events
    getAllEvents() {
        return Array.from(this.eventMap.values());
    }

    // Get events sorted by priority
    getEventsByPriority() {
        return this.priorityHeap.toArray().sort((a, b) => a.priority - b.priority);
    }

    // Get events for a specific date
    getEventsByDate(date) {
        return Array.from(this.eventMap.values()).filter(event => event.date === date);
    }

    // Update event
    updateEvent(id, updates) {
        const event = this.eventMap.get(id);
        if (event) {
            const updatedEvent = { ...event, ...updates };
            updatedEvent.priority = this.calculatePriority(updatedEvent);
            
            // Remove from heap and map
            this.removeEvent(id);
            
            // Add updated event
            this.addEvent(updatedEvent);
            
            return updatedEvent;
        }
        return null;
    }

    // Delete event
    deleteEvent(id) {
        const event = this.eventMap.get(id);
        if (event) {
            this.eventMap.delete(id);
            
            // Rebuild heap without this event
            const events = Array.from(this.eventMap.values());
            this.priorityHeap = new MinHeap();
            events.forEach(e => this.priorityHeap.add(e));
            
            this.saveEvents();
            return true;
        }
        return false;
    }

    // Remove event (internal use)
    removeEvent(id) {
        this.eventMap.delete(id);
        // Rebuild heap
        const events = Array.from(this.eventMap.values());
        this.priorityHeap = new MinHeap();
        events.forEach(e => this.priorityHeap.add(e));
    }

    // Get next highest priority event
    getNextPriorityEvent() {
        return this.priorityHeap.peek();
    }

    // Mark event as completed
    markCompleted(id) {
        return this.updateEvent(id, { completed: true });
    }

    // Get statistics
    getStats() {
        const events = this.getAllEvents();
        return {
            total: events.length,
            completed: events.filter(e => e.completed).length,
            pending: events.filter(e => !e.completed).length,
            highPriority: events.filter(e => e.priority <= 3).length,
            today: events.filter(e => e.date === new Date().toISOString().split('T')[0]).length
        };
    }

    // Clear all events
    clearAllEvents() {
        this.eventMap.clear();
        this.priorityHeap = new MinHeap();
        this.saveEvents();
    }
}

// Global event manager instance
const eventManager = new EventManager();

// Weather API integration
const OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Get weather data for location
async function getWeatherForLocation(lat, lng) {
    try {
        const response = await fetch(
            `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (response.ok) {
            const data = await response.json();
            return {
                temp: Math.round(data.main.temp),
                humidity: data.main.humidity,
                main: data.weather[0].main,
                description: data.weather[0].description,
                icon: data.weather[0].icon
            };
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
    return null;
}

// Get user's current location
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log('Location access denied');
                    reject(error);
                }
            );
        } else {
            reject(new Error('Geolocation not supported'));
        }
    });
}

// Form submission handler
async function handleEventSubmission(eventData) {
    try {
        // Get user location and weather
        let weather = null;
        try {
            const location = await getUserLocation();
            weather = await getWeatherForLocation(location.lat, location.lng);
        } catch (error) {
            console.log('Using default weather data');
            weather = {
                temp: 22,
                humidity: 65,
                main: 'Clear',
                description: 'clear sky',
                icon: '01d'
            };
        }

        // Add weather data to event
        eventData.weather = weather;
        
        // Add event using event manager
        const newEvent = eventManager.addEvent(eventData);
        
        // Update UI
        addEventMarkers();
        showSuccessPopup('Event added successfully!');
        
        console.log('Event added:', newEvent);
        
    } catch (error) {
        console.error('Error adding event:', error);
        showErrorPopup('Failed to add event. Please try again.');
    }
}

// Delete event handler
async function handleEventDeletion(eventId) {
    try {
        const success = eventManager.deleteEvent(eventId);
        if (success) {
            addEventMarkers();
            showSuccessPopup('Event deleted successfully!');
        } else {
            showErrorPopup('Failed to delete event.');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showErrorPopup('Failed to delete event. Please try again.');
    }
}

// Update event handler
async function handleEventUpdate(eventId, updates) {
    try {
        const updatedEvent = eventManager.updateEvent(eventId, updates);
        if (updatedEvent) {
            addEventMarkers();
            showSuccessPopup('Event updated successfully!');
        } else {
            showErrorPopup('Failed to update event.');
        }
    } catch (error) {
        console.error('Error updating event:', error);
        showErrorPopup('Failed to update event. Please try again.');
    }
}

// Load events on page load
function loadEvents() {
    const events = eventManager.getAllEvents();
    console.log('Loaded events:', events);
    addEventMarkers();
}

// Add event markers to the timeline
function addEventMarkers() {
    const events = eventManager.getAllEvents();
    const timeline = document.querySelector('.timeline');
    
    if (!timeline) return;
    
    // Clear existing markers
    const existingMarkers = timeline.querySelectorAll('.event-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // Add new markers
    events.forEach(event => {
        if (!event.completed) {
            const marker = createEventMarker(event);
            timeline.appendChild(marker);
        }
    });
}

// Create event marker element
function createEventMarker(event) {
    const marker = document.createElement('div');
    marker.className = `event-marker priority-${event.priority}`;
    marker.innerHTML = `
        <div class="marker-content">
            <span class="event-title">${event.title}</span>
            <span class="event-time">${event.time}</span>
            <span class="event-priority">Priority: ${event.priority}</span>
        </div>
    `;
    
    // Position marker based on time
    const time = event.time;
    const [hours, minutes] = time.split(':').map(Number);
    const position = ((hours * 60 + minutes) / (24 * 60)) * 100;
    marker.style.left = `${position}%`;
    
    // Add click handler
    marker.addEventListener('click', () => showEventDetails(event));
    
    return marker;
}

// Show event details popup
function showEventDetails(event) {
    const popup = document.createElement('div');
    popup.className = 'event-details-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3>${event.title}</h3>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Type:</strong> ${event.taskType}</p>
            <p><strong>Priority:</strong> ${event.priority}</p>
            <p><strong>Weather:</strong> ${event.weather ? event.weather.description : 'N/A'}</p>
            <div class="popup-actions">
                <button onclick="markEventCompleted('${event.id}')">Mark Complete</button>
                <button onclick="deleteEvent('${event.id}')">Delete</button>
                <button onclick="closePopup()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// Mark event as completed
function markEventCompleted(eventId) {
    eventManager.markCompleted(eventId);
    addEventMarkers();
    closePopup();
    showSuccessPopup('Event marked as completed!');
}

// Delete event
function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        handleEventDeletion(eventId);
        closePopup();
    }
}

// Close popup
function closePopup() {
    const popup = document.querySelector('.event-details-popup');
    if (popup) {
        popup.remove();
    }
}

// Show success popup
function showSuccessPopup(message) {
    showPopup('Success', message, 'success');
}

// Show error popup
function showErrorPopup(message) {
    showPopup('Error', message, 'error');
}

// Generic popup function
function showPopup(title, message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `popup-overlay ${type}`;
    popup.innerHTML = `
        <div class="popup-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 3000);
}

// Initialize scheduler
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scheduler initialized with localStorage and data structures');
    loadEvents();
    
    // Set up form submission
    const form = document.getElementById('eventForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const eventData = {
                title: formData.get('title'),
                date: formData.get('date'),
                time: formData.get('time'),
                taskType: formData.get('taskType'),
                description: formData.get('description') || ''
            };
            
            await handleEventSubmission(eventData);
            form.reset();
        });
    }
    
    // Set up priority display
    updatePriorityDisplay();
});

// Update priority display
function updatePriorityDisplay() {
    const stats = eventManager.getStats();
    const priorityContainer = document.querySelector('.priority-stats');
    
    if (priorityContainer) {
        priorityContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Events:</span>
                <span class="stat-value">${stats.total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">High Priority:</span>
                <span class="stat-value">${stats.highPriority}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Today:</span>
                <span class="stat-value">${stats.today}</span>
            </div>
        `;
    }
}

// Export functions for global access
window.eventManager = eventManager;
window.handleEventSubmission = handleEventSubmission;
window.handleEventDeletion = handleEventDeletion;
window.handleEventUpdate = handleEventUpdate;
window.markEventCompleted = markEventCompleted;
window.deleteEvent = deleteEvent;
window.closePopup = closePopup;
window.loadEvents = loadEvents; 