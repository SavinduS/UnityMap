const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Fail fast rather than running with unsigned/guessable session tokens.
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Sessions cannot be signed securely.');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  console.error('   then add JWT_SECRET=<value> to backend/.env');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err);
  process.exit(1);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

/**
 * LAN IP for the startup hint printed below. Prefers the OS default-route source
 * address (a UDP "connect" to 8.8.8.8 sends no traffic — it only asks the routing
 * table which address a phone would reach us on), then falls back to the first
 * non-virtual NIC, skipping VMware/Hyper-V/Bluetooth adapters that would give a
 * useless address like 192.168.83.1.
 */
const VIRTUAL_NIC = /VMware|vEthernet|Loopback|Bluetooth|Hyper-V|Teredo|isatap|Wi-Fi Direct/i;
const REAL_NIC = /^(Wi-Fi|Ethernet|WLAN|eth\d)/i;

const lanAddressFromNics = () => {
  const interfaces = os.networkInterfaces();
  let firstReal = null;
  for (const name of Object.keys(interfaces)) {
    if (VIRTUAL_NIC.test(name)) continue;
    for (const net of interfaces[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (REAL_NIC.test(name)) return net.address;
      firstReal = firstReal || net.address;
    }
  }
  return firstReal || 'localhost';
};

const printLanHint = (port) => {
  const print = (lan) => {
    console.log(`📡 LAN URL (put this in frontend/.env → EXPO_PUBLIC_API_URL): http://${lan}:${port}/api`);
    console.log(`   Phone check: open http://${lan}:${port}/api/health in the mobile browser`);
  };
  try {
    const dgram = require('dgram');
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      print(lanAddressFromNics());
    }, 400);
    const done = (addr) => {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      print(addr || lanAddressFromNics());
    };
    socket.on('error', () => done(null));
    socket.connect(53, '8.8.8.8', () => {
      let addr = null;
      try { addr = socket.address().address; } catch {}
      done(addr && addr !== '0.0.0.0' ? addr : null);
    });
  } catch {
    print(lanAddressFromNics());
  }
};

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 UnityMap Backend Server listening on port ${port}`);
    console.log(`📡 Health Check URL: http://localhost:${port}/api/health`);
    console.log(`📡 API Base URL:     http://localhost:${port}/api`);
    printLanHint(port);
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
