import dns from 'dns';
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // Ignore if restricted
  }
}

import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { seedDatabase } from './config/seed';
import redisService from './services/redisService';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Start Express app listening IMMEDIATELY so port 5000 is open
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // 2. Connect to Database
  connectDB()
    .then(async () => {
      console.log('✅ MongoDB connected successfully.');
      await seedDatabase();
      console.log('✅ Seed check complete.');
    })
    .catch((err) => {
      console.error('❌ Database connection process encountered error:', err.message);
    });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🛑 Shutdown signal received, closing server...');
    server.close(async () => {
      await redisService.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((error) => {
  console.error('Critical failure initiating server:', error);
  process.exit(1);
});