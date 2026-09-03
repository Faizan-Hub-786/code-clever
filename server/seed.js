import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function seedAdmin() {
  const hash = await bcrypt.hash('Password123!', 12);
  const email = 'admin@codeclever.com';
  const name = 'Faizan Admin';
  const code = 'CCADMIN01';

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    await pool.execute('UPDATE users SET password_hash = ?, role = "admin", status = "active" WHERE email = ?', [hash, email]);
    console.log('Updated existing admin account:', email);
  } else {
    const [u] = await pool.execute(
      'INSERT INTO users(full_name, email, password_hash, referral_code, role, status) VALUES(?,?,?,?, "admin", "active")',
      [name, email, hash, code]
    );
    await pool.execute('INSERT INTO wallets(user_id, available_balance, lifetime_earned) VALUES(?, 500000, 500000) ON DUPLICATE KEY UPDATE available_balance=500000', [u.insertId]);
    console.log('Created new admin account with ID:', u.insertId);
  }
  process.exit(0);
}

seedAdmin().catch(console.error);
