import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from '../server/db.js';

export async function resetDatabaseClean() {
  const conn = await pool.getConnection();
  try {
    console.log('[RESET] Starting clean database reset...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 0. If users table does not exist, initialize from database/schema.sql
    try {
      const [tableRows] = await conn.query(`SHOW TABLES LIKE 'users'`);
      if (tableRows.length === 0) {
        console.log('[RESET] Database tables not found. Initializing from database/schema.sql...');
        const schemaPath = path.resolve('database', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf-8');
          // Split statements by semicolon where appropriate
          const statements = sql
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
          for (const statement of statements) {
            try {
              await conn.query(statement);
            } catch (err) {
              // Ignore harmless duplicate key / table exists notices
            }
          }
          console.log('[RESET] Successfully initialized schema from schema.sql.');
        }
      }
    } catch (e) {
      console.log('[RESET] Initial schema check notice:', e.message);
    }

    // 1. Drop problematic unique index on user_plans if it exists
    try {
      const [indices] = await conn.query(`SHOW INDEX FROM user_plans WHERE Key_name = 'uq_active_user_plan'`);
      if (indices.length > 0) {
        await conn.query(`ALTER TABLE user_plans DROP INDEX uq_active_user_plan`);
        console.log('[RESET] Successfully dropped uq_active_user_plan unique index.');
      }
    } catch (e) {
      console.log('[RESET] Notice checking uq_active_user_plan:', e.message);
    }

    try {
      const [idx] = await conn.query(`SHOW INDEX FROM user_plans WHERE Key_name = 'idx_user_plans_user_status'`);
      if (idx.length === 0) {
        await conn.query(`ALTER TABLE user_plans ADD INDEX idx_user_plans_user_status (user_id, status)`);
        console.log('[RESET] Added non-unique index idx_user_plans_user_status.');
      }
    } catch (e) {
      console.log('[RESET] Notice checking idx_user_plans_user_status:', e.message);
    }

    // 2. Truncate all transactional, history, chat, and activity tables
    const tablesToTruncate = [
      'wallet_transactions',
      'team_reward_ledger',
      'user_task_assignments',
      'guest_chat_messages',
      'support_inquiries',
      'lucky_wheel_spins',
      'user_spins',
      'spin_grants_log',
      'deposits',
      'withdrawals',
      'daily_checkins',
      'export_history',
      'audit_logs',
      'notifications',
      'user_plans',
      'referrals',
      'user_settings',
      'banned_credentials'
    ];

    for (const table of tablesToTruncate) {
      try {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`[RESET] Truncated table: ${table}`);
      } catch (err) {
        console.warn(`[RESET] Warning truncating ${table}:`, err.message);
      }
    }

    // 3. Clear all wallets
    await conn.query(`TRUNCATE TABLE wallets`);
    console.log('[RESET] Truncated wallets table.');

    // 4. Delete all users
    await conn.query(`DELETE FROM users`);
    console.log('[RESET] Cleared users table.');

    // 5. Create ONLY 1 Admin account
    const targetEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'faizan0687@gmail.com').trim().toLowerCase();
    const targetPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Faizan@786';
    const adminPasswordHash = await bcrypt.hash(targetPassword, 10);
    const [adminResult] = await conn.query(
      `INSERT INTO users (
        id, full_name, email, password_hash, role, status, 
        referral_code, referred_by, lucky_spins, failed_login_attempts
      ) VALUES (
        1, 'Faizan Admin', ?, ?, 'admin', 'active',
        'ADMIN01', NULL, 0, 0
      )`,
      [targetEmail, adminPasswordHash]
    );
    const adminId = adminResult.insertId || 1;

    // Create Admin wallet with exact Rs. 0 balance
    await conn.query(
      `INSERT INTO wallets (user_id, available_balance, commission_balance, pending_balance, lifetime_earned) 
       VALUES (?, 0, 0, 0, 0)`,
      [adminId]
    );
    console.log(`[RESET] Created Admin account (ID: ${adminId}, Email: faizan0687@gmail.com, Referral: ADMIN01, Balance: Rs. 0).`);

    // 6. Verify counts
    const [[{ userCount }]] = await conn.query(`SELECT COUNT(*) AS userCount FROM users`);
    const [[{ adminCount }]] = await conn.query(`SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'`);
    const [[{ normalUserCount }]] = await conn.query(`SELECT COUNT(*) AS normalUserCount FROM users WHERE role = 'user'`);
    const [wallets] = await conn.query(`SELECT * FROM wallets`);

    console.log('\n--- VERIFICATION STATS ---');
    console.log(`Total Users in DB: ${userCount} (Admin: ${adminCount}, Normal User: ${normalUserCount})`);
    console.log('Wallets in DB:');
    wallets.forEach(w => {
      console.log(` - User ID ${w.user_id}: Available = Rs. ${w.available_balance}, Commission = Rs. ${w.commission_balance}, Lifetime = Rs. ${w.lifetime_earned}`);
    });

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n[RESET] Database reset completed cleanly and successfully!');
  } catch (error) {
    console.error('[RESET] Fatal error during database reset:', error);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
}

if (process.argv[1]?.endsWith('reset_db_clean.js')) {
  resetDatabaseClean()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
