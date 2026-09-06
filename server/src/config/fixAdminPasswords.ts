import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dotenv.config();

/**
 * Migration script to fix double-hashed Admin and SuperAdmin passwords.
 *
 * This script uses direct MongoDB operations to bypass the User model's
 * pre-save hook and set correctly hashed passwords exactly once.
 *
 * Run with: npx ts-node src/config/fixAdminPasswords.ts
 */

const fixAdminPasswords = async (): Promise<void> => {
  try {
    // Set public DNS resolvers for MongoDB Atlas SRV records
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch {
      // Ignore if restricted
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-crm';
    console.log('[MIGRATION] Connecting to MongoDB...');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('[MIGRATION] ✓ Connected to MongoDB');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@aicrm.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Super12!';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aicrm.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12!';

    console.log('[MIGRATION] Starting password fix for default users...');

    // Hash passwords manually (bypass pre-save hook to ensure single hash)
    const saltRounds = 10;
    const superAdminHash = await bcrypt.hash(superAdminPassword, saltRounds);
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);

    // Use direct MongoDB update to bypass User model pre-save hook
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('[MIGRATION] Database connection not ready for migration.');
      return;
    }
    const usersCollection = db.collection('users');

    // Fix SuperAdmin password
    const superAdminResult = await usersCollection.updateOne(
      { email: superAdminEmail.toLowerCase() },
      { $set: { password: superAdminHash } }
    );

    if (superAdminResult.matchedCount > 0) {
      console.log(`[MIGRATION] ✓ SuperAdmin password reset successfully: ${superAdminEmail}`);
    } else {
      console.log(`[MIGRATION] ⚠ SuperAdmin not found: ${superAdminEmail}`);
    }

    // Fix Admin password
    const adminResult = await usersCollection.updateOne(
      { email: adminEmail.toLowerCase() },
      { $set: { password: adminHash } }
    );

    if (adminResult.matchedCount > 0) {
      console.log(`[MIGRATION] ✓ Admin password reset successfully: ${adminEmail}`);
    } else {
      console.log(`[MIGRATION] ⚠ Admin not found: ${adminEmail}`);
    }

    console.log('[MIGRATION] ✓ Password fix completed successfully');
    console.log('[MIGRATION] You can now login with:');
    console.log(`[MIGRATION]   SuperAdmin: ${superAdminEmail} / ${superAdminPassword}`);
    console.log(`[MIGRATION]   Admin: ${adminEmail} / ${adminPassword}`);

  } catch (error: any) {
    console.error('[MIGRATION] Error:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('[MIGRATION] DNS/Connection error. Try:');
      console.error('[MIGRATION] 1. Check your internet connection');
      console.error('[MIGRATION] 2. Verify MONGO_URI in .env file');
      console.error('[MIGRATION] 3. Check MongoDB Atlas IP whitelist (0.0.0.0/0)');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] Disconnected from MongoDB');
  }
};

// Run migration
fixAdminPasswords().then(() => process.exit(0));
