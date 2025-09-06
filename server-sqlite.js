const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Add startup logging
console.log('🚀 Starting Campaign Manager Server...');
console.log('📦 Node.js version:', process.version);
console.log('📁 Working directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

let Database;
try {
  Database = require('better-sqlite3');
  console.log('✅ better-sqlite3 loaded successfully');
} catch (error) {
  console.error('❌ Failed to load better-sqlite3:', error.message);
  process.exit(1);
}

const campaignRoutes = require('./routes/campaigns-sqlite');
const scriptRoutes = require('./routes/scripts');
const postbackRoutes = require('./routes/postbacks-sqlite');
const reportRoutes = require('./routes/reports-sqlite');
const eventRoutes = require('./routes/events-sqlite');

const app = express();
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 5000;

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'data', 'campaign-manager.db')
  : 'campaign-manager.db';

// Ensure data directory exists in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

let db;
try {
  db = new Database(dbPath);
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection failed:', error);
  process.exit(1);
}

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Process error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: SQLite (${dbPath})`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`🔧 Railway environment: ${process.env.RAILWAY_ENVIRONMENT || 'not set'}`);
  console.log(`✅ Server started successfully!`);
}).on('error', (err) => {
  console.error('❌ Server startup failed:', err);
  console.error('❌ Error details:', err.message);
  console.error('❌ Stack trace:', err.stack);
  process.exit(1);
});
