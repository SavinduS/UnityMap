const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err);
  process.exit(1);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.send('UnityMap API Server is Running 🚀');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const state = require('mongoose').connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  res.json({
    status: 'ok',
    database: states[state] || 'Unknown',
    dbName: process.env.DB_NAME || 'UnityMap',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const initialPort = parseInt(process.env.PORT, 10) || 5001;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 UnityMap Backend Server listening on port ${port}`);
    console.log(`📡 Health Check URL: http://localhost:${port}/api/health`);
    console.log(`📦 API Base URL:     http://localhost:${port}/api`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is already in use (e.g. macOS AirPlay Receiver). Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server startup error:', err);
    }
  });
};

startServer(initialPort);
