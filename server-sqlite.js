const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const campaignRoutes = require('./routes/campaigns-sqlite');
const scriptRoutes = require('./routes/scripts');
const postbackRoutes = require('./routes/postbacks-sqlite');
const reportRoutes = require('./routes/reports-sqlite');
const eventRoutes = require('./routes/events-sqlite');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database
const db = new Database('campaign-manager.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    casino TEXT NOT NULL,
    template_config TEXT NOT NULL,
    postback_url TEXT NOT NULL,
    script_url TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_by TEXT NOT NULL,
    stats TEXT DEFAULT '{"cookieSets":0,"registrations":0,"ftds":0}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    ip_address TEXT,
    cookie_data TEXT,
    postback_data TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON events(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
`);

// Make database available to routes
app.locals.db = db;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/postbacks', postbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events', eventRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: SQLite (campaign-manager.db)`);
});
