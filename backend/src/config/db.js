const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME || 'UnityMap';

    if (!mongoURI) {
      throw new Error('MONGO_URI is missing in environment variables (.env)');
    }

    const conn = await mongoose.connect(mongoURI, {
      dbName: dbName,
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📌 Database Name: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

// If run directly (e.g. `npm run test:db` or `node src/config/db.js`), run connectDB
if (require.main === module) {
  connectDB().then(() => {
    console.log('🎉 Database connection test finished successfully.');
    mongoose.connection.close();
  }).catch((err) => {
    console.error('💥 Database connection test failed:', err);
  });
}

module.exports = connectDB;
