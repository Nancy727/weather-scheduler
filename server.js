const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection using .env.local
let pool;
try {
  console.log('Loading environment variables from .env.local...');
  console.log('PG_CONNECTION_STRING available:', !!process.env.PG_CONNECTION_STRING);
  
  if (!process.env.PG_CONNECTION_STRING) {
    throw new Error('PG_CONNECTION_STRING not found in environment variables');
  }
  
  console.log('Attempting to connect to database...');
  
  pool = new Pool({ 
    connectionString: process.env.PG_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Test the connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection test failed:', err.message);
    } else {
      console.log('Successfully connected to PostgreSQL database');
    }
  });
} catch (err) {
  console.error('Database connection failed:', err);
  process.exit(1);
}

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready');

    // Create events table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        notes TEXT,
        weather_priority INTEGER DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Events table ready');
    console.log('Database initialization completed successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    console.error('Error details:', err.message);
  }
}

app.use(cors());
app.use(bodyParser.json());

// Signup endpoint (PostgreSQL)
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email, password]);
    res.status(201).json({ message: 'Signup successful.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login endpoint (PostgreSQL)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  try {
    const result = await pool.query('SELECT name, email FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = result.rows[0];
    res.json({ message: 'Login successful.', name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- DSA Heap (Priority Queue) Implementation ---
class MinHeap {
  constructor() { this.heap = []; }
  parent(i) { return Math.floor((i - 1) / 2); }
  left(i) { return 2 * i + 1; }
  right(i) { return 2 * i + 2; }
  swap(i, j) { [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }
  insert(event) {
    this.heap.push(event);
    let i = this.heap.length - 1;
    while (i > 0 && this.heap[this.parent(i)].weather_priority > this.heap[i].weather_priority) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapify(0);
    return root;
  }
  heapify(i) {
    const l = this.left(i), r = this.right(i);
    let smallest = i;
    if (l < this.heap.length && this.heap[l].weather_priority < this.heap[smallest].weather_priority) smallest = l;
    if (r < this.heap.length && this.heap[r].weather_priority < this.heap[smallest].weather_priority) smallest = r;
    if (smallest !== i) {
      this.swap(i, smallest);
      this.heapify(smallest);
    }
  }
  isEmpty() { return this.heap.length === 0; }
}

// --- DSA Map Usage ---
// GET /api/events/prioritized?email=user@example.com
app.get('/api/events/prioritized', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    // Fetch all events for the user from database
    const result = await pool.query('SELECT * FROM events WHERE user_email = $1', [email]);
    const events = result.rows;
    
    // Use a MinHeap (priority queue) to prioritize events by weather_priority (lower = higher priority)
    const heap = new MinHeap();
    events.forEach(ev => heap.insert(ev));
    // Use a Map for fast lookup by event ID
    const eventMap = new Map();
    events.forEach(ev => eventMap.set(ev.id, ev));
    // Extract events in priority order
    const prioritized = [];
    while (!heap.isEmpty()) {
      prioritized.push(heap.extractMin());
    }
    // Demonstrate Map lookup (e.g., lookup the first event by ID)
    let mapLookup = null;
    if (prioritized.length > 0) {
      const firstId = prioritized[0].id;
      mapLookup = eventMap.get(firstId);
    }
    res.json({ prioritized, mapLookup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/events - Create a new event for a user
app.post('/api/events', async (req, res) => {
  const { user_email, name, location, date, time, notes, weather_priority } = req.body;
  if (!user_email || !name || !location || !date || !time || weather_priority === undefined) {
    return res.status(400).json({ error: 'Missing required event fields.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO events (user_email, name, location, date, time, notes, weather_priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_email, name, location, date, time, notes, weather_priority]
    );
    res.status(201).json({ message: 'Event created', event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/events?email=... - Fetch all events for a user
app.get('/api/events', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query('SELECT * FROM events WHERE user_email = $1', [email]);
    res.json({ events: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/events/:id - Delete a specific event
app.delete('/api/events', async (req, res) => {
  const id = parseInt(req.params.id);
  const email = req.query.email?.toLowerCase();

  if (!id || !email) {
    return res.status(400).json({ error: 'Event ID and user email required' });
  }

  try {
    const checkResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND user_email = $2',
      [id, email]
    );

    if (checkResult.rowCount === 0) {
      console.warn(`Unauthorized delete attempt: ID=${id}, Email=${email}`);
      return res.status(404).json({ error: 'Event not found or access denied' });
    }

    await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_email = $2',
      [id, email]
    );

    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initializeDatabase();
}); 