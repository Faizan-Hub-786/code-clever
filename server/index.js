import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import 'dotenv/config';
import { pool, closePool } from './db.js';
import { uploadImageBufferToCloudinary } from './services/cloudinary.js';
import { createAltchaChallenge, verifyAltchaPayload } from './services/altcha.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Configurable CORS for Production & Custom Domains
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://codeclever.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || (origin && (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app'))) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With']
}));

// Tiered Rate Limiters for 512MB RAM Optimization
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.RATE_LIMIT_GENERAL || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down.' }
});
app.use('/api/', generalLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: Number(process.env.RATE_LIMIT_SENSITIVE || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts for this action. Please wait before retrying.' }
});

app.use(express.json({ limit: '10mb' }));

// ----------------- HEALTH CHECK (Render / UptimeRobot) -----------------
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await pool.execute('SELECT 1');
  } catch (err) {
    dbStatus = 'unreachable';
  }

  const mem = process.memoryUsage();

  res.status(200).json({
    status: dbStatus === 'ok' ? 'healthy' : 'online',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// ----------------- ALTCHA HUMAN VERIFICATION CHALLENGE -----------------
app.get('/api/altcha-challenge', (req, res) => {
  try {
    const challenge = createAltchaChallenge();
    res.json(challenge);
  } catch (err) {
    console.error('ALTCHA challenge generation error:', err);
    res.status(500).json({ message: 'Could not generate human verification challenge.' });
  }
});

// ----------------- CLOUDINARY STREAMING FILE UPLOAD -----------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file provided for upload.' });
  }
  try {
    const result = await uploadImageBufferToCloudinary(req.file.buffer, req.file.mimetype, 'codeclever_media');
    res.json({
      ok: true,
      url: result.url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(400).json({ message: err.message || 'Image upload failed.' });
  }
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
}

async function adminOnly(req, res, next) {
  try {
    const [[u]] = await pool.execute(`SELECT id, full_name, email, role, status FROM users WHERE id=?`, [req.user.id]);
    const allowedAdminEmails = ['faizanbarvi786@gmail.com', 'faizan0687@gmail.com'];
    if (!u || u.status !== 'active' || u.role !== 'admin' || !allowedAdminEmails.includes(String(u.email || '').trim().toLowerCase())) {
      return res.status(403).json({ message: 'Access denied: Administrator privileges required.' });
    }
    req.admin = u;
    next();
  } catch {
    return res.status(500).json({ message: 'Authorization service unavailable' });
  }
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ----------------- NOTIFICATIONS ENGINE -----------------
async function createNotification(userId, type, title, message, category = 'transactions') {
  try {
    await pool.execute(`
      INSERT INTO notifications(user_id, type, category, title, message, is_read)
      VALUES(?, ?, ?, ?, ?, 0)
    `, [userId, type, category, title, message]);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// ----------------- BONUS SPINS ENGINE -----------------
async function grantUserSpins(conn, userId, count, source, note = '', grantedBy = null) {
  const spinsToAdd = Math.max(1, Number(count || 1));
  if (!userId || spinsToAdd <= 0) return;
  try {
    await conn.execute(`
      INSERT INTO user_spins(user_id, bonus_spins, total_spins_granted, total_spins_used)
      VALUES(?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE
        bonus_spins = bonus_spins + VALUES(bonus_spins),
        total_spins_granted = total_spins_granted + VALUES(total_spins_granted)
    `, [userId, spinsToAdd, spinsToAdd]);

    await conn.execute(`
      INSERT INTO spin_grants_log(user_id, spins_count, source, note, granted_by)
      VALUES(?, ?, ?, ?, ?)
    `, [userId, spinsToAdd, source, note, grantedBy]);

    const titleMap = {
      plan_activation: '🎡 Free Lucky Wheel Spin Unlocked!',
      recharge_bonus: '🎁 Recharge Reward: Free Wheel Spin Added!',
      team_recharge_bonus: '👥 Team Recharge Reward: Free Spin Added!',
      admin_grant: '🎁 Complimentary Lucky Wheel Spins!'
    };
    const title = titleMap[source] || '🎡 Free Lucky Wheel Spins Added!';

    const defaultMsgMap = {
      plan_activation: `You received ${spinsToAdd} complimentary Lucky Fortune Wheel spin for activating your package!`,
      recharge_bonus: `You received ${spinsToAdd} Lucky Fortune Wheel spin as a recharge bonus!`,
      team_recharge_bonus: `A team member completed a recharge! You earned ${spinsToAdd} complimentary Lucky Fortune Wheel spin!`,
      admin_grant: `An administrator has credited ${spinsToAdd} free Lucky Fortune Wheel spin(s) to your account.`
    };
    const message = note || defaultMsgMap[source] || `You have been credited ${spinsToAdd} Lucky Fortune Wheel spins.`;

    await createNotification(userId, 'spin_reward', title, message, 'rewards');
  } catch (err) {
    console.error('Error granting user spins:', err);
  }
}

// ----------------- DATABASE SCHEMA AUTO-INIT -----------------
async function initDatabase() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_spins (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        bonus_spins INT UNSIGNED NOT NULL DEFAULT 0,
        total_spins_granted INT UNSIGNED NOT NULL DEFAULT 0,
        total_spins_used INT UNSIGNED NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_spins (user_id),
        CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS spin_grants_log (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        spins_count INT NOT NULL,
        source VARCHAR(60) NOT NULL,
        note VARCHAR(255) NULL,
        granted_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_spin_grants_user (user_id, created_at)
      ) ENGINE=InnoDB;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'transactions',
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user (user_id, is_read, created_at)
      ) ENGINE=InnoDB;
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS lucky_wheel_spins (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        segment_id BIGINT NULL,
        segment_label VARCHAR(120) NOT NULL,
        reward DECIMAL(12,2) NOT NULL DEFAULT 0,
        spin_source ENUM('daily','bonus') NOT NULL DEFAULT 'daily',
        metadata JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wheel_user_date (user_id, created_at),
        CONSTRAINT fk_wheel_spin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Column migrations
    try {
      await pool.execute(`ALTER TABLE lucky_wheel_spins ADD COLUMN spin_source ENUM('daily','bonus') NOT NULL DEFAULT 'daily'`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE user_spins ADD COLUMN locked_prize VARCHAR(50) NULL DEFAULT NULL`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE user_spins ADD COLUMN locked_spins_count INT UNSIGNED NOT NULL DEFAULT 0`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE deposits ADD COLUMN sender_name VARCHAR(120) NULL`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE deposits ADD COLUMN sender_number VARCHAR(80) NULL`);
    } catch {}

    // Security question columns on users
    try { await pool.execute(`ALTER TABLE users ADD COLUMN security_question VARCHAR(255) NULL DEFAULT 'What was the name of your first school?'`); } catch {}
    try { await pool.execute(`ALTER TABLE users ADD COLUMN security_answer_hash VARCHAR(255) NULL`); } catch {}

    // is_locked column on plans
    try { await pool.execute(`ALTER TABLE plans ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0`); } catch {}

    // A/B/C Team structure columns on users
    try { await pool.execute(`ALTER TABLE users ADD COLUMN root_leader_id BIGINT UNSIGNED NULL DEFAULT NULL`); } catch {}
    try { await pool.execute(`ALTER TABLE users ADD COLUMN team_level ENUM('A','B','C') NULL DEFAULT NULL`); } catch {}
    try { await pool.execute(`ALTER TABLE users ADD COLUMN referral_depth TINYINT UNSIGNED NOT NULL DEFAULT 0`); } catch {}
    try { await pool.execute(`CREATE INDEX idx_users_root_leader ON users(root_leader_id, team_level)`); } catch {}
    try { await pool.execute(`CREATE INDEX idx_users_referred_by ON users(referred_by)`); } catch {}
    try { await pool.execute(`CREATE INDEX idx_users_team_level ON users(team_level)`); } catch {}

    // Ensure guest_chat_messages table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS guest_chat_messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_token VARCHAR(64) NOT NULL,
        sender ENUM('user','bot','admin') NOT NULL DEFAULT 'user',
        message TEXT NOT NULL,
        user_email VARCHAR(190) NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gcm_token (session_token),
        INDEX idx_gcm_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure support_inquiries table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_inquiries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        category VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        attachment_url LONGTEXT NULL,
        status ENUM('pending','replied','closed') NOT NULL DEFAULT 'pending',
        admin_reply TEXT NULL,
        replied_by BIGINT UNSIGNED NULL,
        replied_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_si_user (user_id),
        INDEX idx_si_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try { await pool.execute(`ALTER TABLE support_inquiries MODIFY COLUMN user_id BIGINT UNSIGNED NULL DEFAULT NULL`); } catch {}
    try { await pool.execute(`ALTER TABLE support_inquiries ADD COLUMN attachment_url LONGTEXT NULL DEFAULT NULL`); } catch {}

    // Ensure task_library has all 25 active tasks with realistic names & icons
    try {
      const DEFAULT_25_TASKS = [
        ['TikTok Lite', 'Social Video', '/assets/Apps Icons/tiktok.svg', 'https://www.tiktok.com/', 'Evaluate short-form video streaming latency, audio sync, and engagement response.', 'proof', 1],
        ['Instagram Reels', 'Media & Photo', '/assets/Apps Icons/instagram.svg', 'https://www.instagram.com/', 'Verify instant reel playback buffer, story camera filter rendering, and DM delivery.', 'proof', 1],
        ['Clash of Clans', 'Strategy Gaming', '/assets/Apps Icons/Clash of clan.jpg', 'https://supercell.com/', 'Evaluate 60 FPS multiplayer village load times and army attack animations.', 'proof', 1],
        ['Gardenscapes', 'Casual Puzzle', '/assets/Apps Icons/Gardensacpes.jpg', 'https://playrix.com/', 'Test puzzle board gesture sensitivity and booster reward claiming responsiveness.', 'proof', 1],
        ['Easypaisa FastPay', 'FinTech & Mobile Money', '/assets/Apps Icons/04afefd3-aaf3-4d08-86e9-3c1281220097.jpg', 'https://easypaisa.com.pk/', 'Test QR payment scanner, instant mobile load, and biometric login authentication.', 'proof', 1],
        ['JazzCash Wallet Hub', 'Digital Banking & Payments', '/assets/Apps Icons/0e5c35cd-c964-4501-a66b-b5f0ebaad134.jpg', 'https://jazzcash.com.pk/', 'Verify money transfer routing speed, debit card controls, and utility bill payments.', 'proof', 1],
        ['SadaPay Mastercard', 'Digital Neobank', '/assets/Apps Icons/2ba54139-e360-43e4-b841-77d647d9a6de.jpg', 'https://sadapay.pk/', 'Test virtual Mastercard instant card freezing, FX exchange rate preview, and fee-free ATM locator UI.', 'proof', 1],
        ['NayaPay Visa Wallet', 'Finance & Everyday Lifestyle', '/assets/Apps Icons/3456afe7-efc5-4566-a9f4-18c4619d4f59.jpg', 'https://nayapay.com/', 'Evaluate bill payment barcode scanner, in-chat money requests, and real-time SMS OTP verification speed.', 'proof', 1],
        ['Daraz Mega Shopping', 'E-Commerce Marketplace', '/assets/Apps Icons/35d9294f-9bd9-40e4-8164-6403fb83a7a4.jpg', 'https://www.daraz.pk/', 'Test flash sale countdown timer accuracy, voucher claim 1-tap interaction, and doorstep COD checkout.', 'proof', 1],
        ['Foodpanda Express', 'Food Delivery & Pandamart', '/assets/Apps Icons/4f100358-b530-4e4c-bcb9-ccdfa2430b97.jpg', 'https://www.foodpanda.pk/', 'Verify live GPS rider delivery tracking accuracy, restaurant menu search filters, and tip tipping workflow.', 'proof', 1],
        ['Careem Super App', 'Mobility & Super App', '/assets/Apps Icons/52d3be58-9f62-43c6-83ed-576a559edefe.jpg', 'https://www.careem.com/', 'Audit captain fare estimator accuracy, route map rerouting smoothness, and Careem Pay wallet top-up.', 'proof', 1],
        ['InDrive Fare Bidding', 'Ride Sharing & Courier', '/assets/Apps Icons/5a83967b-89fa-4b58-8ae3-1f73f0c5bcf9.jpg', 'https://indrive.com/', 'Evaluate peer-to-peer fare negotiation modal, passenger safety shield SOS, and driver rating submission.', 'proof', 1],
        ['Bykea Fast Logistics', 'Bike Taxi & Cash Delivery', '/assets/Apps Icons/64f73a5f-0327-4136-aaf1-ecc21cd8d01d.jpg', 'https://bykea.com/', 'Verify parcel express booking, cash collection PIN verification, and driver distance estimation.', 'proof', 1],
        ['OLX Marketplace', 'Classifieds & Autos', '/assets/Apps Icons/676cbef9-ee20-4309-93cb-27ca8bfe47a7.jpg', 'https://www.olx.com.pk/', 'Test classified photo compressor, direct buyer chat notifications, and verified seller badge display.', 'proof', 1],
        ['PakWheels Auto Portal', 'Automotive & Inspection', '/assets/Apps Icons/6bcac3ef-c49b-437e-8f9b-9767ab8cfa4b.jpg', 'https://www.pakwheels.com/', 'Audit used car price valuation algorithm, 200+ point inspection report viewer, and auction sheet verifier.', 'proof', 1],
        ['Zameen Property Finder', 'Real Estate & Homes', '/assets/Apps Icons/7236c134-b48a-4019-aa2c-7976bdc248a8.jpg', 'https://www.zameen.com/', 'Verify interactive plot finder map layers, property price index trends, and home mortgage calculator.', 'proof', 1],
        ['Tamasha Live Cricket HD', 'Sports OTT & Live TV', '/assets/Apps Icons/72497e50-57ca-4837-a884-d9d6e4bf4335.jpg', 'https://tamashaweb.com/', 'Test adaptive bitrate HD live cricket match streaming, background audio PIP, and coin reward hub.', 'proof', 1],
        ['Tapmad TV Sports Pro', 'Live Entertainment & Matches', '/assets/Apps Icons/74b0ffc5-4365-4c63-86e0-b379b7b9909a.jpg', 'https://tapmad.com/', 'Evaluate 4K HDR ultra-low latency live stream feed, ad-free replay buffer, and multi-language audio switch.', 'proof', 1],
        ['Cricbuzz Ball by Ball', 'Sports Analytics & News', '/assets/Apps Icons/7dd2f6c0-3968-403e-bfc1-3b428fb6812a.jpg', 'https://www.cricbuzz.com/', 'Review ball-by-ball commentary sync accuracy, live win probability graphs, and push notification speed.', 'proof', 1],
        ['Binance Pro Crypto', 'Digital Assets & Trading', '/assets/Apps Icons/89ff8a78-4037-4d77-ab9d-f19632941e9e.jpg', 'https://www.binance.com/', 'Audit candlestick technical chart response, P2P escrow payment verification, and price alert alerts.', 'proof', 1],
        ['Duolingo Language Quest', 'AI Education & Learning', '/assets/Apps Icons/95ed9ece-3f29-4ec2-ba7d-22798de21864.jpg', 'https://www.duolingo.com/', 'Test speech pronunciation AI voice recognition, interactive lesson streak counter, and audio lesson clips.', 'proof', 1],
        ['Canva Design Studio', 'Graphics & Visual Content', '/assets/Apps Icons/9740210f-818f-4c1a-a17d-a017105b0f1f.jpg', 'https://www.canva.com/', 'Verify drag-and-drop template editor responsiveness, background remover AI tool, and high-res image export.', 'proof', 1],
        ['CapCut Video Studio Pro', 'Video Editing & Effects', '/assets/Apps Icons/97407e33-43f3-443b-a79c-254aa9e3ca13.jpg', 'https://www.capcut.com/', 'Evaluate multi-layer video timeline scrubbing, auto-subtitle speech generator, and 4K 60fps video export.', 'proof', 1],
        ['Spotify Music & Podcasts', 'Audio Streaming & Discovery', '/assets/Apps Icons/a67fe4e6-900f-49ad-9457-18790efa0f51.jpg', 'https://spotify.com/', 'Test seamless song crossfade transitions, offline high-quality audio playback, and personalized playlist generator.', 'proof', 1],
        ['Telegram Messenger X', 'Encrypted Cloud Messaging', '/assets/Apps Icons/c625c119-ca84-4407-a899-79c8ab8e0f4b.jpg', 'https://telegram.org/', 'Evaluate secret end-to-end encrypted chat latency, 2GB large file upload speed, and group poll creation.', 'proof', 1]
      ];

      for (const t of DEFAULT_25_TASKS) {
        const [existing] = await pool.execute('SELECT id FROM task_library WHERE title=? LIMIT 1', [t[0]]);
        if (!existing.length) {
          await pool.execute(
            'INSERT INTO task_library (title, category, app_icon, app_url, description, verification_type, active) VALUES (?,?,?,?,?,?,?)',
            t
          );
        } else {
          await pool.execute(
            'UPDATE task_library SET category=?, app_icon=?, app_url=?, description=?, verification_type=?, active=? WHERE id=?',
            [t[1], t[2], t[3], t[4], t[5], t[6], existing[0].id]
          );
        }
      }
    } catch (e) {
      console.error('Task library seed error:', e);
    }

    // Export history table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS export_history (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        export_date DATE NOT NULL,
        export_time TIME NOT NULL,
        total_users INT UNSIGNED NOT NULL DEFAULT 0,
        total_leaders INT UNSIGNED NOT NULL DEFAULT 0,
        count_a INT UNSIGNED NOT NULL DEFAULT 0,
        count_b INT UNSIGNED NOT NULL DEFAULT 0,
        count_c INT UNSIGNED NOT NULL DEFAULT 0,
        file_type VARCHAR(10) NOT NULL DEFAULT 'xlsx',
        file_path VARCHAR(500) NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Banned & deleted credentials blacklist table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS banned_credentials (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        email VARCHAR(190) NOT NULL,
        phone VARCHAR(40) NULL,
        full_name VARCHAR(120) NULL,
        reason VARCHAR(255) DEFAULT 'Account deleted and blacklisted by administrator',
        banned_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_banned_email (email),
        INDEX idx_banned_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure complete 10-segment default wheel configuration in site_settings
    const defaultNumbers = [50, 100, 200, 300, 450, 500, 550, 600, 650, 700];
    const segmentColors = [
      '#7c3aed', '#db2777', '#2563eb', '#d97706', '#9333ea',
      '#e11d48', '#059669', '#0891b2', '#4f46e5', '#ca8a04'
    ];
    const defaultSegments = defaultNumbers.map((n, idx) => ({
      id: idx + 1,
      label: `Rs. ${Number(n).toLocaleString()}`,
      reward: Number(n),
      weight: 10,
      color: segmentColors[idx % segmentColors.length]
    }));

    const defaultWheelConfig = {
      enabled: true,
      dailyLimit: 1,
      prizeSegmentsRaw: '50, 100, 200, 300, 450, 500, 550, 600, 650, 700',
      prizeSegments: defaultNumbers,
      defaultWinAmount: '100',
      depositAutoWinPrize: '200',
      autoRechargeSpin: true,
      segments: defaultSegments
    };

    const [[existingWheelSetting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_config' LIMIT 1`);
    if (!existingWheelSetting || !existingWheelSetting.value_json) {
      await pool.execute(`INSERT INTO site_settings (setting_key, value_json) VALUES ('lucky_wheel_config', ?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json)`, [JSON.stringify(defaultWheelConfig)]);
    } else {
      try {
        const parsed = JSON.parse(existingWheelSetting.value_json);
        if (!parsed.prizeSegmentsRaw || !parsed.segments || parsed.segments.length !== 10) {
          await pool.execute(`UPDATE site_settings SET value_json=? WHERE setting_key='lucky_wheel_config'`, [JSON.stringify({ ...defaultWheelConfig, ...parsed, segments: defaultSegments, prizeSegmentsRaw: defaultWheelConfig.prizeSegmentsRaw, prizeSegments: defaultNumbers })]);
        }
      } catch {}
    }

    // Default Bank & Recharge Methods Setup
    const defaultPaymentMethods = [
      {
        id: 'jazzcash',
        name: 'JazzCash',
        accountLabel: 'JazzCash Business Till',
        accountName: 'Code Clever Payments',
        accountNumber: '03254138875',
        instructions: 'Pay to the business till and upload your payment screenshot.',
        qrCode: '',
        status: 'active',
        logo: '/assets/Wallets/jazzcash.svg'
      },
      {
        id: 'sadapay',
        name: 'SadaPay',
        accountLabel: 'SadaPay account number',
        accountName: 'Code Clever Treasury',
        accountNumber: '03254138875',
        instructions: 'Pay to the SadaPay account and upload your payment screenshot.',
        qrCode: '',
        status: 'active',
        logo: '/assets/Wallets/sadapay.svg'
      },
      {
        id: 'easypaisa',
        name: 'Easypaisa',
        accountLabel: 'Easypaisa Mobile Account',
        accountName: 'Code Clever Finance',
        accountNumber: '03451234567',
        instructions: 'Send money to the Easypaisa number and submit the transaction ID.',
        qrCode: '',
        status: 'active',
        logo: '/assets/Wallets/easypaisa.svg'
      },
      {
        id: 'nayapay',
        name: 'NayaPay',
        accountLabel: 'NayaPay Wallet ID',
        accountName: 'Code Clever Operations',
        accountNumber: '@codeclever',
        instructions: 'Transfer to the NayaPay ID and upload the payment receipt.',
        qrCode: '',
        status: 'active',
        logo: '/assets/Wallets/nayapay.svg'
      }
    ];

    const [[existingBankSetting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='payment_methods_config' LIMIT 1`);
    if (!existingBankSetting || !existingBankSetting.value_json) {
      await pool.execute(`INSERT INTO site_settings (setting_key, value_json) VALUES ('payment_methods_config', ?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json)`, [JSON.stringify(defaultPaymentMethods)]);
    }

    // Default require_active_plan_to_refer Setting
    await pool.execute(`INSERT INTO site_settings (setting_key, value_json) VALUES ('require_active_plan_to_refer', 'true') ON DUPLICATE KEY UPDATE value_json=value_json`);

    // Ensure app_icon in task_library is LONGTEXT
    await pool.execute(`ALTER TABLE task_library MODIFY COLUMN app_icon LONGTEXT NULL`).catch(() => {});

    // Ensure Master Administrator user account (faizanbarvi786@gmail.com / Faizan@0687)
    const adminEmail = 'faizanbarvi786@gmail.com';
    const adminPass = 'Faizan@0687';
    const adminHash = await bcrypt.hash(adminPass, 10);
    
    const [[existingAdmin]] = await pool.execute(`SELECT id FROM users WHERE email = ?`, [adminEmail]);
    if (!existingAdmin) {
      const [u] = await pool.execute(`
        INSERT INTO users (full_name, email, password_hash, referral_code, role, status)
        VALUES ('Faizan (Admin)', ?, ?, 'ADMIN01', 'admin', 'active')
      `, [adminEmail, adminHash]);
      await pool.execute(`INSERT IGNORE INTO wallets (user_id) VALUES (?)`, [u.insertId]);
      await pool.execute(`INSERT IGNORE INTO user_spins (user_id, bonus_spins) VALUES (?, 999)`, [u.insertId]);
    } else {
      await pool.execute(`
        UPDATE users
        SET password_hash = ?, role = 'admin', status = 'active'
        WHERE id = ?
      `, [adminHash, existingAdmin.id]);
      await pool.execute(`INSERT IGNORE INTO wallets (user_id) VALUES (?)`, [existingAdmin.id]);
      await pool.execute(`INSERT IGNORE INTO user_spins (user_id, bonus_spins) VALUES (?, 999)`, [existingAdmin.id]);
    }
  } catch (e) {
    console.warn('Auto DB init notice:', e.message);
  }

  // One-time backfill: compute root_leader_id + team_level for existing users
  backfillTeamLevels().catch(e => console.warn('Backfill notice:', e.message));
}
initDatabase();

// ---- Backfill existing users with referrals table entries ----
async function backfillTeamLevels() {
  try {
    // 1. Ensure composite unique constraint and indices on referrals table
    try {
      await pool.execute(`ALTER TABLE referrals DROP FOREIGN KEY fk_referred`);
      await pool.execute(`ALTER TABLE referrals DROP INDEX referred_user_id`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE referrals ADD CONSTRAINT fk_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE referrals ADD UNIQUE KEY uq_referrer_referred (referrer_id, referred_user_id)`);
    } catch {}
    try {
      await pool.execute(`ALTER TABLE referrals ADD INDEX idx_referrer_level (referrer_id, level)`);
    } catch {}

    // 2. Rebuild all 3-level relationships in referrals table from users.referred_by
    const [allUsers] = await pool.execute(`SELECT id, referred_by FROM users WHERE referred_by IS NOT NULL`);
    for (const u of allUsers) {
      let currentAncestor = u.referred_by;
      const visited = new Set([u.id]);
      for (let lvl = 1; lvl <= 3; lvl++) {
        if (!currentAncestor || visited.has(currentAncestor)) break;
        visited.add(currentAncestor);

        await pool.execute(`
          INSERT INTO referrals(referrer_id, referred_user_id, level)
          VALUES(?, ?, ?)
          ON DUPLICATE KEY UPDATE level=VALUES(level)
        `, [currentAncestor, u.id, lvl]);

        const [[parentUser]] = await pool.execute(`SELECT referred_by FROM users WHERE id=?`, [currentAncestor]);
        currentAncestor = parentUser?.referred_by || null;
      }
    }
  } catch (e) {
    console.warn('[Backfill] Error:', e.message);
  }
}

// ---- Compute team level for a new user given their direct sponsor ----
// Returns { rootLeaderId, teamLevel ('A'|'B'|'C'|null), depth } or null
async function computeTeamLevel(dbOrConn, newUserId, directSponsorId) {
  if (!directSponsorId) return null;
  try {
    // Walk UP from sponsor to find the root leader (user with no referred_by OR depth 0)
    // We also check what team_level the sponsor holds
    const [[sponsor]] = await dbOrConn.execute(
      `SELECT id, referred_by, root_leader_id, team_level, referral_depth FROM users WHERE id=?`,
      [directSponsorId]
    );
    if (!sponsor) return null;

    // Case 1: Sponsor has NO referred_by → sponsor IS the root leader
    //         New user = Level A under sponsor
    if (!sponsor.referred_by) {
      return { rootLeaderId: sponsor.id, teamLevel: 'A', depth: 1 };
    }

    // Case 2: Sponsor is already a root leader (team_level is null but has referrals)
    //         i.e. sponsor.root_leader_id is null AND sponsor.referred_by is null → handled above
    //         Sponsor has root_leader_id → determine new user's level from sponsor's level
    if (sponsor.root_leader_id) {
      if (sponsor.team_level === 'A') {
        return { rootLeaderId: sponsor.root_leader_id, teamLevel: 'B', depth: 2 };
      }
      if (sponsor.team_level === 'B') {
        return { rootLeaderId: sponsor.root_leader_id, teamLevel: 'C', depth: 3 };
      }
      if (sponsor.team_level === 'C') {
        // Sponsor is C → new user gets NO team level under root leader (beyond 3 levels)
        // But new user's OWN root_leader_id should be set to null (they start a new chain or are unattached)
        return null;
      }
    }

    // Case 3: Sponsor has referred_by but no root_leader_id yet → sponsor itself is an A-level under their sponsor
    //         Treat sponsor as A → new user is B
    // Walk up once more
    const [[grandSponsor]] = await dbOrConn.execute(
      `SELECT id, referred_by FROM users WHERE id=?`,
      [sponsor.referred_by]
    );
    if (!grandSponsor) return null;

    // Sponsor is A under grandSponsor
    if (!grandSponsor.referred_by) {
      return { rootLeaderId: grandSponsor.id, teamLevel: 'B', depth: 2 };
    }

    // Sponsor is B under some leader → new user is C
    const [[greatGrand]] = await dbOrConn.execute(
      `SELECT id, referred_by FROM users WHERE id=?`,
      [grandSponsor.referred_by]
    );
    if (!greatGrand || greatGrand.referred_by) {
      // Too deep or unknown → no team level
      return null;
    }
    return { rootLeaderId: greatGrand.id, teamLevel: 'C', depth: 3 };
  } catch (e) {
    console.error('computeTeamLevel error:', e.message);
    return null;
  }
}


async function getActivePlan(conn, userId) {
  const [rows] = await conn.execute(`
    SELECT up.id, p.id AS plan_id, p.code, p.name, p.job_bond, p.daily_task_count, p.unit_reward, p.daily_max_reward, p.monthly_max_reward, p.annual_max_reward, up.started_at, up.expires_at
    FROM user_plans up
    JOIN plans p ON p.id = up.plan_id
    WHERE up.user_id = ? AND up.status = 'active'
    LIMIT 1
  `, [userId]);

  if (rows.length) {
    return {
      ...rows[0],
      is_intern: false,
      is_trial_active: false,
      is_trial_expired: false,
      plan_id: rows[0].plan_id,
      daily_task_count: Number(rows[0].daily_task_count || 2),
      unit_reward: Number(rows[0].unit_reward || 59),
      daily_max_reward: Number(rows[0].daily_max_reward || (Number(rows[0].daily_task_count) * Number(rows[0].unit_reward))),
      monthly_max_reward: Number(rows[0].monthly_max_reward || 0)
    };
  }

  // No active paid plan: Evaluate 3-day Intern Trial based on users.created_at
  const [[u]] = await conn.execute(`SELECT created_at, full_name, role FROM users WHERE id=?`, [userId]);
  if (!u) return null;

  const now = new Date();
  const regDate = new Date(u.created_at || now);
  const diffMs = now.getTime() - regDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);
  const trialEndsAt = new Date(regDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const remainingHours = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const isTrialActive = (diffHours < 72 && remainingHours > 0) || u.role === 'admin';

  if (isTrialActive) {
    // 3-Day Free Intern Trial: Exact same as C1 (2 tasks daily, Rs. 59 unit price, Rs. 118 daily income)
    return {
      id: null,
      plan_id: 1, // Points to C1 template
      code: 'INTERN',
      name: 'Internship (3-Day Free Trial)',
      job_bond: 0,
      daily_task_count: 2,
      unit_reward: 59,
      daily_max_reward: 118,
      monthly_max_reward: 3540,
      annual_max_reward: 42480,
      is_intern: true,
      is_trial_active: true,
      is_trial_expired: false,
      trial_day: Math.min(3, diffDays + 1),
      trial_days_left: Math.max(1, 3 - diffDays),
      trial_hours_left: remainingHours,
      trial_ends_at: trialEndsAt
    };
  }

  // Trial is expired (Day 4 onwards): Locked until package activation
  return {
    id: null,
    plan_id: null,
    code: 'EXPIRED',
    name: 'Internship (Trial Expired)',
    job_bond: 0,
    daily_task_count: 0,
    unit_reward: 0,
    daily_max_reward: 0,
    monthly_max_reward: 0,
    annual_max_reward: 0,
    is_intern: true,
    is_trial_active: false,
    is_trial_expired: true,
    trial_day: 4,
    trial_days_left: 0,
    trial_hours_left: 0,
    trial_ends_at: trialEndsAt,
    locked_reason: 'Your 3-day Intern Free Trial has ended. Please activate an earning package (C1 to C9) to unlock daily tasks and resume earning.'
  };
}

async function syncUserDailyTasks(conn, userId, plan = null) {
  if (!plan) {
    plan = await getActivePlan(conn, userId);
  }
  if (!plan || plan.is_trial_expired || !plan.daily_task_count || Number(plan.daily_task_count) <= 0) {
    return [];
  }

  const taskLimit = Number(plan.daily_task_count || 2);
  const unitReward = Number(plan.unit_reward || 59);

  // Fetch all active tasks from task_library
  const [libs] = await conn.execute('SELECT id FROM task_library WHERE active=1 ORDER BY id ASC');
  if (!libs.length) return [];

  // Ensure daily_tasks entries exist for library items for today
  for (let i = 0; i < libs.length; i++) {
    await conn.execute(
      `INSERT INTO daily_tasks(task_date, task_library_id) VALUES(CURDATE(),?) ON DUPLICATE KEY UPDATE active=1`,
      [libs[i].id]
    );
  }

  // Check existing assignments for today
  const [existingAssignments] = await conn.execute(`
    SELECT uta.id, uta.status, uta.reward, uta.daily_task_id
    FROM user_task_assignments uta
    JOIN daily_tasks dt ON dt.id = uta.daily_task_id
    WHERE uta.user_id = ? AND dt.task_date = CURDATE()
    ORDER BY uta.id ASC
  `, [userId]);

  const currentTotal = existingAssignments.length;

  // If user needs more tasks to fulfill plan requirements (e.g. C3 needs 8 tasks):
  if (currentTotal < taskLimit) {
    const needed = taskLimit - currentTotal;
    for (let i = 0; i < needed; i++) {
      // Cycle/repeat library tasks if library items are fewer than required daily quota
      const libIndex = (currentTotal + i) % libs.length;
      const libItem = libs[libIndex];

      const [[daily]] = await conn.execute(
        `SELECT id FROM daily_tasks WHERE task_date=CURDATE() AND task_library_id=? LIMIT 1`,
        [libItem.id]
      );

      if (daily) {
        try {
          await conn.execute(
            `INSERT INTO user_task_assignments(user_id, daily_task_id, plan_id, reward, status)
             VALUES(?, ?, ?, ?, 'available')`,
            [userId, daily.id, plan.plan_id || 1, unitReward]
          );
        } catch {}
      }
    }
  }

  // Update reward and plan_id on non-completed assignments to match active tier rate
  await conn.execute(`
    UPDATE user_task_assignments uta
    JOIN daily_tasks dt ON dt.id = uta.daily_task_id
    SET uta.reward = ?, uta.plan_id = ?
    WHERE uta.user_id = ? AND dt.task_date = CURDATE() AND uta.status != 'completed'
  `, [unitReward, plan.plan_id || 1, userId]);
}

async function recordReferralChain(conn, newUserId, directReferrerId) {
  if (!directReferrerId || !newUserId) return;
  try {
    const [[newUser]] = await conn.execute(`SELECT id, full_name, email FROM users WHERE id=?`, [newUserId]);
    const newUserName = newUser?.full_name || 'A new member';

    // Walk up up to 3 generations from directReferrerId
    // Level 1: direct sponsor (Level A of directReferrerId)
    // Level 2: sponsor's sponsor (Level B of that sponsor)
    // Level 3: sponsor of Level 2 (Level C of that sponsor)
    let currentAncestor = directReferrerId;
    const visited = new Set([newUserId]);

    for (let lvl = 1; lvl <= 3; lvl++) {
      if (!currentAncestor || visited.has(currentAncestor)) break;
      visited.add(currentAncestor);

      await conn.execute(`
        INSERT INTO referrals(referrer_id, referred_user_id, level)
        VALUES(?, ?, ?)
        ON DUPLICATE KEY UPDATE level=VALUES(level)
      `, [currentAncestor, newUserId, lvl]);

      const levelLabel = lvl === 1 ? 'Level A (Direct)' : lvl === 2 ? 'Level B (Tier 2)' : 'Level C (Tier 3)';
      const notifMsg = lvl === 1
        ? `${newUserName} registered using your invitation link. They are your direct referral (Level A).`
        : `${newUserName} joined your team network as a ${levelLabel} member.`;

      await createNotification(
        currentAncestor,
        'referral',
        `👥 New ${levelLabel} Team Member!`,
        notifMsg,
        'team'
      );

      const [[parentUser]] = await conn.execute(`SELECT referred_by FROM users WHERE id=?`, [currentAncestor]);
      currentAncestor = parentUser?.referred_by || null;
    }
  } catch (err) {
    console.error('Error recording referral chain:', err);
  }
}

function getPlanRank(planCode) {
  if (!planCode) return 0;
  const match = String(planCode).toUpperCase().match(/C(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

async function creditTeamCommissions(conn, sourceUserId, baseAmount, referenceType = 'task_reward', referenceId = 0, customNote = '') {
  if (!baseAmount || Number(baseAmount) <= 0) return [];

  // Check Killswitch for 3-Tier Referral Commissions
  const [[commSetting]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='team_commissions_enabled' LIMIT 1`);
  if (commSetting && (commSetting.value_json === 'false' || commSetting.value_json === false)) {
    return [];
  }

  // Determine source user active plan and rank
  let sourcePlan = await getActivePlan(conn, sourceUserId);
  let sourceRank = getPlanRank(sourcePlan?.code);

  // If this is plan activation, check the activated plan code
  if (referenceType === 'plan_activation' && referenceId) {
    const [[upRow]] = await conn.execute(`SELECT p.code FROM user_plans up JOIN plans p ON p.id=up.plan_id WHERE up.id=?`, [referenceId]);
    if (upRow?.code) {
      sourceRank = getPlanRank(upRow.code);
    }
  }

  // Intern free trial tasks do NOT yield commission for sponsors until member activates a paid deposit plan
  if (referenceType === 'task_reward') {
    const isPaid = sourcePlan && sourcePlan.code !== 'INTERN' && Number(sourcePlan.job_bond || 0) > 0;
    if (!isPaid || sourceRank <= 0) {
      return [];
    }
  }

  let current = sourceUserId;
  const seen = new Set();
  
  const [rates] = await conn.execute(`SELECT level, percent FROM team_reward_levels WHERE active=1 ORDER BY level ASC`);
  const rateMap = { 1: 10, 2: 5, 3: 2 };
  rates.forEach(r => { rateMap[r.level] = Number(r.percent); });

  const [[sourceUser]] = await conn.execute(`SELECT full_name, email FROM users WHERE id=?`, [sourceUserId]);
  const sourceName = sourceUser?.full_name || 'Team Member';

  const levelNames = {
    1: 'Level A (Direct)',
    2: 'Level B (Tier 2)',
    3: 'Level C (Tier 3)'
  };

  const credited = [];
  for (let lvl = 1; lvl <= 3; lvl++) {
    const [[u]] = await conn.execute(`SELECT referred_by FROM users WHERE id=?`, [current]);
    const parent = u?.referred_by;
    if (!parent || seen.has(parent)) break;
    seen.add(parent);

    // LEVEL QUALIFICATION RULE:
    // To receive commission from a downline member's recharge or task, the sponsor/upline
    // must be in the SAME level or an UPPER level (e.g. C3 sponsor gets commission from C1, C2, C3.
    // C1 sponsor gets 0 commission from C2 member).
    const parentPlan = await getActivePlan(conn, parent);
    const parentRank = getPlanRank(parentPlan?.code);

    if (parentRank < sourceRank) {
      // Sponsor is on lower tier (e.g. C1 sponsor vs C2 member) -> Not eligible for commission
      current = parent;
      continue;
    }

    const percent = rateMap[lvl] || (lvl === 1 ? 10 : lvl === 2 ? 5 : 2);
    const amount = Math.round(Number(baseAmount) * (percent / 100) * 100) / 100;

    if (amount > 0) {
      const [[w]] = await conn.execute(`SELECT id, available_balance, commission_balance FROM wallets WHERE user_id=? FOR UPDATE`, [parent]);
      if (w) {
        const commBal = Number(w.commission_balance || 0) + amount;
        await conn.execute(`UPDATE wallets SET commission_balance=?, lifetime_earned=lifetime_earned+? WHERE id=?`, [commBal, amount, w.id]);
        
        const [ledger] = await conn.execute(
          `INSERT INTO team_reward_ledger(user_id, source_user_id, level, amount, reference_type, reference_id)
           VALUES(?,?,?,?,?,?)`,
          [parent, sourceUserId, lvl, amount, referenceType, referenceId]
        );

        const lvlLabel = levelNames[lvl] || `Level ${lvl}`;
        const note = customNote ? `${lvlLabel} - ${customNote}` : `${lvlLabel} Commission (${percent}%) from ${sourceName}`;

        await conn.execute(
          `INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
           VALUES(?,?, 'team_commission','credit',?,'team_reward',?,?,?)`,
          [w.id, parent, amount, ledger.insertId || referenceId, commBal, note]
        );

        await createNotification(
          parent,
          'commission',
          `💰 ${lvlLabel} Commission Received!`,
          `Rs. ${amount.toLocaleString()} credited to your balance (${percent}% from ${sourceName} - Plan ${sourcePlan?.code || ''}).`,
          'team'
        );

        credited.push({ userId: parent, level: lvl, amount });
      }
    }
    current = parent;
  }
  return credited;
}

// ----------------- HEALTH -----------------
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, message: 'Database unavailable' });
  }
});

// ----------------- AUTHENTICATION -----------------
// Verify whether an invitation / referral code is real or fake
app.get('/api/auth/verify-invitation/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ valid: false, message: 'Invitation code is required' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, referral_code, status FROM users WHERE UPPER(referral_code) = ? LIMIT 1`,
      [code]
    );
    if (!rows.length) {
      return res.status(404).json({ valid: false, message: 'Invalid or fake invitation code. No sponsor found.' });
    }
    const sponsor = rows[0];
    if (sponsor.status !== 'active') {
      return res.status(400).json({ valid: false, message: 'This invitation code belongs to an inactive or suspended account.' });
    }
    return res.json({
      valid: true,
      sponsorId: sponsor.id,
      sponsorName: sponsor.full_name,
      referralCode: sponsor.referral_code
    });
  } catch (err) {
    return res.status(500).json({ valid: false, message: 'Verification error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, phone, password, referralCode, securityQuestion, securityAnswer } = req.body;
  const cleanFullName = String(fullName || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').replace(/[\s\-\(\)]/g, '').trim();
  const cleanQuestion = String(securityQuestion || '').trim();
  const cleanAnswer = String(securityAnswer || '').trim().toLowerCase();

  if (!cleanFullName || !cleanEmail || !password) {
    return res.status(400).json({ message: 'Full name, email and password are required.' });
  }
  if (!cleanPhone || cleanPhone.length < 9) {
    return res.status(400).json({ message: 'A valid mobile phone number is required.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  const [[regSetting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='new_registrations' LIMIT 1`);
  if (regSetting && regSetting.value_json === 'false') {
    return res.status(403).json({ message: 'New registrations are currently disabled.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Check if email or phone is blacklisted / banned by administration
    const [banned] = await conn.execute(
      'SELECT id, reason FROM banned_credentials WHERE LOWER(email) = ? OR (phone IS NOT NULL AND phone = ?)',
      [cleanEmail, cleanPhone]
    );
    if (banned.length > 0) {
      await conn.rollback();
      return res.status(403).json({
        message: 'This email address or phone number has been banned by administration and cannot be used to create an account.'
      });
    }

    // 2. UNIQUE EMAIL CHECK
    const [existingEmail] = await conn.execute('SELECT id FROM users WHERE email=?', [cleanEmail]);
    if (existingEmail.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email address is already registered to another account.' });
    }

    // 3. UNIQUE FULL NAME CHECK (with automated unique name suggestions)
    const [existingName] = await conn.execute(
      'SELECT id FROM users WHERE LOWER(TRIM(full_name)) = LOWER(?)',
      [cleanFullName]
    );
    if (existingName.length > 0) {
      await conn.rollback();
      const rand1 = Math.floor(10 + Math.random() * 89);
      const rand2 = Math.floor(100 + Math.random() * 899);
      const suggestion1 = `${cleanFullName} ${rand1}`;
      const suggestion2 = `${cleanFullName}_${rand2}`;
      return res.status(409).json({
        message: `The name "${cleanFullName}" is already taken. Please choose a different unique name.`,
        suggestions: [suggestion1, suggestion2]
      });
    }

    // 4. UNIQUE PHONE NUMBER CHECK
    const [existingPhone] = await conn.execute(
      'SELECT id FROM users WHERE phone = ?',
      [cleanPhone]
    );
    if (existingPhone.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: 'This phone number is already registered to another account. Please use a different phone number.'
      });
    }

    const [[userCount]] = await conn.execute('SELECT COUNT(*) as c FROM users');
    const isFirstUser = Number(userCount?.c || 0) === 0;

    let referrerId = null;
    const cleanRefCode = String(referralCode || '').trim().toUpperCase();

    // STRICT INVITATION CODE ENFORCEMENT & VERIFICATION:
    if (!isFirstUser) {
      if (!cleanRefCode) {
        await conn.rollback();
        return res.status(400).json({ message: 'An invitation code is strictly required to create an account.' });
      }
      const [r] = await conn.execute('SELECT id, full_name, status, role FROM users WHERE UPPER(referral_code)=?', [cleanRefCode]);
      if (!r.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'Invalid or fake invitation code. Please check your sponsor code.' });
      }
      if (r[0].status !== 'active') {
        await conn.rollback();
        return res.status(400).json({ message: 'This invitation code belongs to an inactive or suspended account.' });
      }

      // Check if active package is required to sponsor new members
      const [[reqPlanRow]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='require_active_plan_to_refer' LIMIT 1`);
      const requireActivePlan = reqPlanRow ? (reqPlanRow.value_json === 'true' || reqPlanRow.value_json === true) : true;
      if (requireActivePlan && r[0].role !== 'admin') {
        const sponsorPlan = await getActivePlan(conn, r[0].id);
        const sponsorHasActivePaidPlan = sponsorPlan && sponsorPlan.code !== 'INTERN' && sponsorPlan.code !== 'EXPIRED' && Number(sponsorPlan.job_bond || 0) > 0;
        if (!sponsorHasActivePaidPlan) {
          await conn.rollback();
          return res.status(400).json({
            message: 'Only active package holders can sponsor new team members. Your sponsor has not activated a paid package yet.'
          });
        }
      }

      referrerId = r[0].id;
    } else if (cleanRefCode) {
      const [r] = await conn.execute('SELECT id, full_name, status, role FROM users WHERE UPPER(referral_code)=?', [cleanRefCode]);
      if (r.length && r[0].status === 'active') {
        referrerId = r[0].id;
      }
    }

    const hash = await bcrypt.hash(password, 12);
    const defaultQuestion = cleanQuestion || "What was the name of your first school?";
    const answerHash = cleanAnswer ? await bcrypt.hash(cleanAnswer, 10) : null;
    const role = isFirstUser ? 'admin' : 'user';

    // Always generate a unique non-null referral code for every registered member
    let code = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = 'CC' + Math.random().toString(36).slice(2, 9).toUpperCase();
      const [existing] = await conn.execute('SELECT id FROM users WHERE referral_code=? LIMIT 1', [candidate]);
      if (!existing.length) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = 'CC' + Date.now().toString(36).toUpperCase().slice(-7);
    }

    const [u] = await conn.execute(
      'INSERT INTO users(full_name, email, phone, password_hash, referral_code, referred_by, role, security_question, security_answer_hash) VALUES(?,?,?,?,?,?,?,?,?)',
      [cleanFullName, cleanEmail, cleanPhone, hash, code, referrerId, role, defaultQuestion, answerHash]
    );
    await conn.execute('INSERT INTO wallets(user_id) VALUES(?)', [u.insertId]);
    if (referrerId) {
      await recordReferralChain(conn, u.insertId, referrerId);
    }
    await conn.commit();

    const token = jwt.sign(
      { id: u.insertId, email: cleanEmail, role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      ok: true,
      token,
      user: {
        id: u.insertId,
        name: cleanFullName,
        full_name: cleanFullName,
        email: cleanEmail,
        referralCode: code,
        referral_code: code,
        role
      },
      wallet: {
        available_balance: 0,
        personal_balance: 0,
        commission_balance: 0,
        total_balance: 0,
        lifetime_earned: 0,
        pending_balance: 0
      },
      plan: {
        code: 'INTERN',
        name: 'Internship (3-Day Free Trial)',
        daily_task_count: 2,
        unit_reward: 59
      },
      message: 'Account created successfully.'
    });
  } catch (e) {
    await conn.rollback();
    console.error('Registration error:', e);
    res.status(500).json({ message: e.message || 'Registration failed' });
  } finally {
    conn.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const cleanEmail = String(email || identifier || '').trim().toLowerCase();

    // Check Platform Maintenance Mode
    const [[maintSetting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='maintenance_mode' LIMIT 1`);
    const isMaintenance = maintSetting && (maintSetting.value_json === 'true' || maintSetting.value_json === true);

    const [rows] = await pool.execute('SELECT id, full_name, email, password_hash, status, referral_code, role FROM users WHERE email=?', [cleanEmail]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
    }

    // If maintenance mode is active, only master admin faizanbarvi786@gmail.com can log in!
    if (isMaintenance && u.role !== 'admin' && cleanEmail !== 'faizanbarvi786@gmail.com') {
      return res.status(503).json({
        maintenance: true,
        message: 'Code Clever is currently under scheduled maintenance and system upgrades. Public member access is temporarily paused. Please check back shortly.'
      });
    }

    if (u.status !== 'active') {
      return res.status(403).json({ message: 'Account is suspended or pending activation.' });
    }
    await pool.execute(`UPDATE users SET last_login_at=NOW() WHERE id=?`, [u.id]);
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    // Fetch immediate wallet & plan snapshot for 0ms render without secondary roundtrip
    const [[walletRow]] = await pool.execute('SELECT available_balance, commission_balance, lifetime_earned, pending_balance FROM wallets WHERE user_id=?', [u.id]);
    const plan = await getActivePlan(pool, u.id);

    const avail = Number(walletRow?.available_balance || 0);
    const comm = Number(walletRow?.commission_balance || 0);

    res.json({
      token,
      user: {
        id: u.id,
        name: u.full_name,
        full_name: u.full_name,
        email: u.email,
        referralCode: u.referral_code,
        referral_code: u.referral_code,
        role: u.role
      },
      wallet: {
        available_balance: avail,
        personal_balance: avail,
        commission_balance: comm,
        total_balance: avail + comm,
        lifetime_earned: Number(walletRow?.lifetime_earned || 0),
        pending_balance: Number(walletRow?.pending_balance || 0)
      },
      plan: plan ? {
        code: plan.code,
        name: plan.name,
        daily_task_count: plan.daily_task_count,
        unit_reward: plan.unit_reward
      } : {
        code: 'INTERN',
        name: 'Internship (3-Day Free Trial)',
        daily_task_count: 2,
        unit_reward: 59
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    if (err.code === 'ECONNREFUSED') {
      return res.status(500).json({ message: 'Database is currently unreachable. Please verify your MySQL / TiDB connection.' });
    }
    res.status(500).json({ message: err.message || 'Login service unavailable.' });
  }
});

// ----------------- DEDICATED ADMIN AUTHENTICATION -----------------
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    const allowedAdminEmails = ['faizan0687@gmail.com', 'faizanbarvi786@gmail.com'];

    const [rows] = await pool.execute(
      'SELECT id, full_name, email, password_hash, status, referral_code, role FROM users WHERE email=?',
      [cleanEmail]
    );
    const u = rows[0];
    if (!u) {
      return res.status(401).json({ message: 'Invalid admin credentials. Account not found.' });
    }

    if (u.role !== 'admin' && !allowedAdminEmails.includes(cleanEmail)) {
      return res.status(403).json({ message: 'Access Denied: Administrator privileges required.' });
    }

    if (!(await bcrypt.compare(password || '', u.password_hash))) {
      return res.status(401).json({ message: 'Invalid admin credentials. Please enter the correct password.' });
    }

    if (u.status !== 'active') {
      return res.status(403).json({ message: 'Administrator account is not in active status.' });
    }

    if (u.role !== 'admin') {
      await pool.execute(`UPDATE users SET role='admin' WHERE id=?`, [u.id]);
      u.role = 'admin';
    }

    await pool.execute(`UPDATE users SET last_login_at=NOW() WHERE id=?`, [u.id]);
    const token = jwt.sign({ id: u.id, email: u.email, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({
      ok: true,
      token,
      user: {
        id: u.id,
        name: u.full_name,
        full_name: u.full_name,
        email: u.email,
        referralCode: u.referral_code,
        referral_code: u.referral_code,
        role: 'admin'
      },
      message: 'Admin authorization granted successfully.'
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Admin authentication service error' });
  }
});

// ----------------- HOME DASHBOARD -----------------
app.get('/api/home', auth, async (req, res) => {
  try {
    const [
      [[wallet]],
      [[userRow]],
      planObj,
      [[todayTasks]],
      [[monthlyEarned]],
      [[teamEarned]],
      [[teamRow]],
      [activities]
    ] = await Promise.all([
      pool.execute('SELECT available_balance, commission_balance, pending_balance, lifetime_earned FROM wallets WHERE user_id=?', [req.user.id]),
      pool.execute('SELECT full_name, referral_code FROM users WHERE id=?', [req.user.id]),
      getActivePlan(pool, req.user.id),
      pool.execute(`
        SELECT 
          COUNT(*) as tasks_total,
          SUM(status = 'completed') as tasks_completed,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN reward ELSE 0 END), 0) as today_earned
        FROM user_task_assignments uta
        JOIN daily_tasks dt ON dt.id = uta.daily_task_id
        WHERE uta.user_id = ? AND dt.task_date = CURDATE()
      `, [req.user.id]),
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) as monthly_earned
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
      `, [req.user.id]),
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) as team_earned
        FROM team_reward_ledger
        WHERE user_id = ?
      `, [req.user.id]),
      pool.execute('SELECT COUNT(*) AS total_members FROM users WHERE referred_by=?', [req.user.id]),
      pool.execute(`
        SELECT id, action, entity_type, created_at
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY id DESC LIMIT 10
      `, [req.user.id])
    ]);

    const personalBal = Number(wallet?.available_balance || 0);
    const commBal = Number(wallet?.commission_balance || 0);
    const totalBal = personalBal + commBal;

    const walletObj = {
      available_balance: totalBal,
      total_balance: totalBal,
      personal_balance: personalBal,
      commission_balance: commBal,
      pending_balance: Number(wallet?.pending_balance || 0),
      lifetime_earned: Number(wallet?.lifetime_earned || 0)
    };

    const taskCountTotal = Number(todayTasks?.tasks_total || planObj?.daily_task_count || 2);
    const taskCountCompleted = Number(todayTasks?.tasks_completed || 0);

    res.json({
      wallet: walletObj,
      available_balance: walletObj.available_balance,
      personal_balance: personalBal,
      commission_balance: commBal,
      total_balance: totalBal,
      summary: {
        available_balance: walletObj.available_balance,
        today_earned: Number(todayTasks?.today_earned || 0),
        monthly_earned: Number(monthlyEarned?.monthly_earned || 0),
        team_earned: Number(teamEarned?.team_earned || 0),
        tasks_completed: taskCountCompleted,
        tasks_total: taskCountTotal
      },
      plan: planObj || { code: 'INTERN', daily_task_count: 2, unit_reward: 59 },
      task_progress: {
        total: taskCountTotal,
        completed: taskCountCompleted,
        percentage: Math.min(100, Math.round((taskCountCompleted / Math.max(1, taskCountTotal)) * 100))
      },
      team: {
        total_members: Number(teamRow?.total_members || 0),
        lifetime_commission: Number(teamEarned?.team_earned || 0)
      },
      profile: {
        full_name: userRow?.full_name || 'Code Clever User',
        referral_code: userRow?.referral_code || 'CC1000'
      },
      activities
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load home dashboard' });
  }
});

// ----------------- ACCURATE EARNINGS SUMMARY API -----------------
app.get('/api/user/earnings-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      [[todayRow]],
      [[yesterdayRow]],
      [[weekRow]],
      [[monthRow]],
      [[walletRow]],
      [[teamCommRow]],
      [[referralRow]],
      [[taskEarnRow]],
      [[spinEarnRow]],
      [[checkinRow]],
      planObj,
      [[taskStats]]
    ] = await Promise.all([
      // 1. Today's earnings
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND type IN ('task_reward', 'commission', 'team_commission', 'bonus', 'spin_reward', 'daily_checkin') AND DATE(created_at) = CURDATE()
      `, [userId]),
      // 2. Yesterday's earnings
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND type IN ('task_reward', 'commission', 'team_commission', 'bonus', 'spin_reward', 'daily_checkin') AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY
      `, [userId]),
      // 3. This Week's earnings (Current Week / Last 7 days)
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND type IN ('task_reward', 'commission', 'team_commission', 'bonus', 'spin_reward', 'daily_checkin')
          AND (YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) OR created_at >= CURDATE() - INTERVAL 7 DAY)
      `, [userId]),
      // 4. This Month's earnings
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND type IN ('task_reward', 'commission', 'team_commission', 'bonus', 'spin_reward', 'daily_checkin')
          AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
      `, [userId]),
      // 5. Total lifetime earnings & wallet
      pool.execute(`SELECT available_balance, commission_balance, pending_balance, lifetime_earned FROM wallets WHERE user_id = ?`, [userId]),
      // 6. Team task commission (Task commission from team members)
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM team_reward_ledger
        WHERE user_id = ? AND reference_type = 'task_reward'
      `, [userId]),
      // 7. Referral Rewards (Deposit/plan activation referral rewards)
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM team_reward_ledger
        WHERE user_id = ? AND reference_type = 'plan_activation'
      `, [userId]),
      // 8. Total Task Earnings (Task reward payouts credited)
      pool.execute(`
        SELECT COALESCE(SUM(amount), 0) AS val
        FROM wallet_transactions
        WHERE user_id = ? AND direction = 'credit' AND type = 'task_reward'
      `, [userId]),
      // 9. Total Spin Earnings (Lucky wheel cash prizes)
      pool.execute(`
        SELECT COALESCE(SUM(reward), 0) AS val
        FROM lucky_wheel_spins
        WHERE user_id = ?
      `, [userId]),
      // 10. Total Check-in Earnings (Daily check-in streak rewards)
      pool.execute(`
        SELECT COALESCE(SUM(reward), 0) AS val
        FROM daily_checkins
        WHERE user_id = ?
      `, [userId]),
      // 11. Task Counts for today
      getActivePlan(pool, userId),
      pool.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(status = 'completed') as completed
        FROM user_task_assignments uta
        JOIN daily_tasks dt ON dt.id = uta.daily_task_id
        WHERE uta.user_id = ? AND dt.task_date = CURDATE()
      `, [userId])
    ]);

    const taskTotal = Number(taskStats?.total || planObj?.daily_task_count || 2);
    const taskCompleted = Number(taskStats?.completed || 0);

    const taskEarnings = Number(taskEarnRow?.val || 0);
    const spinEarnings = Number(spinEarnRow?.val || 0);
    const checkinEarnings = Number(checkinRow?.val || 0);
    const teamCommission = Number(teamCommRow?.val || 0);
    const referralRewards = Number(referralRow?.val || 0);
    const calculatedTotal = taskEarnings + spinEarnings + checkinEarnings + teamCommission + referralRewards;

    const rawLifetime = Number(walletRow?.lifetime_earned || 0);
    // Use calculated real activity earnings so dummy seeded values never distort earnings
    const finalTotalEarned = calculatedTotal > 0 ? calculatedTotal : (rawLifetime < 10000 ? rawLifetime : 0);

    const todayEarned = Number(todayRow?.val || 0);
    const yesterdayEarned = Number(yesterdayRow?.val || 0);
    const weekVal = Number(weekRow?.val || 0);
    const monthVal = Number(monthRow?.val || 0);

    const safeMonth = monthVal > 0 ? monthVal : finalTotalEarned;
    const safeWeek = weekVal > 0 ? weekVal : (finalTotalEarned > 0 ? Math.min(finalTotalEarned, safeMonth) : 0);

    res.json({
      today_earned: todayEarned,
      yesterday_earned: yesterdayEarned,
      week_earned: safeWeek,
      monthly_earned: safeMonth,
      total_earned: finalTotalEarned,
      task_earnings: taskEarnings,
      spin_earnings: spinEarnings,
      checkin_earnings: checkinEarnings,
      team_commission: teamCommission,
      referral_rewards: referralRewards,
      completed_tasks: taskCompleted,
      remaining_tasks: Math.max(0, taskTotal - taskCompleted),
      personal_balance: Number(walletRow?.available_balance || 0),
      commission_balance: Number(walletRow?.commission_balance || 0)
    });
  } catch (e) {
    console.error('Earnings summary error:', e);
    res.status(500).json({ message: 'Failed to calculate earnings summary' });
  }
});

// ----------------- PROFILE & SETTINGS -----------------
app.get('/api/profile', auth, async (req, res) => {
  try {
    const [[[u]], [[p]]] = await Promise.all([
      pool.execute(`SELECT id, full_name, email, phone, avatar_url, referral_code, status, role FROM users WHERE id=?`, [req.user.id]),
      pool.execute(`SELECT p.name AS plan_name, p.code AS plan_code FROM user_plans up JOIN plans p ON p.id=up.plan_id WHERE up.user_id=? AND up.status='active' LIMIT 1`, [req.user.id])
    ]);
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json({ ...u, name: u.full_name, plan_name: p?.plan_name || 'No Active Plan', plan_code: p?.plan_code || null });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

app.put('/api/profile', auth, async (req, res) => {
  const name = String(req.body.full_name || req.body.fullName || req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const avatar = req.body.avatar_url || req.body.avatarUrl || req.body.avatar || '';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[currentUser]] = await conn.execute(`SELECT id, full_name, email FROM users WHERE id=?`, [req.user.id]);
    if (!currentUser) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const email = String(req.body.email || currentUser.email || '').trim().toLowerCase();
    const finalName = name || currentUser.full_name || 'Code Clever User';

    if (!finalName) {
      await conn.rollback();
      return res.status(400).json({ message: 'Full name is required' });
    }

    const [dup] = await conn.execute(`SELECT id FROM users WHERE email=? AND id<>?`, [email, req.user.id]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email is already registered to another account.' });
    }

    // Check unique full name
    const [dupName] = await conn.execute(
      'SELECT id FROM users WHERE LOWER(TRIM(full_name)) = LOWER(?) AND id <> ?',
      [finalName, req.user.id]
    );
    if (dupName.length) {
      await conn.rollback();
      return res.status(409).json({ message: `The name "${finalName}" is already in use by another member. Please choose a unique name.` });
    }

    // Check unique phone number
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)]/g, '').trim() : null;
    if (cleanPhone) {
      const [dupPhone] = await conn.execute(
        'SELECT id FROM users WHERE phone = ? AND id <> ?',
        [cleanPhone, req.user.id]
      );
      if (dupPhone.length) {
        await conn.rollback();
        return res.status(409).json({ message: 'This phone number is already registered to another account.' });
      }
    }

    await conn.execute(
      `UPDATE users SET full_name=?, email=?, phone=?, avatar_url=? WHERE id=?`,
      [finalName, email, cleanPhone || currentUser.phone, avatar, req.user.id]
    );

    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, metadata) VALUES(?,?,?,?)`,
      [req.user.id, 'profile_updated', 'user', JSON.stringify({ fields: ['full_name', 'email', 'phone', 'avatar_url'] })]
    );
    await conn.commit();
    res.json({ ok: true, message: 'Profile updated successfully.', user: { full_name: finalName, email, phone, avatar_url: avatar } });
  } catch (e) {
    await conn.rollback();
    console.error('Profile update error:', e);
    res.status(500).json({ message: 'Profile update failed' });
  } finally {
    conn.release();
  }
});

// ----------------- FUND PASSWORD ENDPOINTS -----------------
app.get('/api/settings/fund-password-status', auth, async (req, res) => {
  try {
    const [[row]] = await pool.execute(`SELECT settings_json FROM user_settings WHERE user_id=? AND setting_key='fund_password'`, [req.user.id]);
    let isSet = false;
    if (row && row.settings_json) {
      try {
        const parsed = JSON.parse(row.settings_json);
        if (parsed.pin || parsed.pinHash) isSet = true;
      } catch {}
    }
    res.json({ isSet });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch fund password status' });
  }
});

app.post('/api/settings/fund-password', auth, async (req, res) => {
  const { currentFundPassword, newFundPassword, accountPassword } = req.body;
  const newPin = String(newFundPassword || '').trim();

  if (!/^\d{6}$/.test(newPin)) {
    return res.status(400).json({ message: 'Fund password must be exactly 6 numeric digits (0-9).' });
  }

  try {
    const [[row]] = await pool.execute(`SELECT settings_json FROM user_settings WHERE user_id=? AND setting_key='fund_password'`, [req.user.id]);
    let existingPin = null;
    let existingHash = null;
    if (row && row.settings_json) {
      try {
        const parsed = JSON.parse(row.settings_json);
        existingPin = parsed.pin;
        existingHash = parsed.pinHash;
      } catch {}
    }

    if (existingPin || existingHash) {
      // User is CHANGING existing fund password:
      let valid = false;
      if (currentFundPassword) {
        if (existingHash) {
          valid = await bcrypt.compare(String(currentFundPassword), existingHash);
        } else if (existingPin) {
          valid = String(currentFundPassword) === String(existingPin);
        }
      }
      if (!valid && accountPassword) {
        const [[u]] = await pool.execute(`SELECT password_hash FROM users WHERE id=?`, [req.user.id]);
        if (u && (await bcrypt.compare(String(accountPassword), u.password_hash))) {
          valid = true;
        }
      }

      if (!valid) {
        return res.status(400).json({ message: 'Current fund password or account password is incorrect.' });
      }
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    const data = JSON.stringify({ pin: newPin, pinHash, updatedAt: new Date().toISOString() });
    await pool.execute(
      `INSERT INTO user_settings(user_id, setting_key, settings_json)
       VALUES(?, 'fund_password', ?)
       ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)`,
      [req.user.id, data]
    );

    res.json({
      ok: true,
      isSet: true,
      message: (existingPin || existingHash) ? 'Fund password updated successfully!' : 'Fund password created successfully!'
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update fund password.' });
  }
});

app.put('/api/settings/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  const [[u]] = await pool.execute(`SELECT password_hash FROM users WHERE id=?`, [req.user.id]);
  if (!u || !(await bcrypt.compare(String(currentPassword || ''), u.password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.execute(`UPDATE users SET password_hash=? WHERE id=?`, [hash, req.user.id]);
  await pool.execute(`INSERT INTO audit_logs(user_id, action, entity_type, metadata) VALUES(?,?,?,?)`, [req.user.id, 'password_changed', 'user', JSON.stringify({ success: true })]);
  res.json({ ok: true, message: 'Password changed successfully.' });
});

app.post('/api/settings/security', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  const [[u]] = await pool.execute(`SELECT password_hash FROM users WHERE id=?`, [req.user.id]);
  if (!u || !(await bcrypt.compare(String(currentPassword || ''), u.password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.execute(`UPDATE users SET password_hash=? WHERE id=?`, [hash, req.user.id]);
  await pool.execute(`INSERT INTO audit_logs(user_id, action, entity_type, metadata) VALUES(?,?,?,?)`, [req.user.id, 'password_changed', 'user', JSON.stringify({ success: true })]);
  res.json({ ok: true, message: 'Password changed successfully.' });
});

// ----------------- SECURITY RECOVERY QUESTION ENDPOINTS -----------------
app.get('/api/settings/security-question', auth, async (req, res) => {
  try {
    const [[user]] = await pool.execute(`SELECT security_question, security_answer_hash FROM users WHERE id=?`, [req.user.id]);
    const isSet = Boolean(user && user.security_answer_hash);
    const question = (user && user.security_question) || "What was the name of your first school?";
    res.json({ isSet, question });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch security question status' });
  }
});

app.post('/api/settings/security-question', auth, async (req, res) => {
  const { question, answer, accountPassword } = req.body;
  const cleanQuestion = String(question || '').trim();
  const cleanAnswer = String(answer || '').trim().toLowerCase();

  if (!cleanQuestion) {
    return res.status(400).json({ message: 'Please select a security question.' });
  }
  if (!cleanAnswer || cleanAnswer.length < 2) {
    return res.status(400).json({ message: 'Secret security answer must be at least 2 characters long.' });
  }

  try {
    const [[user]] = await pool.execute(`SELECT password_hash, security_answer_hash FROM users WHERE id=?`, [req.user.id]);
    if (user && user.security_answer_hash && accountPassword) {
      const isPassValid = await bcrypt.compare(String(accountPassword), user.password_hash);
      if (!isPassValid) {
        return res.status(400).json({ message: 'Current account password is incorrect.' });
      }
    }

    const answerHash = await bcrypt.hash(cleanAnswer, 10);
    await pool.execute(
      `UPDATE users SET security_question=?, security_answer_hash=? WHERE id=?`,
      [cleanQuestion, answerHash, req.user.id]
    );

    res.json({ ok: true, isSet: true, message: 'Security recovery question and answer updated successfully!' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update security question.' });
  }
});

app.get('/api/settings/:key', auth, async (req, res) => {
  const [[row]] = await pool.execute(`SELECT settings_json FROM user_settings WHERE user_id=? AND setting_key=?`, [req.user.id, req.params.key]);
  let settings = {};
  try { settings = row ? JSON.parse(row.settings_json) : {}; } catch {}
  res.json({ settings });
});

app.put('/api/settings/:key', auth, async (req, res) => {
  const settings = JSON.stringify(req.body.settings || {});
  await pool.execute(
    `INSERT INTO user_settings(user_id, setting_key, settings_json)
     VALUES(?,?,?)
     ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json), updated_at=NOW()`,
    [req.user.id, req.params.key, settings]
  );
  res.json({ ok: true, message: 'Settings saved.' });
});

// ----------------- PLANS -----------------
app.get('/api/plans', auth, async (req, res) => {
  try {
    const [plansResult, [[activePlan]], [[wallet]]] = await Promise.all([
      pool.execute(`SELECT id, code, name, job_bond, daily_task_count, unit_reward, daily_max_reward, monthly_max_reward, annual_max_reward, is_locked, active FROM plans WHERE active=1 ORDER BY id`).catch(() => 
        pool.execute(`SELECT id, code, name, job_bond, daily_task_count, unit_reward, daily_max_reward, monthly_max_reward, annual_max_reward, 0 AS is_locked, active FROM plans WHERE active=1 ORDER BY id`)
      ),
      pool.execute(`SELECT p.id, p.code, p.name, p.job_bond, p.daily_task_count, p.unit_reward, p.daily_max_reward, p.monthly_max_reward, p.annual_max_reward, up.started_at, up.expires_at FROM user_plans up JOIN plans p ON p.id=up.plan_id WHERE up.user_id=? AND up.status='active' LIMIT 1`, [req.user.id]),
      pool.execute(`SELECT available_balance, commission_balance, pending_balance, lifetime_earned FROM wallets WHERE user_id=?`, [req.user.id])
    ]);

    const plans = plansResult[0] || [];
    const personalBal = Number(wallet?.available_balance || 0);
    const commBal = Number(wallet?.commission_balance || 0);
    const totalBal = personalBal + commBal;

    const walletObj = {
      available_balance: totalBal,
      total_balance: totalBal,
      personal_balance: personalBal,
      commission_balance: commBal,
      pending_balance: Number(wallet?.pending_balance || 0),
      lifetime_earned: Number(wallet?.lifetime_earned || 0)
    };
    res.json({
      plans,
      activePlan: activePlan || null,
      wallet: walletObj,
      available_balance: totalBal,
      personal_balance: personalBal,
      commission_balance: commBal,
      total_balance: totalBal
    });
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ message: 'Failed to load plans.' });
  }
});

app.post('/api/plans/activate', auth, async (req, res) => {
  const code = String(req.body.planCode || '').trim().toUpperCase();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.execute(`SELECT * FROM plans WHERE code=? AND active=1 FOR UPDATE`, [code]);
    if (!p) {
      await conn.rollback();
      return res.status(404).json({ message: 'Plan not found or unavailable.' });
    }
    if (p.is_locked) {
      await conn.rollback();
      return res.status(403).json({ message: `Package ${code} is currently locked by administration (Coming Soon).` });
    }
    if (!['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'].includes(code)) {
      await conn.rollback();
      return res.status(403).json({ message: `Package ${code} is invalid.` });
    }
    const [[current]] = await conn.execute(`SELECT up.id, p.code, p.job_bond FROM user_plans up JOIN plans p ON p.id=up.plan_id WHERE up.user_id=? AND up.status='active' LIMIT 1 FOR UPDATE`, [req.user.id]);
    if (current?.code === code) {
      await conn.rollback();
      return res.json({ ok: true, message: `${code} is already your active plan.` });
    }
    const [[wallet]] = await conn.execute(`SELECT id, available_balance, commission_balance FROM wallets WHERE user_id=? FOR UPDATE`, [req.user.id]);
    if (!wallet) {
      await conn.rollback();
      return res.status(404).json({ message: 'Wallet not found.' });
    }
    const cost = Number(p.job_bond);
    const personalBal = Number(wallet.available_balance || 0);
    const commBal = Number(wallet.commission_balance || 0);
    const totalSpendable = personalBal + commBal;

    if (totalSpendable < cost) {
      await conn.rollback();
      return res.status(400).json({ message: `Insufficient wallet balance. ${code} requires Rs. ${fmtMoney(cost)}. Your balance is Rs. ${fmtMoney(totalSpendable)}.` });
    }
    if (current) {
      await conn.execute(`UPDATE user_plans SET status='cancelled', expires_at=NOW() WHERE id=?`, [current.id]);
    }

    let newPersonalBal = personalBal;
    let newCommBal = commBal;
    if (personalBal >= cost) {
      newPersonalBal = personalBal - cost;
      await conn.execute(`UPDATE wallets SET available_balance=? WHERE id=?`, [newPersonalBal, wallet.id]);
    } else {
      const remainder = cost - personalBal;
      newPersonalBal = 0;
      newCommBal = commBal - remainder;
      await conn.execute(`UPDATE wallets SET available_balance=0, commission_balance=? WHERE id=?`, [newCommBal, wallet.id]);
    }

    const [up] = await conn.execute(`INSERT INTO user_plans(user_id, plan_id, status) VALUES(?,?,'active')`, [req.user.id, p.id]);
    await conn.execute(
      `INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
       VALUES(?,?, 'adjustment','debit',?,'plan_activation',?,?,?)`,
      [wallet.id, req.user.id, cost, up.insertId, newPersonalBal + newCommBal, `Activated ${p.code} plan`]
    );
    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
       VALUES(?,?,?,?,?)`,
      [req.user.id, 'plan_activated', 'user_plan', up.insertId, JSON.stringify({ plan: p.code, jobBond: cost })]
    );
    await creditTeamCommissions(conn, req.user.id, cost, 'plan_activation', up.insertId, `Plan ${p.code} team activation commission`);
    
    // LUCKY WHEEL SPINS ON PACKAGE ACTIVATION:
    // For C1: 1 spin for member who activates, 1 spin for leader (sponsor)
    // For C2 to C9: 2 spins for member who activates, 1 spin for leader (sponsor)
    const memberSpins = (p.code === 'C1') ? 1 : 2;
    await grantUserSpins(conn, req.user.id, memberSpins, 'plan_activation', `🎡 ${memberSpins} Lucky Wheel spin(s) granted for activating ${p.code} package!`);

    // Grant 1 spin to direct leader / sponsor
    const [[actUser]] = await conn.execute(`SELECT full_name, referred_by FROM users WHERE id=?`, [req.user.id]);
    if (actUser?.referred_by) {
      const leaderId = actUser.referred_by;
      await grantUserSpins(
        conn,
        leaderId,
        1,
        'referral_plan_activation',
        `🎡 1 Lucky Wheel sponsor bonus spin granted because your direct team member ${actUser.full_name || 'Member'} activated ${p.code} package!`
      );
    }
    
    // AUTOMATION: Seamlessly generate/sync today's tasks according to activated tier (e.g. 8 tasks of Rs. 246 for C3)
    await syncUserDailyTasks(conn, req.user.id, { ...p, plan_id: p.id });

    // GENERATE UNIQUE REFERRAL CODE ON PACKAGE ACTIVATION (if user has none):
    const [[curUserRow]] = await conn.execute(`SELECT referral_code FROM users WHERE id=?`, [req.user.id]);
    let assignedCode = curUserRow?.referral_code;
    if (!assignedCode) {
      assignedCode = 'CC' + Math.random().toString(36).slice(2, 9).toUpperCase();
      await conn.execute(`UPDATE users SET referral_code=? WHERE id=?`, [assignedCode, req.user.id]);
    }

    const finalTotalBalance = newPersonalBal + newCommBal;
    res.json({
      ok: true,
      message: `${p.code} activated successfully.`,
      balance: finalTotalBalance,
      total_balance: finalTotalBalance,
      personal_balance: newPersonalBal,
      commission_balance: newCommBal,
      plan: { code: p.code, name: p.name },
      referralCode: assignedCode
    });
  } catch (e) {
    await conn.rollback();
    console.error('Plan activation error:', e);
    res.status(500).json({ message: 'Plan activation failed: ' + (e?.message || 'internal error') });
  } finally {
    conn.release();
  }
});
app.post('/api/plans/select', auth, async (req, res) => {
  req.url = '/api/plans/activate';
  return app._router.handle(req, res);
});

// ----------------- TASKS -----------------
app.get('/api/tasks/today', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const plan = await getActivePlan(conn, req.user.id);
    if (!plan) return res.status(404).json({ message: 'User plan profile not found' });

    // Fetch full 25 tasks from library
    const [library] = await conn.execute(`SELECT * FROM task_library WHERE active=1 ORDER BY id ASC`);

    if (plan.is_trial_expired) {
      return res.json({
        plan,
        is_locked: true,
        locked_reason: plan.locked_reason,
        tasks: [],
        library: library.map((t, idx) => ({
          ...t,
          is_unlocked: false,
          unlocked_plan_min: idx < 2 ? 'C1' : idx < 4 ? 'C2' : idx < 8 ? 'C3' : idx < 12 ? 'C4' : idx < 16 ? 'C5' : idx < 18 ? 'C6' : idx < 22 ? 'C7' : idx < 24 ? 'C8' : 'C9'
        })),
        summary: {
          total: 0,
          completed: 0,
          remaining: 0,
          earned: 0,
          maxDaily: 0
        }
      });
    }

    // Auto-sync tasks to fulfill required daily count (e.g. 8 tasks for C3, repeating if library has fewer items)
    await syncUserDailyTasks(conn, req.user.id, plan);

    const [rows] = await conn.execute(`
      SELECT uta.id AS assignment_id, uta.status, uta.reward, uta.started_at, uta.submitted_at, uta.completed_at,
             dl.task_date, tl.id AS library_id, tl.title, tl.category, tl.app_icon, tl.app_url, tl.description
      FROM user_task_assignments uta
      JOIN daily_tasks dl ON dl.id = uta.daily_task_id
      JOIN task_library tl ON tl.id = dl.task_library_id
      WHERE uta.user_id = ? AND dl.task_date = CURDATE()
      ORDER BY uta.id ASC
    `, [req.user.id]);

    const completed = rows.filter(x => x.status === 'completed').length;
    const earned = rows.filter(x => x.status === 'completed').reduce((s, x) => s + Number(x.reward), 0);

    const activeLibraryIds = new Set(rows.map(r => r.library_id));
    const fullLibraryWithStatus = library.map((t, idx) => ({
      ...t,
      is_unlocked: activeLibraryIds.has(t.id) || idx < Number(plan.daily_task_count || 2),
      is_assigned_today: activeLibraryIds.has(t.id),
      unlocked_plan_min: idx < 2 ? 'C1' : idx < 4 ? 'C2' : idx < 8 ? 'C3' : idx < 12 ? 'C4' : idx < 16 ? 'C5' : idx < 18 ? 'C6' : idx < 22 ? 'C7' : idx < 24 ? 'C8' : 'C9'
    }));

    res.json({
      plan,
      is_locked: false,
      tasks: rows,
      library: fullLibraryWithStatus,
      summary: {
        total: rows.length,
        completed,
        remaining: Math.max(rows.length - completed, 0),
        earned,
        maxDaily: Number(plan.daily_task_count || 2) * Number(plan.unit_reward || 59)
      }
    });
  } finally {
    conn.release();
  }
});

app.post('/api/tasks/:assignmentId/evaluate', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check Task Engine Killswitch
    const [[pauseSetting]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='task_assignments_paused' LIMIT 1`);
    if (pauseSetting && (pauseSetting.value_json === 'true' || pauseSetting.value_json === true)) {
      await conn.rollback();
      return res.status(403).json({ message: 'Daily task evaluations are currently paused by administration.' });
    }

    const [rows] = await conn.execute(`
      SELECT uta.*, w.id AS wallet_id, w.available_balance, w.commission_balance, tl.title AS task_title
      FROM user_task_assignments uta
      JOIN wallets w ON w.user_id=uta.user_id
      JOIN daily_tasks dt ON dt.id=uta.daily_task_id
      JOIN task_library tl ON tl.id=dt.task_library_id
      WHERE uta.id=? AND uta.user_id=? FOR UPDATE
    `, [req.params.assignmentId, req.user.id]);
    let task = rows[0];
    if (!task) {
      // Auto-recovery: If specific assignment ID is not found, sync and find next available assignment for today
      const plan = await getActivePlan(conn, req.user.id);
      await syncUserDailyTasks(conn, req.user.id, plan);
      const [availRows] = await conn.execute(`
        SELECT uta.*, w.id AS wallet_id, w.available_balance, w.commission_balance, tl.title AS task_title
        FROM user_task_assignments uta
        JOIN wallets w ON w.user_id=uta.user_id
        JOIN daily_tasks dt ON dt.id=uta.daily_task_id
        JOIN task_library tl ON tl.id=dt.task_library_id
        WHERE uta.user_id=? AND dt.task_date=CURDATE() AND uta.status != 'completed'
        ORDER BY uta.id ASC LIMIT 1 FOR UPDATE
      `, [req.user.id]);
      task = availRows[0];
      if (!task) {
        // Check if user already finished all daily tasks for today
        const [anyDone] = await conn.execute(`
          SELECT uta.reward FROM user_task_assignments uta
          JOIN daily_tasks dt ON dt.id=uta.daily_task_id
          WHERE uta.user_id=? AND dt.task_date=CURDATE() AND uta.status='completed'
          LIMIT 1
        `, [req.user.id]);
        await conn.rollback();
        if (anyDone.length) {
          return res.json({ ok: true, alreadyCompleted: true, message: 'All daily tasks for today have been completed!' });
        }
        return res.status(404).json({ message: 'No available tasks found for today.' });
      }
    }
    if (task.status === 'completed') {
      await conn.rollback();
      return res.json({ ok: true, alreadyCompleted: true, reward: Number(task.reward) });
    }
    await conn.execute(`
      UPDATE user_task_assignments SET status='completed', completed_at=NOW(), started_at=COALESCE(started_at, NOW()), submitted_at=COALESCE(submitted_at, NOW())
      WHERE id=? AND user_id=?
    `, [task.id, req.user.id]);

    const rewardAmount = Number(task.reward);
    const activePlan = await getActivePlan(conn, req.user.id);
    const isInternFree = !activePlan || activePlan.is_intern || activePlan.code === 'INTERN';

    let returnBal = 0;
    if (isInternFree) {
      // 1. Intern Free Task Reward -> Credited to Personal Wallet (available_balance)
      const newPersonalBal = Number(task.available_balance) + rewardAmount;
      await conn.execute(`
        UPDATE wallets SET available_balance=?, lifetime_earned=lifetime_earned+?
        WHERE id=?
      `, [newPersonalBal, rewardAmount, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?,?, 'task_reward','credit',?,'task',?,?,?)
      `, [task.wallet_id, req.user.id, rewardAmount, task.id, newPersonalBal, `Evaluation reward for ${task.task_title || 'Mobile App'} (Personal Wallet)`]);
      returnBal = newPersonalBal;
    } else {
      // 2. Paid Package Task Earning -> Credited to Commission Wallet (commission_balance)
      const newCommBal = Number(task.commission_balance || 0) + rewardAmount;
      await conn.execute(`
        UPDATE wallets SET commission_balance=?, lifetime_earned=lifetime_earned+?
        WHERE id=?
      `, [newCommBal, rewardAmount, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?,?, 'task_reward','credit',?,'task',?,?,?)
      `, [task.wallet_id, req.user.id, rewardAmount, task.id, newCommBal, `Evaluation reward for ${task.task_title || 'Mobile App'} (Commission Wallet)`]);
      returnBal = newCommBal;
    }

    await createNotification(
      req.user.id,
      'task',
      '🎉 Task Evaluation Reward Credited!',
      `Rs. ${rewardAmount.toLocaleString()} added to your ${isInternFree ? 'Personal' : 'Commission'} wallet for evaluating ${task.task_title || 'App'}.`,
      'tasks'
    );

    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata) VALUES(?,?,?,?,?)`,
      [req.user.id, 'task_completed', 'user_task_assignment', task.id, JSON.stringify({ reward: rewardAmount, taskTitle: task.task_title, isInternFree })]
    );

    // Multi-tier upline commission (Level A 10%, Level B 5%, Level C 2%)
    await creditTeamCommissions(conn, req.user.id, rewardAmount, 'task_reward', task.id, `Evaluation commission from ${task.task_title || 'App'}`);

    await conn.commit();
    res.json({ ok: true, reward: rewardAmount, balance: returnBal, message: `Rs. ${rewardAmount} credited to your ${isInternFree ? 'Personal' : 'Commission'} Wallet!` });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Could not evaluate task' });
  } finally {
    conn.release();
  }
});

app.post('/api/tasks/generate-today', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const plan = await getActivePlan(conn, req.user.id);
    if (!plan) {
      await conn.rollback();
      return res.status(400).json({ message: 'No active plan' });
    }
    const [libs] = await conn.execute('SELECT id FROM task_library WHERE active=1 ORDER BY RAND()');
    if (!libs.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'No task library entries' });
    }
    const limit = Math.min(Number(plan.daily_task_count), libs.length);
    for (let i = 0; i < limit; i++) {
      await conn.execute(`INSERT INTO daily_tasks(task_date, task_library_id) VALUES(CURDATE(),?) ON DUPLICATE KEY UPDATE active=1`, [libs[i].id]);
      const [[daily]] = await conn.execute(`SELECT id FROM daily_tasks WHERE task_date=CURDATE() AND task_library_id=?`, [libs[i].id]);
      await conn.execute(`INSERT INTO user_task_assignments(user_id, daily_task_id, plan_id, reward) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE reward=VALUES(reward)`, [req.user.id, daily.id, plan.plan_id, plan.unit_reward]);
    }
    await conn.commit();
    res.json({ ok: true, assigned: limit });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Could not generate tasks' });
  } finally {
    conn.release();
  }
});

app.get('/api/tasks/library', auth, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM task_library WHERE active=1 ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch task library' });
  }
});

app.post('/api/tasks/:assignmentId/start', auth, async (req, res) => {
  const [r] = await pool.execute(`
    UPDATE user_task_assignments
    SET status='started', started_at=COALESCE(started_at,NOW())
    WHERE id=? AND user_id=? AND status='available'
  `, [req.params.assignmentId, req.user.id]);
  if (!r.affectedRows) return res.status(409).json({ message: 'Task is not available' });
  res.json({ ok: true });
});

app.post('/api/tasks/:assignmentId/submit', auth, async (req, res) => {
  const proofUrl = String(req.body.proofUrl || '').trim() || null;
  if (!proofUrl || proofUrl.length > 2000000) {
    return res.status(400).json({ message: 'Valid proof is required.' });
  }
  const [r] = await pool.execute(`
    UPDATE user_task_assignments
    SET status='submitted', proof_url=?, submitted_at=NOW()
    WHERE id=? AND user_id=? AND status='started'
  `, [proofUrl, req.params.assignmentId, req.user.id]);
  if (!r.affectedRows) return res.status(409).json({ message: 'Task must be started before submission' });
  res.json({ ok: true, message: 'Task submitted for verification' });
});

app.post('/api/tasks/:assignmentId/complete', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(`
      SELECT uta.*, w.id AS wallet_id, w.available_balance, w.commission_balance
      FROM user_task_assignments uta
      JOIN wallets w ON w.user_id=uta.user_id
      WHERE uta.id=? AND uta.user_id=? FOR UPDATE
    `, [req.params.assignmentId, req.user.id]);
    const task = rows[0];
    if (!task) {
      await conn.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.status !== 'submitted') {
      await conn.rollback();
      return res.status(409).json({ message: 'Submit task proof before verification' });
    }
    await conn.execute(`
      UPDATE user_task_assignments SET status='completed', completed_at=NOW()
      WHERE id=? AND user_id=?
    `, [task.id, req.user.id]);

    const activePlan = await getActivePlan(conn, req.user.id);
    const isInternFree = !activePlan || activePlan.is_intern || activePlan.code === 'INTERN';

    let returnBal = 0;
    if (isInternFree) {
      // 1. Intern Free Task Reward -> Credited to Personal Wallet (available_balance)
      const newPersonalBal = Number(task.available_balance) + Number(task.reward);
      await conn.execute(`
        UPDATE wallets SET available_balance=?, lifetime_earned=lifetime_earned+?
        WHERE id=?
      `, [newPersonalBal, task.reward, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?,?, 'task_reward','credit',?,'task',?,?,?)
      `, [task.wallet_id, req.user.id, task.reward, task.id, newPersonalBal, 'Intern Free Task Reward (Personal Wallet)']);
      returnBal = newPersonalBal;
    } else {
      // 2. Paid Package Task Earning -> Credited to Commission Wallet (commission_balance)
      const newCommBal = Number(task.commission_balance || 0) + Number(task.reward);
      await conn.execute(`
        UPDATE wallets SET commission_balance=?, lifetime_earned=lifetime_earned+?
        WHERE id=?
      `, [newCommBal, task.reward, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?,?, 'task_reward','credit',?,'task',?,?,?)
      `, [task.wallet_id, req.user.id, task.reward, task.id, newCommBal, `Task Earning (Commission Wallet - Plan ${activePlan.code})`]);
      returnBal = newCommBal;
    }

    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata) VALUES(?,?,?,?,?)`,
      [req.user.id, 'task_completed', 'user_task_assignment', task.id, JSON.stringify({ reward: task.reward, walletTarget: isInternFree ? 'personal' : 'commission' })]
    );

    // Credit team commissions
    await creditTeamCommissions(conn, req.user.id, task.reward, 'task_reward', task.id, 'Task submission reward');

    await conn.commit();
    res.json({ ok: true, reward: Number(task.reward), balance: returnBal });
  } catch (e) {
    await conn.rollback();
    console.error('Task submit error:', e);
    res.status(500).json({ message: 'Could not complete task' });
  } finally {
    conn.release();
  }
});

// ----------------- TEAM & REFERRALS SYSTEM -----------------
app.get('/api/team', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[user]] = await conn.execute(
      `SELECT id, full_name, email, referral_code, created_at FROM users WHERE id=?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch commission levels config
    const [rateRows] = await conn.execute(
      `SELECT level, percent FROM team_reward_levels WHERE active=1 ORDER BY level ASC`
    );
    const rateMap = { 1: 10, 2: 5, 3: 2 };
    rateRows.forEach((r) => {
      rateMap[r.level] = Number(r.percent);
    });

    // Query team members across 3 tiers for this user
    const [members] = await conn.execute(
      `SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.phone,
        u.avatar_url,
        u.status,
        r.level,
        DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i') AS created_at,
        COALESCE(p.code, 'Free') AS plan_code,
        COALESCE(p.name, 'Free Tier') AS plan_name,
        COALESCE(SUM(trl.amount), 0) AS commission_generated
       FROM referrals r
       JOIN users u ON u.id = r.referred_user_id
       LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
       LEFT JOIN plans p ON p.id = up.plan_id
       LEFT JOIN team_reward_ledger trl ON trl.source_user_id = u.id AND trl.user_id = ?
       WHERE r.referrer_id = ?
       GROUP BY u.id, u.full_name, u.email, u.phone, u.avatar_url, u.status, r.level, r.created_at, p.code, p.name
       ORDER BY r.level ASC, r.created_at DESC`,
      [req.user.id, req.user.id]
    );

    // Calculate level metrics
    const level1Members = members.filter((m) => Number(m.level) === 1);
    const level2Members = members.filter((m) => Number(m.level) === 2);
    const level3Members = members.filter((m) => Number(m.level) === 3);

    // Total commission earned by this user from team_reward_ledger
    const [[commSummary]] = await conn.execute(
      `SELECT 
        COALESCE(SUM(amount), 0) AS lifetime_commission,
        COALESCE(SUM(CASE WHEN level = 1 THEN amount ELSE 0 END), 0) AS level1_commission,
        COALESCE(SUM(CASE WHEN level = 2 THEN amount ELSE 0 END), 0) AS level2_commission,
        COALESCE(SUM(CASE WHEN level = 3 THEN amount ELSE 0 END), 0) AS level3_commission
       FROM team_reward_ledger
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Recent commission ledger transactions
    const [recentCommissions] = await conn.execute(
      `SELECT 
        trl.id,
        trl.level,
        trl.amount,
        trl.reference_type,
        DATE_FORMAT(trl.created_at, '%d %b %Y • %h:%i %p') AS created_at,
        u.full_name AS source_user_name,
        u.email AS source_user_email
       FROM team_reward_ledger trl
       JOIN users u ON u.id = trl.source_user_id
       WHERE trl.user_id = ?
       ORDER BY trl.id DESC
       LIMIT 40`,
      [req.user.id]
    );

    const formattedMembers = members.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      avatar_url: m.avatar_url,
      status: m.status || 'active',
      level: Number(m.level || 1),
      level_name: Number(m.level) === 1 ? 'Level A (Direct)' : Number(m.level) === 2 ? 'Level B (Tier 2)' : 'Level C (Tier 3)',
      plan_code: m.plan_code || 'Free',
      plan_name: m.plan_name || 'Free Tier',
      created_at: m.created_at,
      commission_generated: Number(m.commission_generated || 0)
    }));

    // Determine if this user can share their referral link
    const myPlan = await getActivePlan(conn, req.user.id);
    const hasActivePaidPlan = myPlan && myPlan.code !== 'INTERN' && myPlan.code !== 'EXPIRED' && Number(myPlan.job_bond || 0) > 0;
    const [[settingRow]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='require_active_plan_to_refer' LIMIT 1`);
    const requireActivePlanToRefer = settingRow ? (settingRow.value_json === 'true' || settingRow.value_json === true) : true;
    
    // Master admin always has referral sharing enabled
    const isMasterAdmin = (user.role === 'admin' || req.user.role === 'admin' || String(user.email || '').toLowerCase() === 'faizanbarvi786@gmail.com');
    const canShareReferral = isMasterAdmin || !requireActivePlanToRefer || Boolean(hasActivePaidPlan);

    let activeRefCode = user.referral_code;
    if (canShareReferral) {
      if (!activeRefCode) {
        activeRefCode = 'CC' + Math.random().toString(36).slice(2, 9).toUpperCase();
        await conn.execute(`UPDATE users SET referral_code=? WHERE id=?`, [activeRefCode, user.id]);
        user.referral_code = activeRefCode;
      }
    } else {
      activeRefCode = null;
    }

    res.json({
      referral_code: activeRefCode,
      can_share_referral: canShareReferral,
      require_active_plan_to_refer: requireActivePlanToRefer,
      has_active_paid_plan: Boolean(hasActivePaidPlan),
      active_plan_code: myPlan?.code || 'Free',
      rates: [
        { level: 1, name: 'Level A (Direct)', code: 'A', percent: rateMap[1] || 10, description: 'Direct referrals registered with your code' },
        { level: 2, name: 'Level B (Tier 2)', code: 'B', percent: rateMap[2] || 5, description: 'Referrals invited by your Level A members' },
        { level: 3, name: 'Level C (Tier 3)', code: 'C', percent: rateMap[3] || 2, description: 'Referrals invited by your Level B members' }
      ],
      total_members: members.length,
      lifetime_commission: Number(commSummary?.lifetime_commission || 0),
      level1_count: level1Members.length,
      level1_commission: Number(commSummary?.level1_commission || 0),
      level2_count: level2Members.length,
      level2_commission: Number(commSummary?.level2_commission || 0),
      level3_count: level3Members.length,
      level3_commission: Number(commSummary?.level3_commission || 0),
      members: formattedMembers,
      recent_commissions: recentCommissions
    });
  } catch (e) {
    console.error('Error fetching team:', e);
    res.status(500).json({ message: 'Failed to load team network' });
  } finally {
    conn.release();
  }
});

// Admin Team Commission Configuration
app.get('/api/admin/team-levels', auth, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT level, percent, active FROM team_reward_levels ORDER BY level ASC`);
    const [[stats]] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT user_id) as total_affiliates,
        COALESCE(SUM(amount), 0) as total_commissions_paid,
        COUNT(*) as total_commission_transactions
      FROM team_reward_ledger
    `);
    res.json({ levels: rows, stats: stats || { total_affiliates: 0, total_commissions_paid: 0, total_commission_transactions: 0 } });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch team levels' });
  }
});

app.post('/api/admin/team-levels', auth, adminOnly, async (req, res) => {
  const { levels } = req.body;
  if (!Array.isArray(levels)) {
    return res.status(400).json({ message: 'Invalid levels payload' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const lvl of levels) {
      if (lvl.level && lvl.percent !== undefined) {
        await conn.execute(
          `INSERT INTO team_reward_levels(level, percent, active)
           VALUES(?,?,?)
           ON DUPLICATE KEY UPDATE percent=VALUES(percent), active=VALUES(active)`,
          [Number(lvl.level), Number(lvl.percent), lvl.active !== undefined ? (lvl.active ? 1 : 0) : 1]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true, message: 'Commission levels updated successfully.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to update commission levels' });
  } finally {
    conn.release();
  }
});

// ----------------- WALLET & TRANSACTIONS -----------------
app.get('/api/wallet', auth, async (req, res) => {
  try {
    const [[[w]], [transactions]] = await Promise.all([
      pool.execute('SELECT available_balance, commission_balance, pending_balance, lifetime_earned FROM wallets WHERE user_id=?', [req.user.id]),
      pool.execute(`
        SELECT id, type, direction, amount, balance_after, note, note AS description,
               DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS created_at
        FROM wallet_transactions
        WHERE user_id = ?
        ORDER BY id DESC LIMIT 50
      `, [req.user.id])
    ]);

    const personalBal = Number(w?.available_balance || 0);
    const commBal = Number(w?.commission_balance || 0);
    const totalBal = personalBal + commBal;

    const walletObj = {
      available_balance: totalBal,
      total_balance: totalBal,
      personal_balance: personalBal,
      commission_balance: commBal,
      pending_balance: Number(w?.pending_balance || 0),
      lifetime_earned: Number(w?.lifetime_earned || 0)
    };

    res.json({
      ...walletObj,
      wallet: walletObj,
      transactions
    });
  } catch {
    const fallback = { available_balance: 0, total_balance: 0, personal_balance: 0, commission_balance: 0, pending_balance: 0, lifetime_earned: 0 };
    res.json({ ...fallback, wallet: fallback, transactions: [] });
  }
});

app.get('/api/wallet/transactions', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, type, direction, amount, balance_after, note, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load transactions' });
  }
});

// ----------------- NOTIFICATIONS API -----------------
app.get('/api/notifications', auth, async (req, res) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'transactions',
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user (user_id, is_read, created_at)
      ) ENGINE=InnoDB;
    `);
    const [rows] = await pool.execute(`
      SELECT id, type, category, title, message, is_read,
             DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS time,
             created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 50
    `, [req.user.id]);
    const mapped = rows.map(r => ({
      id: r.id,
      type: r.type,
      category: r.category || 'transactions',
      title: r.title,
      message: r.message,
      unread: r.is_read === 0,
      time: r.time,
      actionUrl: r.category === 'transactions' ? (r.type.includes('withdraw') ? '/withdraw' : '/deposit') : r.category === 'tasks' ? '/tasks' : '/notifications'
    }));
    const unreadCount = mapped.filter(r => r.unread).length;
    res.json({ list: mapped, unreadCount });
  } catch (e) {
    res.json({ list: [], unreadCount: 0 });
  }
});

app.post('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ ok: true, message: 'All notifications marked as read.' });
  } catch {
    res.status(500).json({ message: 'Failed to update notifications.' });
  }
});

// ----------------- USER DEPOSITS & WITHDRAWALS HISTORY -----------------
app.get('/api/deposits/my', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, method, amount, transaction_reference AS txId, sender_name, sender_number, status, proof_image AS proofImage,
             DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS date,
             created_at
      FROM deposits
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/withdrawals/my', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, method, amount,
             COALESCE(tax_amount, ROUND(amount * 0.10, 2)) AS tax_amount,
             (amount - COALESCE(tax_amount, ROUND(amount * 0.10, 2))) AS net_amount,
             wallet_type,
             account_name AS accountTitle, account_number AS accountNumber, status,
             DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS date,
             created_at
      FROM withdrawals
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/deposits', auth, async (req, res) => {
  const { method, amount, transactionReference, txId, reference, proofImage, senderName, senderNumber, packageCode } = req.body;
  const numAmount = Number(amount);
  const cleanMethod = String(method || 'jazzcash').toLowerCase().replace(/_\d+$/, '');
  const ref = String(transactionReference || txId || reference || '').trim();
  const cleanSenderName = String(senderName || '').trim();
  const cleanSenderNumber = String(senderNumber || '').trim();
  const cleanProof = String(proofImage || '').trim();

  // STRICT COMPULSORY FIELD VALIDATIONS
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ message: 'Enter a valid positive deposit amount.' });
  }
  if (!cleanSenderName) {
    return res.status(400).json({ message: 'Sender Name (Account Holder Name) is compulsory.' });
  }
  if (!cleanSenderNumber) {
    return res.status(400).json({ message: 'Sender Account / Mobile Number is compulsory.' });
  }
  if (!ref) {
    return res.status(400).json({ message: 'Transaction ID / Reference (TID) is compulsory.' });
  }
  if (!cleanProof) {
    return res.status(400).json({ message: 'Payment proof screenshot or URL is compulsory.' });
  }

  const [[depSetting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='deposits_enabled' LIMIT 1`);
  if (depSetting && depSetting.value_json === 'false') {
    return res.status(403).json({ message: 'Deposit submissions are temporarily paused for maintenance.' });
  }

  try {
    const [dep] = await pool.execute(`
      INSERT INTO deposits(user_id, method, amount, transaction_reference, sender_name, sender_number, proof_image, status)
      VALUES(?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [req.user.id, cleanMethod, numAmount, ref, cleanSenderName, cleanSenderNumber, cleanProof]);

    await pool.execute(`
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
      VALUES(?, 'deposit_requested', 'deposit', ?, ?)
    `, [req.user.id, dep.insertId, JSON.stringify({ method: cleanMethod, amount: numAmount, reference: ref, senderName: cleanSenderName, senderNumber: cleanSenderNumber, packageCode })]);

    await createNotification(
      req.user.id,
      'deposit_submitted',
      'Deposit Request Submitted',
      `Your deposit submission of Rs. ${Number(numAmount).toLocaleString()} via ${cleanMethod.toUpperCase()} (TID: ${ref}) is pending verification.`,
      'transactions'
    );

    res.status(201).json({ ok: true, message: 'Deposit request submitted successfully. Pending admin review.', id: dep.insertId });
  } catch (e) {
    console.error('Deposit submit error:', e);
    res.status(500).json({ message: 'Deposit submission failed.' });
  }
});

app.post('/api/withdrawals', auth, async (req, res) => {
  const { method, amount, accountName, accountTitle, accountNumber, fundPassword, walletType } = req.body;
  const numAmount = Number(amount);
  const cleanMethod = String(method || 'jazzcash').toLowerCase().replace(/_\d+$/, '');
  const title = String(accountTitle || accountName || 'Account Holder').trim();
  const accNum = String(accountNumber || '').trim();

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ message: 'Enter a valid withdrawal amount.' });
  }
  if (!accNum) {
    return res.status(400).json({ message: 'Account number or IBAN is required.' });
  }

  const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='withdrawals_enabled' LIMIT 1`);
  if (setting?.value_json === 'false') {
    return res.status(403).json({ message: 'Withdrawals are temporarily disabled by the administrator.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const targetWallet = walletType === 'commission' ? 'commission' : 'personal';
    const [[wallet]] = await conn.execute(`SELECT id, available_balance, commission_balance, pending_balance FROM wallets WHERE user_id = ? FOR UPDATE`, [req.user.id]);
    if (!wallet) {
      await conn.rollback();
      return res.status(404).json({ message: 'Wallet not found.' });
    }

    // 10% Platform Tax on each withdrawal
    const taxAmount = Math.round(numAmount * 0.10 * 100) / 100;
    const netAmount = Math.round((numAmount - taxAmount) * 100) / 100;

    const personalAvail = Number(wallet.available_balance || 0);
    const commAvail = Number(wallet.commission_balance || 0);

    let balAfter = 0;
    if (targetWallet === 'commission') {
      if (commAvail < numAmount) {
        await conn.rollback();
        return res.status(400).json({ message: `Insufficient Commission Wallet balance. Available: Rs. ${Number(commAvail).toLocaleString()}` });
      }
      balAfter = commAvail - numAmount;
      const newPending = Number(wallet.pending_balance) + numAmount;
      await conn.execute(`UPDATE wallets SET commission_balance = ?, pending_balance = ? WHERE id = ?`, [balAfter, newPending, wallet.id]);
    } else {
      if (personalAvail < numAmount) {
        await conn.rollback();
        return res.status(400).json({ message: `Insufficient Personal Wallet balance. Available: Rs. ${Number(personalAvail).toLocaleString()}` });
      }
      balAfter = personalAvail - numAmount;
      const newPending = Number(wallet.pending_balance) + numAmount;
      await conn.execute(`UPDATE wallets SET available_balance = ?, pending_balance = ? WHERE id = ?`, [balAfter, newPending, wallet.id]);
    }

    const [w] = await conn.execute(`
      INSERT INTO withdrawals(user_id, method, account_name, account_number, amount, tax_amount, wallet_type, status)
      VALUES(?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [req.user.id, cleanMethod, title, accNum, numAmount, taxAmount, targetWallet]);

    const walletLabel = targetWallet === 'commission' ? 'Commission Wallet' : 'Personal Wallet';
    const txNote = `Withdrawal request from ${walletLabel} to ${cleanMethod.toUpperCase()} (${accNum}) • 10% Tax: Rs. ${taxAmount} • Net: Rs. ${netAmount}`;

    await conn.execute(`
      INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
      VALUES(?, ?, 'withdrawal', 'debit', ?, 'withdrawal', ?, ?, ?)
    `, [wallet.id, req.user.id, numAmount, w.insertId, balAfter, txNote]);

    await conn.execute(`
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
      VALUES(?, 'withdrawal_requested', 'withdrawal', ?, ?)
    `, [req.user.id, w.insertId, JSON.stringify({ method: cleanMethod, amount: numAmount, taxAmount, netAmount, accountNumber: accNum, title, walletType: targetWallet })]);

    await conn.commit();
    res.json({
      ok: true,
      message: `Withdrawal request of Rs. ${Number(numAmount).toLocaleString()} submitted successfully. 10% tax (Rs. ${taxAmount}) applied. You will receive Rs. ${netAmount}. Pending review.`,
      tax: taxAmount,
      net: netAmount,
      balance: balAfter,
      id: w.insertId
    });
  } catch (e) {
    await conn.rollback();
    console.error('Withdrawal submission error:', e);
    res.status(500).json({ message: 'Withdrawal submission failed.' });
  } finally {
    conn.release();
  }
});

// ----------------- LUCKY WHEEL -----------------
app.get('/api/wheel', auth, async (req, res) => {
  try {
    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_config' LIMIT 1`);
    let config = {
      enabled: true,
      dailyLimit: 0,
      controlMode: 'probability', // 'probability' | 'force_segment' | 'max_cap'
      forcedSegmentId: null,
      maxWinAmount: 1000,
      segments: []
    };
    if (setting?.value_json) {
      try { config = { ...config, ...JSON.parse(setting.value_json) }; } catch {}
    }

    const [[userSpinRow]] = await pool.execute(`
      SELECT bonus_spins, total_spins_granted, total_spins_used
      FROM user_spins WHERE user_id = ?
    `, [req.user.id]);

    const bonusSpins = Number(userSpinRow?.bonus_spins || 0);

    res.json({
      enabled: config.enabled !== false,
      dailyLimit: 0,
      dailyRemaining: 0,
      bonusSpins,
      remainingSpins: bonusSpins,
      segments: config.segments || []
    });
  } catch (e) {
    res.status(500).json({ message: 'Wheel configuration unavailable' });
  }
});

app.get('/api/wheel/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, segment_label, reward, spin_source, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM lucky_wheel_spins
      WHERE user_id = ?
      ORDER BY id DESC LIMIT 20
    `, [req.user.id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'History unavailable' });
  }
});

app.post('/api/wheel/spin', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[setting]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_config' LIMIT 1 FOR UPDATE`);
    let config = {
      enabled: true,
      dailyLimit: 0,
      controlMode: 'probability',
      forcedSegmentId: null,
      maxWinAmount: 1000,
      segments: []
    };
    if (setting?.value_json) {
      try { config = { ...config, ...JSON.parse(setting.value_json) }; } catch {}
    }
    if (config.enabled === false) {
      await conn.rollback();
      return res.status(403).json({ message: 'Lucky wheel is temporarily disabled.' });
    }

    const [[wheelKillswitch]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_enabled' LIMIT 1`);
    if (wheelKillswitch && (wheelKillswitch.value_json === 'false' || wheelKillswitch.value_json === false)) {
      await conn.rollback();
      return res.status(403).json({ message: 'Lucky Prize Wheel is currently disabled by administration.' });
    }

    const [[userSpinRow]] = await conn.execute(`
      SELECT id, bonus_spins, total_spins_used, locked_prize, locked_spins_count
      FROM user_spins WHERE user_id = ? FOR UPDATE
    `, [req.user.id]);

    const bonusSpins = Number(userSpinRow?.bonus_spins || 0);

    if (bonusSpins <= 0) {
      await conn.rollback();
      return res.status(403).json({
        message: 'No spins available. Lucky Wheel spins are only granted upon package activation (C1: 1 Spin, C2–C9: 2 Spins, Sponsor Leader: 1 Spin).'
      });
    }

    // Deduct 1 earned spin
    await conn.execute(`
      UPDATE user_spins
      SET bonus_spins = GREATEST(0, bonus_spins - 1), total_spins_used = total_spins_used + 1
      WHERE user_id = ?
    `, [req.user.id]);

    const spinSource = 'activation_reward';

    const segments = Array.isArray(config.segments) && config.segments.length > 0
      ? config.segments
      : [
          { id: 1, label: 'Rs. 50', reward: 50, weight: 10, color: '#7c3aed' },
          { id: 2, label: 'Rs. 100', reward: 100, weight: 10, color: '#db2777' },
          { id: 3, label: 'Rs. 200', reward: 200, weight: 10, color: '#2563eb' },
          { id: 4, label: 'Rs. 300', reward: 300, weight: 10, color: '#d97706' },
          { id: 5, label: 'Rs. 450', reward: 450, weight: 10, color: '#9333ea' },
          { id: 6, label: 'Rs. 500', reward: 500, weight: 10, color: '#e11d48' },
          { id: 7, label: 'Rs. 550', reward: 550, weight: 10, color: '#059669' },
          { id: 8, label: 'Rs. 600', reward: 600, weight: 10, color: '#0891b2' },
          { id: 9, label: 'Rs. 650', reward: 650, weight: 10, color: '#4f46e5' },
          { id: 10, label: 'Rs. 700', reward: 700, weight: 10, color: '#ca8a04' }
        ];

    let chosen = null;
    let chosenIndex = -1;

    // 1. EVALUATE USER-SPECIFIC GUARANTEED LOCKED PRIZE (From Admin Assign)
    if (userSpinRow?.locked_prize && String(userSpinRow.locked_prize) !== 'random') {
      const targetVal = Number(userSpinRow.locked_prize);
      const matchedIdx = segments.findIndex(s => Number(s.reward) === targetVal);
      if (matchedIdx !== -1) {
        chosenIndex = matchedIdx;
        chosen = segments[matchedIdx];

        // Decrement locked spins count if single use
        const remLocked = Number(userSpinRow.locked_spins_count || 1) - 1;
        if (remLocked <= 0) {
          await conn.execute(`UPDATE user_spins SET locked_prize = NULL, locked_spins_count = 0 WHERE user_id = ?`, [req.user.id]);
        } else {
          await conn.execute(`UPDATE user_spins SET locked_spins_count = ? WHERE user_id = ?`, [remLocked, req.user.id]);
        }
      }
    }

    // 2. EVALUATE GLOBAL DEFAULT WIN AMOUNT
    if (!chosen && config.defaultWinAmount && String(config.defaultWinAmount) !== 'random') {
      const defTarget = Number(config.defaultWinAmount);
      const matchedDefIdx = segments.findIndex(s => Number(s.reward) === defTarget);
      if (matchedDefIdx !== -1) {
        chosenIndex = matchedDefIdx;
        chosen = segments[matchedDefIdx];
      }
    }

    // 3. FALLBACK: WEIGHTED PROBABILITY
    if (!chosen) {
      const totalWeight = segments.reduce((sum, s) => sum + Math.max(1, Number(s.weight || 1)), 0);
      let rand = Math.random() * totalWeight;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const w = Math.max(1, Number(seg.weight || 1));
        if (rand <= w) {
          chosen = seg;
          chosenIndex = i;
          break;
        }
        rand -= w;
      }
      if (!chosen) {
        chosen = segments[0];
        chosenIndex = 0;
      }
    }

    const reward = Number(chosen.reward || 0);
    let spinInsertId = null;
    try {
      const [spin] = await conn.execute(`
        INSERT INTO lucky_wheel_spins(user_id, segment_id, segment_label, reward, spin_source)
        VALUES(?, ?, ?, ?, ?)
      `, [req.user.id, chosen.id || null, chosen.label || 'Reward', reward, spinSource]);
      spinInsertId = spin.insertId;
    } catch {
      const [spin] = await conn.execute(`
        INSERT INTO lucky_wheel_spins(user_id, segment_id, segment_label, reward)
        VALUES(?, ?, ?, ?)
      `, [req.user.id, chosen.id || null, chosen.label || 'Reward', reward]);
      spinInsertId = spin.insertId;
    }

    let newBalance = 0;
    let [[wallet]] = await conn.execute(`SELECT id, available_balance, commission_balance FROM wallets WHERE user_id = ? FOR UPDATE`, [req.user.id]);
    if (!wallet) {
      await conn.execute(`INSERT IGNORE INTO wallets(user_id, available_balance, commission_balance) VALUES(?, 0, 0)`, [req.user.id]);
      const [[createdW]] = await conn.execute(`SELECT id, available_balance, commission_balance FROM wallets WHERE user_id = ? FOR UPDATE`, [req.user.id]);
      wallet = createdW;
    }

    if (wallet) {
      newBalance = Number(wallet.commission_balance || 0);
      if (reward > 0) {
        newBalance += reward;
        await conn.execute(`
          UPDATE wallets SET commission_balance = ?, lifetime_earned = lifetime_earned + ?
          WHERE id = ?
        `, [newBalance, reward, wallet.id]);
        await conn.execute(`
          INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
          VALUES(?, ?, 'lucky_wheel', 'credit', ?, 'lucky_wheel_spin', ?, ?, ?)
        `, [wallet.id, req.user.id, reward, spinInsertId, newBalance, `Lucky Fortune Wheel Prize: ${chosen.label} (Commission Wallet)`]);

        await createNotification(
          req.user.id,
          'wallet',
          '🎡 Lucky Wheel Cash Prize Won!',
          `Congratulations! You won Rs. ${reward.toLocaleString()} on the Lucky Fortune Wheel! Amount credited to your Commission Wallet.`,
          'rewards'
        );
      }
    }

    await conn.execute(`
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
      VALUES(?, 'lucky_wheel_spun', 'lucky_wheel_spin', ?, ?)
    `, [req.user.id, spinInsertId, JSON.stringify({ reward, label: chosen.label, spinSource })]);

    await conn.commit();

    const updatedRemaining = Math.max(0, bonusSpins - 1);

    res.json({
      ok: true,
      segment_index: chosenIndex,
      segment: chosen,
      reward,
      balance: newBalance,
      remainingSpins: updatedRemaining,
      bonusSpins: updatedRemaining,
      spinSource
    });
  } catch (e) {
    console.error('Wheel spin error:', e);
    await conn.rollback();
    res.status(500).json({ message: e.message || 'Spin failed. Please try again.' });
  } finally {
    conn.release();
  }
});

// ----------------- ADMIN ROUTES -----------------
app.get('/api/admin/overview', auth, adminOnly, async (_req, res) => {
  try {
    const [[u]] = await pool.execute(`SELECT COUNT(*) AS users, SUM(status='active') AS activeUsers FROM users`);
    const [[d]] = await pool.execute(`SELECT SUM(status='pending') AS pendingDeposits, COALESCE(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END), 0) AS revenue FROM deposits`);
    const [[w]] = await pool.execute(`SELECT SUM(status='pending') AS pendingWithdrawals FROM withdrawals`);
    const [[t]] = await pool.execute(`SELECT COUNT(*) AS tasksToday FROM user_task_assignments uta JOIN daily_tasks dt ON dt.id=uta.daily_task_id WHERE dt.task_date=CURDATE()`);
    const [users] = await pool.execute(`SELECT id, full_name AS name, full_name, email, status, role, DATE_FORMAT(created_at,'%Y-%m-%d') AS joined FROM users ORDER BY id DESC LIMIT 50`);
    const [deposits] = await pool.execute(`SELECT d.id, d.method, d.amount, d.transaction_reference AS txId, d.proof_image AS proofImage, d.status, u.full_name AS userName, d.user_id AS userId FROM deposits d JOIN users u ON u.id=d.user_id ORDER BY d.id DESC LIMIT 50`);
    const [withdrawals] = await pool.execute(`
      SELECT w.id, w.method, w.amount,
             (w.amount - COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2))) AS netAmount,
             (w.amount - COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2))) AS net_amount,
             COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2)) AS fee,
             COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2)) AS tax_amount,
             w.wallet_type,
             w.account_name AS accountTitle, w.account_number AS accountNumber, w.status,
             u.full_name AS userName, w.user_id AS userId
      FROM withdrawals w
      JOIN users u ON u.id=w.user_id
      ORDER BY w.id DESC LIMIT 50
    `);
    const [plans] = await pool.execute(`SELECT id, code, name, job_bond, daily_task_count, unit_reward, active FROM plans ORDER BY id`);
    const [taskLibrary] = await pool.execute(`SELECT * FROM task_library ORDER BY id DESC`);
    const [siteSettings] = await pool.execute(`SELECT * FROM site_settings`);

    // Inquiries
    let inqs = [];
    let pendingInqs = 0;
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS support_inquiries (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          category VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          attachment_url LONGTEXT NULL,
          status ENUM('pending','replied','closed') NOT NULL DEFAULT 'pending',
          admin_reply TEXT NULL,
          replied_by BIGINT UNSIGNED NULL,
          replied_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
      try { await pool.execute(`ALTER TABLE support_inquiries ADD COLUMN attachment_url LONGTEXT NULL DEFAULT NULL`); } catch {}

      const [rows] = await pool.execute(`
        SELECT si.*, si.attachment_url AS attachmentUrl,
               CASE 
                 WHEN si.category = 'Guest Chat' THEN COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(si.message, '(Contact: ', -1), ')', 1)), ''), 'Guest Visitor')
                 ELSE COALESCE(u.full_name, 'Guest Visitor')
               END AS userName,
               CASE 
                 WHEN si.category = 'Guest Chat' THEN COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(si.message, '(Contact: ', -1), ')', 1)), ''), 'guest@code-clever.space')
                 ELSE COALESCE(u.email, 'guest@code-clever.space')
               END AS userEmail,
               COALESCE(u.phone, 'N/A') AS userPhone,
               DATE_FORMAT(si.created_at, '%d %b %Y • %h:%i %p') AS date
        FROM support_inquiries si
        LEFT JOIN users u ON u.id=si.user_id
        ORDER BY si.id DESC LIMIT 100
      `);
      inqs = rows;
      pendingInqs = inqs.filter(x => x.status === 'pending').length;
    } catch {}

    // Today's Real-Time Metrics
    const [[todayReg]] = await pool.execute(`SELECT COUNT(*) AS newUsersToday FROM users WHERE DATE(created_at) = CURDATE()`);
    const [[todayAct]] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) AS activeUsersToday FROM (
        SELECT user_id FROM user_task_assignments uta JOIN daily_tasks dt ON dt.id=uta.daily_task_id WHERE dt.task_date=CURDATE()
        UNION
        SELECT id AS user_id FROM users WHERE (DATE(created_at)=CURDATE() AND status='active')
      ) act
    `);
    const [[todayDep]] = await pool.execute(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM deposits WHERE status='pending' AND DATE(created_at)=CURDATE()`);
    const [[todayRev]] = await pool.execute(`SELECT COALESCE(SUM(amount), 0) AS revenueToday FROM deposits WHERE status='approved' AND (DATE(reviewed_at)=CURDATE() OR DATE(created_at)=CURDATE())`);
    const [[todayWdPending]] = await pool.execute(`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM withdrawals WHERE status='pending' AND DATE(created_at)=CURDATE()`);
    const [[todayWdPaid]] = await pool.execute(`SELECT COALESCE(SUM(amount), 0) AS amount FROM withdrawals WHERE status='paid' AND (DATE(reviewed_at)=CURDATE() OR DATE(created_at)=CURDATE())`);
    const [[todayTaskAssigned]] = await pool.execute(`SELECT COUNT(*) AS tasksToday FROM user_task_assignments uta JOIN daily_tasks dt ON dt.id=uta.daily_task_id WHERE dt.task_date=CURDATE()`);
    const [[todayTaskDone]] = await pool.execute(`SELECT COUNT(*) AS tasksDoneToday FROM user_task_assignments uta JOIN daily_tasks dt ON dt.id=uta.daily_task_id WHERE dt.task_date=CURDATE() AND uta.status='completed'`);

    const todayStats = {
      newUsers: Number(todayReg?.newUsersToday || 0),
      activeUsers: Math.max(Number(todayAct?.activeUsersToday || 0), Number(todayReg?.newUsersToday || 0)),
      pendingDeposits: Number(todayDep?.count || 0),
      pendingDepositsAmount: Number(todayDep?.amount || 0),
      revenueToday: Number(todayRev?.revenueToday || 0),
      pendingWithdrawals: Number(todayWdPending?.count || 0),
      pendingWithdrawalsAmount: Number(todayWdPending?.amount || 0),
      paidWithdrawalsAmount: Number(todayWdPaid?.amount || 0),
      tasksToday: Number(todayTaskAssigned?.tasksToday || 0),
      tasksDoneToday: Number(todayTaskDone?.tasksDoneToday || 0)
    };

    const generalInquiries = inqs.filter(x => x.category !== 'Password Reset');
    const passwordResetInquiries = inqs.filter(x => x.category === 'Password Reset');

    res.json({
      summary: {
        users: Number(u?.users || 0),
        activeUsers: Number(u?.activeUsers || 0),
        pendingDeposits: Number(d?.pendingDeposits || 0),
        pendingWithdrawals: Number(w?.pendingWithdrawals || 0),
        pendingInquiries: pendingInqs,
        tasksToday: Number(t?.tasksToday || 0),
        revenue: Number(d?.revenue || 0)
      },
      todayStats,
      users: Number(u?.users || 0),
      activeUsers: Number(u?.activeUsers || 0),
      pendingDeposits: Number(d?.pendingDeposits || 0),
      pendingWithdrawals: Number(w?.pendingWithdrawals || 0),
      pendingInquiries: pendingInqs,
      tasksToday: Number(t?.tasksToday || 0),
      revenue: Number(d?.revenue || 0),
      userList: users,
      depositsQueue: deposits,
      withdrawalsQueue: withdrawals,
      inquiries: inqs,
      generalInquiries,
      passwordResetInquiries,
      plans,
      taskLibrary,
      wheel: { enabled: true, segments: [] },
      siteSettings
    });
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch admin overview' });
  }
});

// Support Inquiries Endpoints (Max 1 per 24 hours per user + Screenshot attachment)
app.get('/api/support/inquiries', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, category, message, attachment_url AS attachmentUrl, status, admin_reply AS reply, DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS date
      FROM support_inquiries
      WHERE user_id = ?
      ORDER BY id DESC
    `, [req.user.id]);

    const [[cntRow]] = await pool.execute(`
      SELECT COUNT(*) AS c FROM support_inquiries
      WHERE user_id = ? AND category != 'Password Reset' AND created_at >= NOW() - INTERVAL 24 HOUR
    `, [req.user.id]);
    const dailyUsed = Number(cntRow?.c || 0);

    res.json({
      list: rows,
      dailyUsed,
      dailyLimit: 1,
      remaining: Math.max(0, 1 - dailyUsed)
    });
  } catch {
    res.json({ list: [], dailyUsed: 0, dailyLimit: 1, remaining: 1 });
  }
});

app.post('/api/support/inquiries', auth, async (req, res) => {
  const { category, message, attachment } = req.body;
  if (!message || !String(message).trim()) return res.status(400).json({ message: 'Message is required.' });

  try {
    // Check 24-Hour Limit: Max 1 general inquiry per 24 hours
    const [[cntRow]] = await pool.execute(`
      SELECT COUNT(*) AS c FROM support_inquiries
      WHERE user_id = ? AND category != 'Password Reset' AND created_at >= NOW() - INTERVAL 24 HOUR
    `, [req.user.id]);

    if (Number(cntRow?.c || 0) >= 1) {
      return res.status(429).json({
        message: 'Daily Limit Reached: You can submit a maximum of 1 general inquiry to Administration every 24 hours. Please review your active ticket replies or wait until 24 hours elapse.'
      });
    }

    const [r] = await pool.execute(`
      INSERT INTO support_inquiries(user_id, category, message, attachment_url, status)
      VALUES(?, ?, ?, ?, 'pending')
    `, [req.user.id, category || 'General Inquiry', String(message).trim(), attachment || null]);

    res.json({ ok: true, message: 'Inquiry submitted successfully.', id: r.insertId });
  } catch {
    res.status(500).json({ message: 'Could not submit inquiry.' });
  }
});

// Step 1: Look up registered security question for account
app.post('/api/auth/get-security-question', async (req, res) => {
  const { identifier } = req.body;
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return res.status(400).json({ message: 'Email address or mobile phone number is required.' });

  try {
    const [[user]] = await pool.execute(
      `SELECT id, email, phone, security_question, security_answer_hash FROM users WHERE email = ? OR phone = ? LIMIT 1`,
      [cleanId, cleanId]
    );

    if (!user) {
      return res.status(404).json({ message: 'No registered account found matching this email or mobile number.' });
    }

    const question = user.security_question || 'What was your registered childhood secret question?';
    res.json({ ok: true, question, email: user.email });
  } catch (e) {
    console.error('Get security question error:', e);
    res.status(500).json({ message: 'Could not retrieve security question.' });
  }
});

// Step 2: Verify Security Answer and log verified password recovery ticket (Max 1 per 24 hours)
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email, securityAnswer, note, sessionToken } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanAnswer = String(securityAnswer || '').trim().toLowerCase();
  const token = String(sessionToken || '').trim() || ('CC-' + Math.random().toString(36).slice(2, 8).toUpperCase());

  if (!cleanEmail) {
    return res.status(400).json({ message: 'Please enter your registered email address or phone number.' });
  }
  if (!cleanAnswer) {
    return res.status(400).json({ message: 'Please enter the answer to your security question.' });
  }

  try {
    const [[user]] = await pool.execute(
      `SELECT id, full_name, email, phone, security_question, security_answer_hash FROM users WHERE email = ? OR phone = ? LIMIT 1`,
      [cleanEmail, cleanEmail]
    );

    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this email or mobile number.' });
    }

    // Rate Limit: 1 password reset request per 24 hours
    const [[prevResetRow]] = await pool.execute(`
      SELECT id FROM support_inquiries
      WHERE user_id = ? AND category = 'Password Reset' AND created_at >= NOW() - INTERVAL 24 HOUR
      LIMIT 1
    `, [user.id]);

    if (prevResetRow) {
      return res.status(429).json({
        message: 'Daily Limit Reached: Members can only submit 1 password recovery request per 24 hours. Please check your existing ticket or wait 24 hours.'
      });
    }

    // Verify security answer if security_answer_hash is set
    if (user.security_answer_hash) {
      const isMatch = await bcrypt.compare(cleanAnswer, user.security_answer_hash);
      if (!isMatch) {
        return res.status(403).json({
          message: 'Security Verification Failed: Incorrect secret answer. Unauthorized access attempt blocked.'
        });
      }
    }

    const userId = user.id;
    const userName = user.full_name || cleanEmail;
    const msg = `[TICKET #${token}] [VERIFIED PASSWORD RESET] Account: (${userName} • ${user.email}) - Security Question Verified. Notes: ${note || 'User passed security verification and requested password reset.'}`;

    await pool.execute(
      `INSERT INTO support_inquiries(user_id, category, message, status) VALUES(?, 'Password Reset', ?, 'pending')`,
      [userId, msg]
    );

    // Save into guest chat as user query
    await pool.execute(
      `INSERT INTO guest_chat_messages(session_token, sender, message, user_email, is_pinned) VALUES(?, 'user', ?, ?, 0)`,
      [token, `🔑 Verified Password Reset Request for account "${user.email}". (Security Answer Verified ✅). Note: ${note || 'Please assist with password reset.'}`, user.email]
    );

    res.json({
      ok: true,
      sessionToken: token,
      message: 'Identity and secret question verified! Recovery ticket #' + token + ' has been submitted to Administration.'
    });
  } catch (e) {
    console.error('Forgot password submission failed:', e);
    res.status(500).json({ message: 'Could not submit reset request.' });
  }
});

// Guest Live Chatbot Endpoints (24-Hour Retention & 1 message per 24h quota)
app.get('/api/guest-chat/:sessionToken', async (req, res) => {
  const token = String(req.params.sessionToken || '').trim();
  if (!token) return res.status(400).json({ message: 'Session token is required.' });

  try {
    // 1. Auto-cleanup expired messages older than 24 hours
    await pool.execute(`DELETE FROM guest_chat_messages WHERE created_at < NOW() - INTERVAL 24 HOUR`);

    // 2. Fetch active messages for this token
    const [rows] = await pool.execute(`
      SELECT id, session_token, sender, message, is_pinned, user_email,
             DATE_FORMAT(created_at, '%h:%i %p') AS time,
             created_at
      FROM guest_chat_messages
      WHERE session_token = ?
      ORDER BY id ASC
    `, [token]);

    // 3. Check 24-hour admin ticket quota for this session (only counts messages sent to Admin)
    const [[adminTicketRow]] = await pool.execute(`
      SELECT COUNT(*) AS c FROM support_inquiries
      WHERE message LIKE ? AND created_at >= NOW() - INTERVAL 24 HOUR
    `, [`%[TICKET #${token}]%`]);

    const adminTicketCount = Number(adminTicketRow?.c || 0);

    res.json({
      ok: true,
      sessionToken: token,
      messages: rows,
      canSendAdminTicket: adminTicketCount < 1,
      adminTicketCount
    });
  } catch (e) {
    console.error('Guest chat fetch error:', e);
    res.status(500).json({ message: 'Could not fetch chat history.' });
  }
});

app.delete('/api/guest-chat/:sessionToken', async (req, res) => {
  const token = String(req.params.sessionToken || '').trim();
  if (!token) return res.status(400).json({ message: 'Session token is required.' });

  try {
    const [r] = await pool.execute('DELETE FROM guest_chat_messages WHERE session_token = ?', [token]);
    res.json({ ok: true, deletedCount: r.affectedRows, message: 'Chat history deleted permanently.' });
  } catch (e) {
    console.error('Guest chat delete error:', e);
    res.status(500).json({ message: 'Could not delete chat history.' });
  }
});

app.post('/api/guest-chat/:sessionToken', async (req, res) => {
  const token = String(req.params.sessionToken || '').trim();
  const { message, sender, email, sendToAdmin } = req.body;
  const cleanMsg = String(message || '').trim();

  if (!token || !cleanMsg) return res.status(400).json({ message: 'Token and message required.' });

  try {
    const isDirectAdminQuery = sendToAdmin === true || cleanMsg.startsWith('[ADMIN QUERY]') || cleanMsg.startsWith('📞 Leave Message for Admin:');

    // If user explicitly asks to send query to admin, check 24-hour Rate Limit (Max 1 admin ticket per 24 hours)
    if (isDirectAdminQuery && sender !== 'bot') {
      const [[cntRow]] = await pool.execute(`
        SELECT COUNT(*) AS c FROM support_inquiries
        WHERE message LIKE ? AND created_at >= NOW() - INTERVAL 24 HOUR
      `, [`%[TICKET #${token}]%`]);

      if (Number(cntRow?.c || 0) >= 1) {
        return res.status(429).json({
          ok: false,
          limitReached: true,
          message: 'Daily Limit Reached: You have already submitted 1 direct message to Administration for today. Administration will review and post a pinned reply at the top of this chat. You can continue chatting freely with the AI Assistant!'
        });
      }
    }

    const [r] = await pool.execute(`
      INSERT INTO guest_chat_messages (session_token, sender, message, user_email, is_pinned)
      VALUES (?, ?, ?, ?, 0)
    `, [token, sender === 'bot' ? 'bot' : 'user', cleanMsg, email ? String(email).trim() : null]);

    // Mirror to support_inquiries ONLY when explicitly directed to Admin
    if (isDirectAdminQuery && sender !== 'bot') {
      const [[adminUser]] = await pool.execute(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
      const adminId = adminUser?.id || 1;
      await pool.execute(`
        INSERT INTO support_inquiries (user_id, category, message, status)
        VALUES (?, 'Guest Chat', ?, 'pending')
      `, [adminId, `[TICKET #${token}] ${cleanMsg} (Contact: ${email || 'Guest Visitor'})`]);
    }

    res.json({ ok: true, messageId: r.insertId });
  } catch (e) {
    console.error('Guest chat send error:', e);
    res.status(500).json({ message: 'Could not save message.' });
  }
});

// Helper: Automatically reset user password in database if admin sends a temporary password in reply
async function autoResetUserPasswordFromAdminMessage(rawMessage, targetEmail = null, targetUserId = null) {
  try {
    const text = String(rawMessage || '');
    const match = text.match(/temporary password(?: is)?[:\s]+([^\s,]+)/i) ||
                  text.match(/new password(?: is)?[:\s]+([^\s,]+)/i) ||
                  text.match(/password has been reset to[:\s]+([^\s,]+)/i) ||
                  text.match(/password is[:\s]+([^\s,]+)/i) ||
                  text.match(/(CodeClever@[A-Za-z0-9]+)/i) ||
                  text.match(/(CC#[A-Za-z0-9]+)/i);
    if (!match) return;
    const tempPassword = match[1].replace(/[.,;:!]+$/, '').trim();
    if (!tempPassword || tempPassword.length < 4) return;

    let userId = targetUserId;
    if (!userId && targetEmail) {
      const [[u]] = await pool.execute('SELECT id FROM users WHERE email = ?', [String(targetEmail).trim().toLowerCase()]);
      if (u) userId = u.id;
    }

    if (userId) {
      const hash = await bcrypt.hash(tempPassword, 12);
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
      console.log(`[Auto-Reset] Database password successfully reset for user #${userId} to: ${tempPassword}`);
    }
  } catch (err) {
    console.error('autoResetUserPasswordFromAdminMessage error:', err);
  }
}

app.post('/api/admin/guest-chat/:sessionToken/reply', auth, adminOnly, async (req, res) => {
  const token = String(req.params.sessionToken || '').trim();
  const { reply } = req.body;
  const cleanReply = String(reply || '').trim();

  if (!token || !cleanReply) return res.status(400).json({ message: 'Token and reply required.' });

  try {
    const [r] = await pool.execute(`
      INSERT INTO guest_chat_messages (session_token, sender, message, is_pinned)
      VALUES (?, 'admin', ?, 1)
    `, [token, cleanReply]);

    // Check if reply contains temporary password and auto-update user in database
    const [[msgRow]] = await pool.execute(
      `SELECT user_email FROM guest_chat_messages WHERE session_token = ? AND user_email IS NOT NULL ORDER BY id DESC LIMIT 1`,
      [token]
    );
    let userEmail = msgRow?.user_email;
    if (!userEmail) {
      const [allMsgs] = await pool.execute(`SELECT message FROM guest_chat_messages WHERE session_token = ?`, [token]);
      for (const m of allMsgs) {
        const found = (m.message || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (found) { userEmail = found[0]; break; }
      }
    }
    await autoResetUserPasswordFromAdminMessage(cleanReply, userEmail);

    res.json({ ok: true, message: 'Reply sent and pinned for visitor.', messageId: r.insertId });
  } catch (e) {
    console.error('Admin guest chat reply error:', e);
    res.status(500).json({ message: 'Could not send reply.' });
  }
});

app.post('/api/admin/support/:id/reply', auth, adminOnly, async (req, res) => {
  const { reply } = req.body;
  if (!reply || !String(reply).trim()) return res.status(400).json({ message: 'Reply text required.' });
  const cleanReply = String(reply).trim();
  try {
    // 1. Update support_inquiries table
    await pool.execute(`
      UPDATE support_inquiries
      SET admin_reply=?, status='replied', replied_by=?, replied_at=NOW()
      WHERE id=?
    `, [cleanReply, req.user.id, req.params.id]);

    // 2. If this inquiry originated from a guest chatbot ticket, update/pin the reply in guest_chat_messages
    const [[inq]] = await pool.execute(`SELECT user_id, message FROM support_inquiries WHERE id=?`, [req.params.id]);
    if (inq && inq.message) {
      const match = inq.message.match(/\[TICKET #([A-Z0-9\-]+)\]/i);
      if (match && match[1]) {
        const guestToken = match[1].trim();
        // Delete previous pinned admin messages for this token so only the updated reply remains
        await pool.execute(`DELETE FROM guest_chat_messages WHERE session_token = ? AND sender = 'admin'`, [guestToken]);
        await pool.execute(`
          INSERT INTO guest_chat_messages (session_token, sender, message, is_pinned)
          VALUES (?, 'admin', ?, 1)
        `, [guestToken, cleanReply]);
      }

      let userEmail = null;
      const em = inq.message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (em) userEmail = em[0];
      await autoResetUserPasswordFromAdminMessage(cleanReply, userEmail, inq.user_id);
    }

    res.json({ ok: true, message: 'Reply updated and pinned for inquiry.' });
  } catch (e) {
    console.error('Support reply error:', e);
    res.status(500).json({ message: 'Could not send reply.' });
  }
});

// Admin endpoint to delete an admin reply (resets ticket back to pending and removes from website chat)
app.post('/api/admin/support/:id/delete-reply', auth, adminOnly, async (req, res) => {
  try {
    const [[inq]] = await pool.execute(`SELECT user_id, message FROM support_inquiries WHERE id=?`, [req.params.id]);
    if (!inq) return res.status(404).json({ message: 'Ticket not found.' });

    // 1. Reset support_inquiries status and clear admin_reply
    await pool.execute(`
      UPDATE support_inquiries
      SET admin_reply=NULL, replied_by=NULL, replied_at=NULL, status='pending'
      WHERE id=?
    `, [req.params.id]);

    // 2. Remove pinned reply from guest_chat_messages if applicable
    if (inq.message) {
      const match = inq.message.match(/\[TICKET #([A-Z0-9\-]+)\]/i);
      if (match && match[1]) {
        const guestToken = match[1].trim();
        await pool.execute(`DELETE FROM guest_chat_messages WHERE session_token = ? AND sender = 'admin'`, [guestToken]);
      }
    }

    res.json({ ok: true, message: 'Admin reply deleted successfully.' });
  } catch (e) {
    console.error('Delete reply error:', e);
    res.status(500).json({ message: 'Could not delete reply.' });
  }
});

// Admin endpoint to delete a support inquiry / ticket completely
app.post('/api/admin/support/:id/delete', auth, adminOnly, async (req, res) => {
  try {
    const [[inq]] = await pool.execute(`SELECT user_id, message FROM support_inquiries WHERE id=?`, [req.params.id]);
    if (!inq) return res.status(404).json({ message: 'Ticket not found.' });

    // 1. Delete associated guest_chat_messages if ticket was from guest chat
    if (inq.message) {
      const match = inq.message.match(/\[TICKET #([A-Z0-9\-]+)\]/i);
      if (match && match[1]) {
        const guestToken = match[1].trim();
        await pool.execute(`DELETE FROM guest_chat_messages WHERE session_token = ?`, [guestToken]);
      }
    }

    // 2. Delete support inquiry row
    await pool.execute(`DELETE FROM support_inquiries WHERE id=?`, [req.params.id]);

    res.json({ ok: true, message: 'Support ticket deleted permanently.' });
  } catch (e) {
    console.error('Delete support inquiry error:', e);
    res.status(500).json({ message: 'Could not delete ticket.' });
  }
});

app.delete('/api/admin/support/:id', auth, adminOnly, async (req, res) => {
  try {
    const [[inq]] = await pool.execute(`SELECT user_id, message FROM support_inquiries WHERE id=?`, [req.params.id]);
    if (!inq) return res.status(404).json({ message: 'Ticket not found.' });

    if (inq.message) {
      const match = inq.message.match(/\[TICKET #([A-Z0-9\-]+)\]/i);
      if (match && match[1]) {
        const guestToken = match[1].trim();
        await pool.execute(`DELETE FROM guest_chat_messages WHERE session_token = ?`, [guestToken]);
      }
    }

    await pool.execute(`DELETE FROM support_inquiries WHERE id=?`, [req.params.id]);
    res.json({ ok: true, message: 'Support ticket deleted permanently.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not delete ticket.' });
  }
});

// Master Admin endpoint to purge/reset entire platform dataset except Master Admin account
app.post('/api/admin/system/reset-all-data-except-admin', auth, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'RESET' && confirmation !== 'CONFIRM') {
      return res.status(400).json({ message: 'Confirmation keyword required. Please type RESET to confirm.' });
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.beginTransaction();

    // 1. Truncate clean-slate downline, activity, revenue & transaction tables
    await conn.query('TRUNCATE TABLE deposits');
    await conn.query('TRUNCATE TABLE withdrawals');
    await conn.query('TRUNCATE TABLE wallet_transactions');
    await conn.query('TRUNCATE TABLE user_plans');
    await conn.query('TRUNCATE TABLE referrals');
    await conn.query('TRUNCATE TABLE team_reward_ledger');
    await conn.query('TRUNCATE TABLE user_task_assignments');
    await conn.query('TRUNCATE TABLE daily_checkins');
    await conn.query('TRUNCATE TABLE lucky_wheel_spins');
    await conn.query('TRUNCATE TABLE spin_grants_log');
    await conn.query('TRUNCATE TABLE guest_chat_messages');
    await conn.query('TRUNCATE TABLE support_inquiries');
    await conn.query('TRUNCATE TABLE banned_credentials');
    await conn.query('TRUNCATE TABLE audit_logs');
    try { await conn.query('TRUNCATE TABLE user_settings'); } catch {}
    try { await conn.query('TRUNCATE TABLE user_spins'); } catch {}
    try { await conn.query('TRUNCATE TABLE notifications'); } catch {}
    try { await conn.query('TRUNCATE TABLE export_history'); } catch {}

    // 2. Clear non-admin wallets and reset Admin wallet balance & revenue stats to zero
    await conn.query(`DELETE FROM wallets WHERE user_id != ?`, [req.user.id]);
    await conn.query(
      `UPDATE wallets SET available_balance = 0, commission_balance = 0, pending_balance = 0, lifetime_earned = 0 WHERE user_id = ?`,
      [req.user.id]
    );

    // 3. Delete all non-admin users
    const [delUsers] = await conn.query(
      `DELETE FROM users WHERE id != ? AND role != 'admin' AND email != 'faizanbarvi786@gmail.com'`,
      [req.user.id]
    );

    // 4. Reset admin tree pointers & referral downlines
    await conn.query(
      `UPDATE users SET referred_by = NULL, root_leader_id = NULL, team_level = NULL, referral_depth = 0 WHERE id = ? OR role = 'admin'`,
      [req.user.id]
    );

    // 5. Ensure admin wallet exists and has clean zero baseline
    const [[adminWallet]] = await conn.query(`SELECT id FROM wallets WHERE user_id = ?`, [req.user.id]);
    if (!adminWallet) {
      await conn.query(`INSERT INTO wallets (user_id, balance, total_earned, lifetime_earned) VALUES (?, 0, 0, 0)`, [req.user.id]);
    }

    await conn.commit();
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`[SYSTEM RESET] Purged ${delUsers.affectedRows} non-admin users and all transaction datasets. Master admin #${req.user.id} preserved.`);

    res.json({
      ok: true,
      deletedUsersCount: delUsers.affectedRows,
      message: `Complete platform dataset reset successful! ${delUsers.affectedRows} member accounts and all transaction histories were purged. Only Master Admin is preserved.`
    });
  } catch (err) {
    await conn.rollback();
    await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('System reset error:', err);
    res.status(500).json({ message: 'Failed to reset system data: ' + err.message });
  } finally {
    conn.release();
  }
});

// Admin Plan Management Endpoints (Lock/Unlock, Enable/Disable, Edit)
app.post('/api/admin/plans/:id/toggle-lock', auth, adminOnly, async (req, res) => {
  try {
    const [[p]] = await pool.execute(`SELECT id, code, is_locked FROM plans WHERE id=?`, [req.params.id]);
    if (!p) return res.status(404).json({ message: 'Plan not found.' });
    const newLock = p.is_locked ? 0 : 1;
    await pool.execute(`UPDATE plans SET is_locked=? WHERE id=?`, [newLock, req.params.id]);
    res.json({ ok: true, message: `Package ${p.code} is now ${newLock ? 'Locked (Coming Soon)' : 'Unlocked (Active)'}.` });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update plan lock status.' });
  }
});

app.post('/api/admin/plans/:id/toggle-active', auth, adminOnly, async (req, res) => {
  try {
    const [[p]] = await pool.execute(`SELECT id, code, active FROM plans WHERE id=?`, [req.params.id]);
    if (!p) return res.status(404).json({ message: 'Plan not found.' });
    const newActive = p.active ? 0 : 1;
    await pool.execute(`UPDATE plans SET active=? WHERE id=?`, [newActive, req.params.id]);
    res.json({ ok: true, message: `Package ${p.code} is now ${newActive ? 'Enabled' : 'Disabled'}.` });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update plan visibility.' });
  }
});

app.put('/api/admin/plans/:id', auth, adminOnly, async (req, res) => {
  const { name, job_bond, daily_task_count, unit_reward } = req.body;
  try {
    await pool.execute(
      `UPDATE plans SET name=?, job_bond=?, daily_task_count=?, unit_reward=? WHERE id=?`,
      [String(name || '').trim(), Number(job_bond || 0), Number(daily_task_count || 1), Number(unit_reward || 0), req.params.id]
    );
    res.json({ ok: true, message: 'Plan parameters updated successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save plan changes.' });
  }
});

// Password & Balance Adjustments
app.post('/api/admin/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password || String(password).length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters.' });
  try {
    const hash = await bcrypt.hash(String(password).trim(), 10);
    await pool.execute(`UPDATE users SET password_hash=? WHERE id=?`, [hash, req.params.id]);
    await pool.execute(`INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata) VALUES(?,?,?,?,?)`, [req.user.id, 'admin_reset_password', 'user', req.params.id, JSON.stringify({ targetUserId: req.params.id })]);
    res.json({ ok: true, message: 'User login password reset successfully.' });
  } catch {
    res.status(500).json({ message: 'Failed to reset password.' });
  }
});

app.post('/api/admin/users/:id/reset-fund-password', auth, adminOnly, async (req, res) => {
  const { fundPassword } = req.body;
  if (!fundPassword || String(fundPassword).length < 6) return res.status(400).json({ message: 'Fund PIN must be 6 digits.' });
  try {
    await pool.execute(`
      INSERT INTO user_settings(user_id, setting_key, settings_json)
      VALUES(?, 'fund_password', ?)
      ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)
    `, [req.params.id, JSON.stringify({ pin: String(fundPassword).trim() })]);
    res.json({ ok: true, message: 'User 6-digit fund password reset successfully.' });
  } catch {
    res.status(500).json({ message: 'Failed to reset fund password.' });
  }
});

app.post('/api/admin/users/:id/adjust-balance', auth, adminOnly, async (req, res) => {
  const { amount, direction, note, walletType } = req.body;
  const num = Number(amount);
  if (!num || num <= 0) return res.status(400).json({ message: 'Enter a valid positive adjustment amount.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[wallet]] = await conn.execute(`SELECT id, available_balance, commission_balance, lifetime_earned FROM wallets WHERE user_id=? FOR UPDATE`, [req.params.id]);
    if (!wallet) {
      await conn.rollback();
      return res.status(404).json({ message: 'Wallet not found.' });
    }
    const isComm = walletType === 'commission';
    const current = isComm ? Number(wallet.commission_balance || 0) : Number(wallet.available_balance || 0);
    const newBal = direction === 'credit' ? current + num : Math.max(0, current - num);

    if (isComm) {
      await conn.execute(`UPDATE wallets SET commission_balance=? WHERE id=?`, [newBal, wallet.id]);
    } else {
      await conn.execute(`UPDATE wallets SET available_balance=? WHERE id=?`, [newBal, wallet.id]);
    }

    const walletLabel = isComm ? 'Commission Wallet' : 'Personal Wallet';
    await conn.execute(`
      INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
      VALUES(?,?, 'adjustment', ?, ?, 'admin', ?, ?, ?)
    `, [wallet.id, req.params.id, direction, num, req.user.id, newBal, note || `Admin manual ${direction} (${walletLabel})`]);
    await conn.commit();
    res.json({ ok: true, message: `${walletLabel} adjusted to Rs. ${fmtMoney(newBal)}.` });
  } catch {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to adjust balance.' });
  } finally {
    conn.release();
  }
});
// ----------------- TEAM STRUCTURE & DOWNLINE HIERARCHY API (SCALABLE) -----------------

// GET /api/admin/team/hierarchy — paginated leader list with A/B/C counts (server-side search + filter)
app.get('/api/admin/team/hierarchy', auth, adminOnly, async (req, res) => {
  try {
    const { q = '', filter = 'all', page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    // Global KPIs
    const [[totMem]] = await pool.execute(`SELECT COUNT(*) AS total FROM users WHERE status != 'deleted'`);
    const [[actMem]] = await pool.execute(`SELECT COUNT(DISTINCT user_id) AS active_count FROM user_plans WHERE status = 'active'`);
    const [[totEarn]] = await pool.execute(`SELECT COALESCE(SUM(lifetime_earned), 0) AS total_earnings FROM wallets`);
    const [[cntA]] = await pool.execute(`SELECT COUNT(*) AS c FROM users WHERE team_level='A'`);
    const [[cntB]] = await pool.execute(`SELECT COUNT(*) AS c FROM users WHERE team_level='B'`);
    const [[cntC]] = await pool.execute(`SELECT COUNT(*) AS c FROM users WHERE team_level='C'`);

    // Build WHERE clause for filter
    let whereFilter = '';
    const filterParams = [];
    if (filter === 'leaders') {
      whereFilter = ` AND (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) > 0`;
    } else if (filter === 'A') {
      whereFilter = ` AND u.team_level = 'A'`;
    } else if (filter === 'B') {
      whereFilter = ` AND u.team_level = 'B'`;
    } else if (filter === 'C') {
      whereFilter = ` AND u.team_level = 'C'`;
    } else if (filter === 'with_members') {
      whereFilter = ` AND (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) > 0`;
    } else if (filter === 'without_members') {
      whereFilter = ` AND (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) = 0`;
    }

    // Search
    let whereSearch = '';
    const searchParams = [];
    if (q.trim()) {
      whereSearch = ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR u.id = ?)`;
      const like = `%${q.trim()}%`;
      searchParams.push(like, like, isNaN(q) ? 0 : Number(q));
    }

    // Count total matching
    const [[{ total: totalRows }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u WHERE u.status != 'deleted'${whereFilter}${whereSearch}`,
      [...filterParams, ...searchParams]
    );

    // Fetch paginated users with A/B/C counts
    const [users] = await pool.execute(`
      SELECT
        u.id, u.full_name, u.phone, u.email,
        u.referred_by, u.status, u.created_at,
        ref.full_name AS referrer_name,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        COALESCE((SELECT SUM(amount) FROM team_reward_ledger WHERE user_id = u.id), 0) AS team_earnings,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 1) AS count_a,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 2) AS count_b,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 3) AS count_c,
        COALESCE(p.code, 'Free') AS active_plan
      FROM users u
      LEFT JOIN users ref ON ref.id = u.referred_by
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
      LEFT JOIN plans p ON p.id = up.plan_id
      WHERE u.status != 'deleted'${whereFilter}${whereSearch}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `, [...filterParams, ...searchParams, Number(limit), offset]);

    res.json({
      totalMembers: Number(totMem?.total || 0),
      activeMembers: Number(actMem?.active_count || 0),
      membersTotalEarnings: Number(totEarn?.total_earnings || 0),
      countA: Number(cntA?.c || 0),
      countB: Number(cntB?.c || 0),
      countC: Number(cntC?.c || 0),
      totalRows: Number(totalRows),
      page: Number(page),
      limit: Number(limit),
      users: users.map(u => ({
        id: u.id,
        fullName: u.full_name,
        phone: u.phone || 'No phone',
        email: u.email,
        teamLevel: null,
        rootLeaderId: u.referred_by || null,
        rootLeaderName: u.referrer_name || null,
        referrerName: u.referrer_name || null,
        referralDepth: 0,
        status: u.status,
        createdAt: u.created_at,
        totalEarned: Number(u.total_earned || 0),
        teamEarnings: Number(u.team_earnings || 0),
        directCount: Number(u.direct_count || 0),
        countA: Number(u.count_a || 0),
        countB: Number(u.count_b || 0),
        countC: Number(u.count_c || 0),
        totalTeam: Number(u.count_a || 0) + Number(u.count_b || 0) + Number(u.count_c || 0),
        activePlan: u.active_plan || 'Free'
      }))
    });
  } catch (e) {
    console.error('Team hierarchy fetch error:', e);
    res.status(500).json({ message: 'Failed to fetch team hierarchy' });
  }
});

// GET /api/admin/team/leader/:id/summary — full leader details with A/B/C counts
app.get('/api/admin/team/leader/:id/summary', auth, adminOnly, async (req, res) => {
  try {
    const leaderId = Number(req.params.id);
    const [[u]] = await pool.execute(`
      SELECT u.id, u.full_name, u.phone, u.email, u.created_at, u.status,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        COALESCE((SELECT SUM(amount) FROM team_reward_ledger WHERE user_id = u.id), 0) AS team_earnings,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 1) AS count_a,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 2) AS count_b,
        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 3) AS count_c,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
    `, [leaderId]);
    if (!u) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: u.id, fullName: u.full_name, phone: u.phone, email: u.email,
      createdAt: u.created_at, status: u.status,
      totalEarned: Number(u.total_earned), teamEarnings: Number(u.team_earnings),
      countA: Number(u.count_a), countB: Number(u.count_b), countC: Number(u.count_c),
      totalTeam: Number(u.count_a) + Number(u.count_b) + Number(u.count_c),
      directCount: Number(u.direct_count)
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch leader summary' });
  }
});

// GET /api/admin/team/leader/:id/abc-breakdown — full A, B, and C team breakdown for Leader Details
app.get('/api/admin/team/leader/:id/abc-breakdown', auth, adminOnly, async (req, res) => {
  try {
    const leaderId = Number(req.params.id);
    const [[leader]] = await pool.execute(`
      SELECT u.id, u.full_name, u.phone, u.email, u.created_at, u.status,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        COALESCE((SELECT SUM(amount) FROM team_reward_ledger WHERE user_id = u.id), 0) AS team_earnings,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
    `, [leaderId]);

    if (!leader) return res.status(404).json({ message: 'Leader not found' });

    // Fetch all members in this leader's tree (A, B, C) via referrals table
    const [members] = await pool.execute(`
      SELECT u.id, u.full_name, u.phone, u.email, r.level AS team_level_num,
        CASE WHEN r.level = 1 THEN 'A' WHEN r.level = 2 THEN 'B' ELSE 'C' END AS team_level,
        u.status, u.created_at, u.referred_by,
        ref.full_name AS sponsor_name,
        COALESCE(p.code, 'Free') AS active_plan,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count
      FROM referrals r
      JOIN users u ON u.id = r.referred_user_id
      LEFT JOIN users ref ON ref.id = u.referred_by
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
      LEFT JOIN plans p ON p.id = up.plan_id
      WHERE r.referrer_id = ?
      ORDER BY r.level ASC, u.id ASC
    `, [leaderId]);

    const teamA = members.filter(m => m.team_level_num === 1).map((m, idx) => ({
      code: `A${idx + 1}`,
      id: m.id,
      fullName: m.full_name,
      phone: m.phone || 'No phone',
      email: m.email,
      directCount: Number(m.direct_count || 0),
      activePlan: m.active_plan,
      totalEarned: Number(m.total_earned || 0),
      status: m.status,
      createdAt: m.created_at
    }));

    const teamB = members.filter(m => m.team_level_num === 2).map((m, idx) => ({
      code: `B${idx + 1}`,
      id: m.id,
      fullName: m.full_name,
      phone: m.phone || 'No phone',
      email: m.email,
      sponsorName: m.sponsor_name || 'Team A Member',
      directCount: Number(m.direct_count || 0),
      activePlan: m.active_plan,
      totalEarned: Number(m.total_earned || 0),
      status: m.status,
      createdAt: m.created_at
    }));

    const teamC = members.filter(m => m.team_level_num === 3).map((m, idx) => ({
      code: `C${idx + 1}`,
      id: m.id,
      fullName: m.full_name,
      phone: m.phone || 'No phone',
      email: m.email,
      sponsorName: m.sponsor_name || 'Team B Member',
      directCount: Number(m.direct_count || 0),
      visibleLevels: 0,
      activePlan: m.active_plan,
      totalEarned: Number(m.total_earned || 0),
      status: m.status,
      createdAt: m.created_at
    }));

    res.json({
      leader: {
        id: leader.id,
        fullName: leader.full_name,
        phone: leader.phone || 'No phone',
        email: leader.email,
        createdAt: leader.created_at,
        status: leader.status,
        totalEarned: Number(leader.total_earned),
        teamEarnings: Number(leader.team_earnings),
        directCount: Number(leader.direct_count)
      },
      summary: {
        countA: teamA.length,
        countB: teamB.length,
        countC: teamC.length,
        totalTeam: teamA.length + teamB.length + teamC.length
      },
      teamA,
      teamB,
      teamC
    });
  } catch (e) {
    console.error('ABC Breakdown error:', e);
    res.status(500).json({ message: 'Failed to fetch ABC team breakdown' });
  }
});

// GET /api/admin/team/leader/:id/downline — lazy load direct A-members of a leader
app.get('/api/admin/team/leader/:id/downline', auth, adminOnly, async (req, res) => {
  try {
    const leaderId = Number(req.params.id);
    const [members] = await pool.execute(`
      SELECT u.id, u.full_name, u.phone, u.email, u.status, u.created_at,
        COALESCE(p.code, 'Free') AS active_plan,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count,
        (SELECT COUNT(*) FROM referrals sub WHERE sub.referrer_id = u.id) AS sub_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
      LEFT JOIN plans p ON p.id = up.plan_id
      WHERE u.referred_by = ?
      ORDER BY u.id ASC
    `, [leaderId]);

    res.json(members.map(m => ({
      id: m.id, fullName: m.full_name, phone: m.phone || 'No phone', email: m.email,
      teamLevel: 'A', status: m.status, createdAt: m.created_at,
      activePlan: m.active_plan, totalEarned: Number(m.total_earned),
      directCount: Number(m.direct_count), subCount: Number(m.sub_count)
    })));
  } catch (e) {
    res.status(500).json({ message: 'Failed to load downline' });
  }
});

// GET /api/admin/team/member/:id/children — lazy load children of any member (B→C expand)
app.get('/api/admin/team/member/:id/children', auth, adminOnly, async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const [children] = await pool.execute(`
      SELECT u.id, u.full_name, u.phone, u.email, u.team_level, u.root_leader_id, u.status, u.created_at,
        COALESCE(p.code, 'Free') AS active_plan,
        COALESCE(w.lifetime_earned, 0) AS total_earned,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
      LEFT JOIN plans p ON p.id = up.plan_id
      WHERE u.referred_by = ?
      ORDER BY u.id ASC
    `, [memberId]);

    res.json(children.map(c => ({
      id: c.id, fullName: c.full_name, phone: c.phone || 'No phone', email: c.email,
      teamLevel: c.team_level || null, rootLeaderId: c.root_leader_id || null,
      status: c.status, createdAt: c.created_at,
      activePlan: c.active_plan, totalEarned: Number(c.total_earned),
      directCount: Number(c.direct_count)
    })));
  } catch (e) {
    res.status(500).json({ message: 'Failed to load member children' });
  }
});

// POST /api/admin/team/export — generate XLSX or CSV export
app.post('/api/admin/team/export', auth, adminOnly, async (req, res) => {
  try {
    const { fileType = 'xlsx' } = req.body;
    const XLSX = (await import('xlsx')).default;

    const now = new Date();
    const exportDate = now.toISOString().slice(0, 10);
    const exportTime = now.toTimeString().slice(0, 8);

    // Sheet 1: All Users
    const [allUsers] = await pool.execute(`
      SELECT
        u.id, u.full_name, u.phone, u.email, u.team_level, u.referral_depth,
        u.referred_by, u.root_leader_id, u.created_at,
        ref.full_name AS sponsor_name,
        leader.full_name AS leader_name,
        (SELECT COUNT(*) FROM users sub WHERE sub.referred_by = u.id) AS direct_count,
        (SELECT COUNT(*) FROM users sub2 WHERE sub2.root_leader_id = u.id) AS total_downline,
        COALESCE((SELECT SUM(reward) FROM user_task_assignments uta
          JOIN daily_tasks dt ON dt.id = uta.daily_task_id
          WHERE uta.user_id = u.id AND dt.task_date = CURDATE() AND uta.status = 'completed'), 0) AS daily_earnings
      FROM users u
      LEFT JOIN users ref ON ref.id = u.referred_by
      LEFT JOIN users leader ON leader.id = u.root_leader_id
      WHERE u.status != 'deleted'
      ORDER BY u.id ASC
    `);

    const sheet1Data = allUsers.map(u => ({
      'Export Date': exportDate,
      'Export Time': exportTime,
      'User ID': u.id,
      'User Name': u.full_name,
      'Phone': u.phone || '',
      'Direct Sponsor ID': u.referred_by || '',
      'Direct Sponsor Name': u.sponsor_name || '',
      'Root Leader ID': u.root_leader_id || '',
      'Root Leader Name': u.leader_name || '',
      'Team Level': u.team_level || 'N/A',
      'Referral Depth': u.referral_depth || 0,
      'Registration Date': u.created_at,
      'Direct Team Count': u.direct_count,
      'Total Downline Count': u.total_downline,
      'Daily Earnings (Rs)': u.daily_earnings
    }));

    // Sheet 2: Leader Summary
    const [leaders] = await pool.execute(`
      SELECT u.id, u.full_name,
        (SELECT COUNT(*) FROM users sub WHERE sub.root_leader_id = u.id AND sub.team_level = 'A') AS count_a,
        (SELECT COUNT(*) FROM users sub WHERE sub.root_leader_id = u.id AND sub.team_level = 'B') AS count_b,
        (SELECT COUNT(*) FROM users sub WHERE sub.root_leader_id = u.id AND sub.team_level = 'C') AS count_c,
        COALESCE((SELECT SUM(amount) FROM team_reward_ledger WHERE user_id = u.id), 0) AS team_earnings
      FROM users u
      WHERE (SELECT COUNT(*) FROM users sub WHERE sub.root_leader_id = u.id) > 0
      ORDER BY u.id ASC
    `);

    const sheet2Data = leaders.map(l => ({
      'Leader ID': l.id,
      'Leader Name': l.full_name,
      'Team A Count': l.count_a,
      'Team B Count': l.count_b,
      'Team C Count': l.count_c,
      'Total Team': Number(l.count_a) + Number(l.count_b) + Number(l.count_c),
      'Daily Team Earnings (Rs)': Number(l.team_earnings)
    }));

    // Sheet 3: A/B/C Summary
    const sheet3Data = leaders.map(l => ({
      'Leader ID': l.id,
      'Leader Name': l.full_name,
      'A Count': l.count_a,
      'B Count': l.count_b,
      'C Count': l.count_c,
      'Total': Number(l.count_a) + Number(l.count_b) + Number(l.count_c)
    }));

    // Stats for export history
    const totalLeaders = leaders.length;
    const totalA = sheet1Data.filter(r => r['Team Level'] === 'A').length;
    const totalB = sheet1Data.filter(r => r['Team Level'] === 'B').length;
    const totalC = sheet1Data.filter(r => r['Team Level'] === 'C').length;

    // Save export record
    const [exportRecord] = await pool.execute(
      `INSERT INTO export_history(export_date, export_time, total_users, total_leaders, count_a, count_b, count_c, file_type, created_by)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exportDate, exportTime, allUsers.length, totalLeaders, totalA, totalB, totalC, fileType, req.user.id]
    );

    const fileName = `CodeClever_TeamData_${exportDate}`;

    if (fileType === 'csv') {
      const ws = XLSX.utils.json_to_sheet(sheet1Data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
      return res.send(csv);
    }

    // Build XLSX with 3 sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), 'All Users');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data), 'Leader Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3Data), 'ABC Summary');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.send(buf);
  } catch (e) {
    console.error('Export error:', e);
    res.status(500).json({ message: 'Export failed: ' + e.message });
  }
});

// GET /api/admin/team/exports — export history list
app.get('/api/admin/team/exports', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, export_date, export_time, total_users, total_leaders, count_a, count_b, count_c, file_type, created_at
      FROM export_history
      ORDER BY id DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch export history' });
  }
});

// POST /api/admin/team/backfill — manual trigger for backfill
app.post('/api/admin/team/backfill', auth, adminOnly, async (req, res) => {
  try {
    await backfillTeamLevels();
    res.json({ ok: true, message: 'Team level backfill completed.' });
  } catch (e) {
    res.status(500).json({ message: 'Backfill failed: ' + e.message });
  }
});



// ----------------- ALL DEPOSITS & WITHDRAWALS RECORDS API -----------------
app.get('/api/admin/deposits/records', auth, adminOnly, async (req, res) => {
  try {
    const { q, from, to, status, sort } = req.query;
    let sql = `
      SELECT d.id, d.user_id, d.amount, d.method, d.transaction_reference AS tx_id, d.sender_name, d.sender_number, d.proof_image, d.status,
             d.created_at, d.reviewed_at,
             u.full_name AS user_name, u.phone AS user_phone, u.email AS user_email,
             COALESCE(p.name, p.code, 'Deposit') AS plan_name
      FROM deposits d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN user_plans up ON up.user_id = d.user_id AND up.status = 'active'
      LEFT JOIN plans p ON p.id = up.plan_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR d.transaction_reference LIKE ? OR d.sender_name LIKE ? OR d.sender_number LIKE ? OR d.id = ?)`;
      const queryPattern = `%${q}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern, queryPattern, isNaN(q) ? 0 : Number(q));
    }

    if (status && status !== 'all') {
      sql += ` AND d.status = ?`;
      params.push(status);
    }

    if (from) {
      sql += ` AND DATE(d.created_at) >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND DATE(d.created_at) <= ?`;
      params.push(to);
    }

    if (sort === 'oldest') {
      sql += ` ORDER BY d.id ASC LIMIT 200`;
    } else if (sort === 'amount_desc') {
      sql += ` ORDER BY d.amount DESC LIMIT 200`;
    } else {
      sql += ` ORDER BY d.id DESC LIMIT 200`;
    }

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('Deposits records error:', e);
    res.status(500).json({ message: 'Failed to fetch deposits' });
  }
});

app.get('/api/admin/withdrawals/records', auth, adminOnly, async (req, res) => {
  try {
    const { q, from, to, status, sort } = req.query;
    let sql = `
      SELECT w.id, w.user_id, w.amount,
             COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2)) AS fee,
             COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2)) AS tax_amount,
             (w.amount - COALESCE(w.tax_amount, ROUND(w.amount * 0.10, 2))) AS net_amount,
             w.wallet_type,
             w.method, w.account_name AS account_title, w.account_number, w.status, w.created_at, w.reviewed_at,
             u.full_name AS user_name, u.phone AS user_phone, u.email AS user_email
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR w.account_number LIKE ? OR w.id = ?)`;
      const queryPattern = `%${q}%`;
      params.push(queryPattern, queryPattern, queryPattern, isNaN(q) ? 0 : Number(q));
    }

    if (status && status !== 'all') {
      sql += ` AND w.status = ?`;
      params.push(status);
    }

    if (from) {
      sql += ` AND DATE(w.created_at) >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND DATE(w.created_at) <= ?`;
      params.push(to);
    }

    if (sort === 'oldest') {
      sql += ` ORDER BY w.id ASC LIMIT 200`;
    } else if (sort === 'amount_desc') {
      sql += ` ORDER BY w.amount DESC LIMIT 200`;
    } else {
      sql += ` ORDER BY w.id DESC LIMIT 200`;
    }

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('Withdrawals records error:', e);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
});

app.post('/api/admin/users/:id/change-role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
  try {
    await pool.execute(`UPDATE users SET role=? WHERE id=?`, [role, req.params.id]);
    res.json({ ok: true, message: `User role changed to ${role}.` });
  } catch {
    res.status(500).json({ message: 'Failed to change role.' });
  }
});

app.get('/api/admin/finance/summary', auth, adminOnly, async (_req, res) => {
  const [[d]] = await pool.execute(`SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount),0) AS pending_amount FROM deposits WHERE status='pending'`);
  const [[w]] = await pool.execute(`SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount),0) AS pending_amount FROM withdrawals WHERE status IN ('pending','processing')`);
  const [[a]] = await pool.execute(`SELECT COALESCE(SUM(amount),0) AS approved_deposits FROM deposits WHERE status='approved'`);
  const [[p]] = await pool.execute(`SELECT COALESCE(SUM(amount),0) AS paid_withdrawals FROM withdrawals WHERE status='paid'`);
  res.json({
    pendingDeposits: { count: Number(d.pending_count || 0), amount: Number(d.pending_amount || 0) },
    pendingWithdrawals: { count: Number(w.pending_count || 0), amount: Number(w.pending_amount || 0) },
    approvedDeposits: Number(a.approved_deposits || 0),
    paidWithdrawals: Number(p.paid_withdrawals || 0)
  });
});

app.get('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const [[user]] = await pool.execute(`SELECT id, full_name, email, phone, referral_code, status, role, last_login_at, created_at FROM users WHERE id=?`, [req.params.id]);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const [[wallet]] = await pool.execute(`SELECT available_balance, pending_balance, lifetime_earned FROM wallets WHERE user_id=?`, [user.id]);
  const [[plan]] = await pool.execute(`SELECT p.code, p.name, up.started_at FROM user_plans up JOIN plans p ON p.id=up.plan_id WHERE up.user_id=? AND up.status='active' LIMIT 1`, [user.id]);
  const [[referrer]] = await pool.execute(`SELECT id, full_name, email FROM users WHERE id=(SELECT referred_by FROM users WHERE id=?)`, [user.id]);
  const [[tc]] = await pool.execute(`SELECT COUNT(*) AS c FROM users WHERE referred_by=?`, [user.id]);
  const [[ti]] = await pool.execute(`SELECT COALESCE(SUM(amount),0) AS income FROM team_reward_ledger WHERE user_id=?`, [user.id]);
  const [activity] = await pool.execute(`SELECT id, action, created_at FROM audit_logs WHERE user_id=? ORDER BY id DESC LIMIT 12`, [user.id]);
  const [tasks] = await pool.execute(`SELECT COUNT(*) AS total, SUM(status='completed') AS completed, SUM(status='submitted') AS submitted FROM user_task_assignments WHERE user_id=?`, [user.id]);
  const [tx] = await pool.execute(`SELECT id, type, direction, amount, note, created_at FROM wallet_transactions WHERE user_id=? ORDER BY id DESC LIMIT 12`, [user.id]);
  res.json({ user, wallet, plan, referrer, teamCount: Number(tc?.c || 0), teamIncome: Number(ti?.income || 0), activity, tasks, transactions: tx });
});

app.post('/api/admin/users/:id/toggle-status', auth, adminOnly, async (req, res) => {
  const [[u]] = await pool.execute(`SELECT id, status FROM users WHERE id=?`, [req.params.id]);
  if (!u) return res.status(404).json({ message: 'User not found' });
  const status = u.status === 'active' ? 'suspended' : 'active';
  await pool.execute(`UPDATE users SET status=? WHERE id=?`, [status, u.id]);
  await pool.execute(`INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata) VALUES(?,?,?,?,?)`, [req.user.id, 'user_status_changed', 'user', u.id, JSON.stringify({ status })]);
  res.json({ ok: true, message: `User ${status}.` });
});

// Delete user and permanently blacklist their credentials
const deleteAndBlacklistUserHandler = async (req, res) => {
  const targetId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[targetUser]] = await conn.execute(
      'SELECT id, full_name, email, phone, role FROM users WHERE id = ? FOR UPDATE',
      [targetId]
    );
    if (!targetUser) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found.' });
    }
    if (targetUser.role === 'admin' || String(targetUser.email || '').toLowerCase() === 'faizanbarvi786@gmail.com') {
      await conn.rollback();
      return res.status(403).json({ message: 'Master Administrator account cannot be deleted.' });
    }

    // 1. Blacklist credentials so this user can NEVER re-register
    const cleanEmail = String(targetUser.email || '').trim().toLowerCase();
    const cleanPhone = targetUser.phone ? String(targetUser.phone).trim() : null;
    await conn.execute(
      `INSERT INTO banned_credentials (user_id, email, phone, full_name, reason, banned_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason=VALUES(reason), banned_by=VALUES(banned_by), created_at=NOW()`,
      [targetId, cleanEmail, cleanPhone, targetUser.full_name || 'Member', 'Account deleted and blacklisted by administrator', req.user.id]
    );

    // 2. Temporarily disable FK checks to ensure 100% clean complete purge
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    await conn.execute('DELETE FROM user_plans WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM user_task_assignments WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM user_spins WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM lucky_wheel_spins WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM spin_grants_log WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM notifications WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM user_settings WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM wallet_transactions WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM deposits WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM withdrawals WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM support_inquiries WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM team_reward_ledger WHERE user_id = ? OR source_user_id = ?', [targetId, targetId]);
    await conn.execute('DELETE FROM referrals WHERE referred_user_id = ? OR referrer_id = ?', [targetId, targetId]);
    await conn.execute('DELETE FROM wallets WHERE user_id = ?', [targetId]);
    await conn.execute('DELETE FROM audit_logs WHERE user_id = ?', [targetId]);

    // Unlink any referrals pointing to this user
    await conn.execute('UPDATE users SET referred_by = NULL, root_leader_id = NULL, team_level = NULL WHERE referred_by = ? OR root_leader_id = ?', [targetId, targetId]);

    // 3. Delete user row
    await conn.execute('DELETE FROM users WHERE id = ?', [targetId]);

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    await conn.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'user_deleted_and_blacklisted', 'user', targetId, JSON.stringify({ email: cleanEmail, name: targetUser.full_name })]
    );

    await conn.commit();
    res.json({ ok: true, message: `Member ${targetUser.full_name || ''} (${cleanEmail}) has been deleted and permanently banned from re-registering.` });
  } catch (err) {
    await conn.rollback();
    console.error('Delete member error:', err);
    res.status(500).json({ message: 'Failed to delete member.' });
  } finally {
    conn.release();
  }
};

app.post('/api/admin/users/:id/delete', auth, adminOnly, deleteAndBlacklistUserHandler);
app.delete('/api/admin/users/:id', auth, adminOnly, deleteAndBlacklistUserHandler);

app.post('/api/admin/deposits/:id/approve', auth, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[d]] = await conn.execute(`SELECT * FROM deposits WHERE id=? FOR UPDATE`, [req.params.id]);
    if (!d || d.status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ message: 'Deposit is not pending.' });
    }
    const [[w]] = await conn.execute(`SELECT * FROM wallets WHERE user_id=? FOR UPDATE`, [d.user_id]);
    if (!w) {
      await conn.rollback();
      return res.status(404).json({ message: 'Wallet not found.' });
    }
    const bal = Number(w.available_balance) + Number(d.amount);
    await conn.execute(`UPDATE deposits SET status='approved', reviewed_by=?, reviewed_at=NOW() WHERE id=?`, [req.user.id, d.id]);
    await conn.execute(`UPDATE wallets SET available_balance=? WHERE id=?`, [bal, w.id]);
    await conn.execute(
      `INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
       VALUES(?,?, 'deposit','credit',?,'deposit',?,?,?)`,
      [w.id, d.user_id, d.amount, d.id, bal, 'Deposit approved by admin']
    );
    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
       VALUES(?,?,?,?,?)`,
      [req.user.id, 'deposit_approved', 'deposit', d.id, JSON.stringify({ userId: d.user_id, amount: d.amount })]
    );

    await createNotification(
      d.user_id,
      'deposit_approved',
      'Deposit Approved 🎉',
      `Your deposit of Rs. ${Number(d.amount).toLocaleString()} (${d.method.toUpperCase()}) has been verified and added to your Personal Wallet balance.`,
      'transactions'
    );

    await conn.commit();
    res.json({ ok: true, message: 'Deposit approved and Personal Wallet credited.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Deposit approval failed.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/deposits/:id/reject', auth, adminOnly, async (req, res) => {
  const [[d]] = await pool.execute(`SELECT * FROM deposits WHERE id=?`, [req.params.id]);
  const [r] = await pool.execute(`UPDATE deposits SET status='rejected', reviewed_by=?, reviewed_at=NOW() WHERE id=? AND status='pending'`, [req.user.id, req.params.id]);
  if (!r.affectedRows) return res.status(409).json({ message: 'Deposit is not pending.' });

  if (d) {
    await createNotification(
      d.user_id,
      'deposit_rejected',
      'Deposit Request Rejected ⚠️',
      `Your deposit submission #${d.id} for Rs. ${Number(d.amount).toLocaleString()} was rejected by the admin. Please verify payment TID and resubmit.`,
      'transactions'
    );
  }

  res.json({ ok: true, message: 'Deposit rejected.' });
});

app.post('/api/admin/withdrawals/:id/paid', auth, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[wreq]] = await conn.execute(`SELECT * FROM withdrawals WHERE id=? FOR UPDATE`, [req.params.id]);
    if (!wreq || !['pending', 'processing'].includes(wreq.status)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Withdrawal is not payable.' });
    }
    const [[wallet]] = await conn.execute(`SELECT * FROM wallets WHERE user_id=? FOR UPDATE`, [wreq.user_id]);
    if (!wallet) {
      await conn.rollback();
      return res.status(404).json({ message: 'Wallet not found.' });
    }
    const pending = Math.max(0, Number(wallet.pending_balance) - Number(wreq.amount));
    await conn.execute(`UPDATE wallets SET pending_balance=? WHERE id=?`, [pending, wallet.id]);
    await conn.execute(`UPDATE withdrawals SET status='paid', reviewed_by=?, reviewed_at=NOW() WHERE id=?`, [req.user.id, wreq.id]);
    await conn.execute(
      `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
       VALUES(?,?,?,?,?)`,
      [req.user.id, 'withdrawal_paid', 'withdrawal', wreq.id, JSON.stringify({ userId: wreq.user_id, amount: wreq.amount })]
    );

    await createNotification(
      wreq.user_id,
      'withdrawal_paid',
      'Withdrawal Approved & Paid 💸',
      `Your withdrawal of Rs. ${Number(wreq.amount).toLocaleString()} to ${wreq.method.toUpperCase()} (${wreq.account_number}) has been processed and paid.`,
      'transactions'
    );

    await conn.commit();
    res.json({ ok: true, message: 'Withdrawal marked as paid.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Could not mark withdrawal paid.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/withdrawals/:id/reject', auth, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[wreq]] = await conn.execute(`SELECT * FROM withdrawals WHERE id=? FOR UPDATE`, [req.params.id]);
    if (!wreq || !['pending', 'processing'].includes(wreq.status)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Withdrawal is not pending.' });
    }
    const [[wallet]] = await conn.execute(`SELECT * FROM wallets WHERE user_id=? FOR UPDATE`, [wreq.user_id]);
    const pending = Math.max(0, Number(wallet.pending_balance) - Number(wreq.amount));

    let bal = 0;
    const isComm = wreq.wallet_type === 'commission';
    if (isComm) {
      bal = Number(wallet.commission_balance || 0) + Number(wreq.amount);
      await conn.execute(`UPDATE wallets SET commission_balance=?, pending_balance=? WHERE id=?`, [bal, pending, wallet.id]);
    } else {
      bal = Number(wallet.available_balance || 0) + Number(wreq.amount);
      await conn.execute(`UPDATE wallets SET available_balance=?, pending_balance=? WHERE id=?`, [bal, pending, wallet.id]);
    }

    await conn.execute(`UPDATE withdrawals SET status='rejected', reviewed_by=?, reviewed_at=NOW() WHERE id=?`, [req.user.id, wreq.id]);
    await conn.execute(
      `INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
       VALUES(?,?, 'refund','credit',?,'withdrawal',?,?,?)`,
      [wallet.id, wreq.user_id, wreq.amount, wreq.id, bal, `Withdrawal rejected; funds refunded to ${isComm ? 'Commission Wallet' : 'Personal Wallet'}`]
    );

    await createNotification(
      wreq.user_id,
      'withdrawal_rejected',
      'Withdrawal Rejected & Refunded 🔄',
      `Your withdrawal request of Rs. ${Number(wreq.amount).toLocaleString()} was rejected and the funds have been restored to your available wallet balance.`,
      'transactions'
    );

    await conn.commit();
    res.json({ ok: true, message: 'Withdrawal rejected and funds refunded.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Could not reject withdrawal.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/plans/:id/toggle', auth, adminOnly, async (req, res) => {
  const [r] = await pool.execute(`UPDATE plans SET active=1-active WHERE id=?`, [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Plan not found' });
  res.json({ ok: true, message: 'Plan availability updated.' });
});

app.post('/api/admin/tasks/generate', auth, adminOnly, async (_req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[pause]] = await conn.execute(`SELECT value_json FROM site_settings WHERE setting_key='task_assignments_paused' LIMIT 1`);
    if (pause?.value_json === 'true') {
      await conn.rollback();
      return res.status(409).json({ message: 'Task assignments are paused.' });
    }
    const [plans] = await conn.execute(`SELECT * FROM plans WHERE active=1`);
    const [libs] = await conn.execute(`SELECT id FROM task_library WHERE active=1 ORDER BY id`);
    for (const p of plans) {
      const [users] = await conn.execute(`SELECT user_id FROM user_plans WHERE plan_id=? AND status='active'`, [p.id]);
      const limit = Math.min(Number(p.daily_task_count), libs.length);
      for (const u of users) {
        for (let i = 0; i < limit; i++) {
          await conn.execute(`INSERT INTO daily_tasks(task_date, task_library_id) VALUES(CURDATE(),?) ON DUPLICATE KEY UPDATE active=active`, [libs[i].id]);
          const [[dt]] = await conn.execute(`SELECT id FROM daily_tasks WHERE task_date=CURDATE() AND task_library_id=?`, [libs[i].id]);
          await conn.execute(`INSERT INTO user_task_assignments(user_id, daily_task_id, plan_id, reward) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE reward=VALUES(reward)`, [u.user_id, dt.id, p.id, p.unit_reward]);
        }
      }
    }
    await conn.commit();
    res.json({ ok: true, message: 'Daily tasks generated for active plans.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Task generation failed.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/tasks/refresh', auth, adminOnly, async (_req, res) => {
  await pool.execute(`UPDATE daily_tasks SET active=0 WHERE task_date=CURDATE()`);
  res.json({ ok: true, message: 'Today’s task pool refreshed.' });
});

app.post('/api/admin/tasks/pause', auth, adminOnly, async (req, res) => {
  await pool.execute(`INSERT INTO site_settings(setting_key, value_json, updated_by) VALUES('task_assignments_paused','true',?) ON DUPLICATE KEY UPDATE value_json='true', updated_by=VALUES(updated_by)`, [req.user.id]);
  res.json({ ok: true, message: 'New task assignments paused.' });
});

app.get('/api/admin/tasks/review', auth, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT uta.id, uta.user_id, uta.status, uta.proof_url, uta.reward,
             DATE_FORMAT(uta.submitted_at, '%Y-%m-%d %H:%i') AS submitted_at,
             u.full_name AS user_name, u.email AS user_email,
             tl.title AS task_title, tl.category
      FROM user_task_assignments uta
      JOIN users u ON u.id = uta.user_id
      JOIN daily_tasks dt ON dt.id = uta.daily_task_id
      JOIN task_library tl ON tl.id = dt.task_library_id
      WHERE uta.status = 'submitted'
      ORDER BY uta.submitted_at ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch tasks for review' });
  }
});

app.post('/api/admin/tasks/:id/approve', auth, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[task]] = await conn.execute(`
      SELECT uta.*, w.id AS wallet_id, w.available_balance, w.commission_balance
      FROM user_task_assignments uta
      JOIN wallets w ON w.user_id = uta.user_id
      WHERE uta.id = ? FOR UPDATE
    `, [req.params.id]);
    if (!task) {
      await conn.rollback();
      return res.status(404).json({ message: 'Task assignment not found.' });
    }
    if (task.status !== 'submitted') {
      await conn.rollback();
      return res.status(409).json({ message: 'Task is not pending verification.' });
    }

    await conn.execute(`
      UPDATE user_task_assignments
      SET status = 'completed', verified_by = ?, completed_at = NOW()
      WHERE id = ?
    `, [req.user.id, task.id]);

    const activePlan = await getActivePlan(conn, task.user_id);
    const isInternFree = !activePlan || activePlan.is_intern || activePlan.code === 'INTERN';

    if (isInternFree) {
      const newPersonalBal = Number(task.available_balance) + Number(task.reward);
      await conn.execute(`
        UPDATE wallets SET available_balance = ?, lifetime_earned = lifetime_earned + ?
        WHERE id = ?
      `, [newPersonalBal, task.reward, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?, ?, 'task_reward', 'credit', ?, 'task', ?, ?, ?)
      `, [task.wallet_id, task.user_id, task.reward, task.id, newPersonalBal, 'Admin approved Intern free task reward (Personal Wallet)']);
    } else {
      const newCommBal = Number(task.commission_balance || 0) + Number(task.reward);
      await conn.execute(`
        UPDATE wallets SET commission_balance = ?, lifetime_earned = lifetime_earned + ?
        WHERE id = ?
      `, [newCommBal, task.reward, task.wallet_id]);
      await conn.execute(`
        INSERT INTO wallet_transactions(wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES(?, ?, 'task_reward', 'credit', ?, 'task', ?, ?, ?)
      `, [task.wallet_id, task.user_id, task.reward, task.id, newCommBal, `Admin approved task earning (Commission Wallet - Plan ${activePlan.code})`]);
    }

    await creditTeamCommissions(conn, task.user_id, task.reward, 'task_reward', task.id, 'Admin approved task reward');

    await conn.execute(`
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, metadata)
      VALUES(?, 'task_approved', 'user_task_assignment', ?, ?)
    `, [req.user.id, task.id, JSON.stringify({ userId: task.user_id, reward: task.reward })]);

    await conn.commit();
    res.json({ ok: true, message: 'Task approved and reward credited.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Task approval failed.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/tasks/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const [r] = await pool.execute(`
      UPDATE user_task_assignments
      SET status = 'rejected', verified_by = ?
      WHERE id = ? AND status = 'submitted'
    `, [req.user.id, req.params.id]);
    if (!r.affectedRows) return res.status(409).json({ message: 'Task is not submitted.' });
    await pool.execute(`
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id)
      VALUES(?, 'task_rejected', 'user_task_assignment', ?)
    `, [req.user.id, req.params.id]);
    res.json({ ok: true, message: 'Task proof rejected.' });
  } catch (e) {
    res.status(500).json({ message: 'Task rejection failed.' });
  }
});

app.get('/api/admin/task-library', auth, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM task_library ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch task library' });
  }
});

app.post('/api/admin/task-library', auth, adminOnly, async (req, res) => {
  const { title, category, description, appIcon, appUrl, verificationType } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  try {
    let icon = appIcon ? appIcon.trim() : '';
    if (icon.includes('drive.google.com') || icon.includes('docs.google.com')) {
      const fileIdMatch = icon.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || icon.match(/\/d\/([a-zA-Z0-9_-]+)/) || icon.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        icon = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    } else if (icon.includes('dropbox.com')) {
      icon = icon.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=[01]/, '');
    }
    const finalIcon = icon || 'Apps Icons/04afefd3-aaf3-4d08-86e9-3c1281220097.jpg';

    const [r] = await pool.execute(`
      INSERT INTO task_library(title, category, description, app_icon, app_url, verification_type, active)
      VALUES(?, ?, ?, ?, ?, ?, 1)
    `, [title.trim(), (category || 'Apps').trim(), description.trim(), finalIcon, appUrl ? appUrl.trim() : null, verificationType || 'proof']);
    res.json({ ok: true, message: 'Task added to library.', id: r.insertId });
  } catch (e) {
    console.error('Add task error:', e);
    res.status(500).json({ message: 'Could not add task to library' });
  }
});

app.post('/api/admin/task-library/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const [r] = await pool.execute(`UPDATE task_library SET active = 1 - active WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Task not found in library.' });
    res.json({ ok: true, message: 'Task status updated.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not toggle task' });
  }
});

app.put('/api/admin/task-library/:id', auth, adminOnly, async (req, res) => {
  const { title, category, description, appIcon, appUrl, verificationType } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  try {
    let icon = appIcon ? String(appIcon).trim() : '';
    if (icon.includes('drive.google.com') || icon.includes('docs.google.com')) {
      const fileIdMatch = icon.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || icon.match(/\/d\/([a-zA-Z0-9_-]+)/) || icon.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        icon = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    } else if (icon.includes('dropbox.com')) {
      icon = icon.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=[01]/, '');
    }

    const [r] = await pool.execute(`
      UPDATE task_library 
      SET title = ?, category = ?, description = ?, app_icon = ?, app_url = ?, verification_type = ?
      WHERE id = ?
    `, [
      title.trim(),
      (category || 'Apps').trim(),
      description.trim(),
      icon || 'Apps Icons/04afefd3-aaf3-4d08-86e9-3c1281220097.jpg',
      appUrl ? appUrl.trim() : null,
      verificationType || 'proof',
      req.params.id
    ]);

    if (!r.affectedRows) return res.status(404).json({ message: 'Task not found in library.' });
    res.json({ ok: true, message: 'Task updated successfully.' });
  } catch (e) {
    console.error('Update task error:', e);
    res.status(500).json({ message: 'Could not update task in library' });
  }
});

app.delete('/api/admin/task-library/:id', auth, adminOnly, async (req, res) => {
  try {
    const [r] = await pool.execute(`DELETE FROM task_library WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Task not found in library.' });
    res.json({ ok: true, message: 'Task deleted successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not delete task' });
  }
});

app.post('/api/admin/tasks/generate', auth, adminOnly, async (_req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [libs] = await conn.execute('SELECT id FROM task_library WHERE active=1 ORDER BY id ASC');
    if (!libs.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'No active tasks found in the library pool.' });
    }

    // Insert into daily_tasks for today
    for (let i = 0; i < libs.length; i++) {
      await conn.execute(
        `INSERT INTO daily_tasks(task_date, task_library_id) VALUES(CURDATE(),?) ON DUPLICATE KEY UPDATE active=1`,
        [libs[i].id]
      );
    }

    // Assign tasks to all active users with automated quota fulfillment & cycling
    const [users] = await conn.execute(`SELECT id FROM users WHERE status='active'`);
    let assignedCount = 0;

    for (const u of users) {
      await syncUserDailyTasks(conn, u.id);
      assignedCount++;
    }

    await conn.commit();
    res.json({ ok: true, message: `Successfully assigned daily tasks across ${users.length} active members.` });
  } catch (e) {
    await conn.rollback();
    console.error('Generate tasks error:', e);
    res.status(500).json({ message: 'Failed to generate daily tasks.' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/tasks/pause', auth, adminOnly, async (req, res) => {
  try {
    const [[current]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='task_assignments_paused' LIMIT 1`);
    const isPaused = current && current.value_json === 'true';
    const nextVal = !isPaused;

    await pool.execute(
      `INSERT INTO site_settings(setting_key, value_json, updated_by) 
       VALUES('task_assignments_paused', ?, ?) 
       ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_by=VALUES(updated_by)`,
      [String(nextVal), req.user.id]
    );

    res.json({
      ok: true,
      paused: nextVal,
      message: nextVal ? 'Task assignments are now paused.' : 'Task assignments have resumed.'
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to toggle task pause state.' });
  }
});

app.get('/api/site-settings', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT setting_key, value_json FROM site_settings`);
    const settings = {};
    rows.forEach(r => {
      let parsed = r.value_json;
      if (r.value_json === 'true') parsed = true;
      else if (r.value_json === 'false') parsed = false;
      settings[r.setting_key] = parsed;
    });
    res.json(settings);
  } catch {
    res.json({});
  }
});

app.post('/api/admin/settings', auth, adminOnly, async (req, res) => {
  const key = String(req.body.key || '').trim();
  const value = req.body.value !== undefined ? req.body.value : true;
  if (!key) return res.status(400).json({ message: 'Setting key is required.' });

  const map = {
    'Maintenance Mode': 'maintenance_mode',
    'New Registrations': 'new_registrations',
    'Withdrawals': 'withdrawals_enabled',
    'Task Assignments': 'task_assignments_paused',
    'Deposits': 'deposits_enabled',
    'Lucky Wheel': 'lucky_wheel_enabled',
    'Team Commissions': 'team_commissions_enabled',
    'Require Active Plan to Refer': 'require_active_plan_to_refer',
    'require_active_plan_to_refer': 'require_active_plan_to_refer'
  };
  const settingKey = map[key] || key;

  try {
    await pool.execute(
      `INSERT INTO site_settings(setting_key, value_json, updated_by) 
       VALUES(?,?,?) 
       ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_by=VALUES(updated_by)`,
      [settingKey, String(value), req.user.id]
    );

    // If require_active_plan_to_refer changed, sync users table
    if (settingKey === 'require_active_plan_to_refer') {
      const isRestricted = (value === true || value === 'true');
      if (!isRestricted) {
        // Open to everyone: generate referral codes for all users who don't have one
        const [usersWithoutCode] = await pool.execute(`SELECT id FROM users WHERE (referral_code IS NULL OR referral_code = '')`);
        for (const u of usersWithoutCode) {
          const genCode = 'CC' + Math.random().toString(36).slice(2, 9).toUpperCase();
          await pool.execute(`UPDATE users SET referral_code=? WHERE id=?`, [genCode, u.id]);
        }
      } else {
        // Restricted to active packages: remove referral codes from users without an active paid plan (except admin)
        await pool.execute(`
          UPDATE users u
          LEFT JOIN user_plans up ON up.user_id = u.id AND up.status = 'active'
          LEFT JOIN plans p ON p.id = up.plan_id
          SET u.referral_code = NULL
          WHERE u.role != 'admin' AND (up.id IS NULL OR p.code = 'INTERN' OR p.code = 'EXPIRED' OR p.job_bond <= 0)
        `);
      }
    }

    res.json({ ok: true, key: settingKey, value: !!value, message: `System setting "${key}" updated successfully.` });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update system setting.' });
  }
});

// ----------------- ANNOUNCEMENTS & NEWS CENTER API -----------------
app.get('/api/announcements/active', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, title, message, image_url, action_url, action_text, category, display_mode, is_pinned, active,
             DATE_FORMAT(created_at, '%d %b %Y') AS created_date
      FROM announcements 
      WHERE active=1 
      ORDER BY is_pinned DESC, id DESC 
      LIMIT 10
    `);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

// GET /api/news — user-facing News Center stream
app.get('/api/news', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, title, message, image_url, action_url, action_text, category, display_mode, is_pinned, active,
             DATE_FORMAT(created_at, '%d %b %Y') AS created_date
      FROM announcements 
      WHERE active=1 
      ORDER BY is_pinned DESC, id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/admin/announcements', auth, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, title, message, image_url, action_url, action_text, category, display_mode, is_pinned, active,
             DATE_FORMAT(created_at, '%d %b %Y • %h:%i %p') AS created_date
      FROM announcements 
      ORDER BY is_pinned DESC, id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch announcements' });
  }
});

app.post('/api/admin/announcements', auth, adminOnly, async (req, res) => {
  const { title, message, imageUrl, actionUrl, actionText, category, displayMode, active, isPinned } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ message: 'News / Announcement title is required.' });
  if (!message || !String(message).trim()) return res.status(400).json({ message: 'News / Announcement message is required.' });

  try {
    let img = imageUrl ? String(imageUrl).trim() : '';
    if (img.includes('drive.google.com') || img.includes('docs.google.com')) {
      const fileIdMatch = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || img.match(/\/d\/([a-zA-Z0-9_-]+)/) || img.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        img = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    }

    const [r] = await pool.execute(`
      INSERT INTO announcements(title, message, image_url, action_url, action_text, category, display_mode, active, is_pinned)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      String(title).trim(),
      String(message).trim(),
      img || null,
      actionUrl ? String(actionUrl).trim() : 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
      actionText ? String(actionText).trim() : 'Join WhatsApp Channel',
      category ? String(category).trim() : 'announcement',
      displayMode || 'every_visit',
      active !== undefined ? (active ? 1 : 0) : 1,
      isPinned ? 1 : 0
    ]);

    res.json({ ok: true, id: r.insertId, message: 'News article / announcement published successfully.' });
  } catch (e) {
    console.error('Create announcement error:', e);
    res.status(500).json({ message: 'Failed to publish announcement.' });
  }
});

app.put('/api/admin/announcements/:id', auth, adminOnly, async (req, res) => {
  const { title, message, imageUrl, actionUrl, actionText, category, displayMode, active, isPinned } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ message: 'News / Announcement title is required.' });
  if (!message || !String(message).trim()) return res.status(400).json({ message: 'News / Announcement message is required.' });

  try {
    let img = imageUrl ? String(imageUrl).trim() : '';
    if (img.includes('drive.google.com') || img.includes('docs.google.com')) {
      const fileIdMatch = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || img.match(/\/d\/([a-zA-Z0-9_-]+)/) || img.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        img = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    }

    const [r] = await pool.execute(`
      UPDATE announcements
      SET title = ?, message = ?, image_url = ?, action_url = ?, action_text = ?, category = ?, display_mode = ?, active = ?, is_pinned = ?
      WHERE id = ?
    `, [
      String(title).trim(),
      String(message).trim(),
      img || null,
      actionUrl ? String(actionUrl).trim() : 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
      actionText ? String(actionText).trim() : 'Join WhatsApp Channel',
      category ? String(category).trim() : 'announcement',
      displayMode || 'every_visit',
      active !== undefined ? (active ? 1 : 0) : 1,
      isPinned ? 1 : 0,
      req.params.id
    ]);

    if (!r.affectedRows) return res.status(404).json({ message: 'News article / announcement not found.' });
    res.json({ ok: true, message: 'News article / announcement updated successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update announcement.' });
  }
});

app.post('/api/admin/announcements/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const [r] = await pool.execute(`UPDATE announcements SET active = 1 - active WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Announcement not found.' });
    res.json({ ok: true, message: 'Announcement visibility toggled.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to toggle announcement status.' });
  }
});

app.delete('/api/admin/announcements/:id', auth, adminOnly, async (req, res) => {
  try {
    const [r] = await pool.execute(`DELETE FROM announcements WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Announcement not found.' });
    res.json({ ok: true, message: 'Announcement deleted successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete announcement.' });
  }
});

// ----------------- LUCKY WHEEL CONTROL CENTER API -----------------
app.get('/api/admin/wheel/control-center', auth, adminOnly, async (_req, res) => {
  try {
    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_config' LIMIT 1`);
    const defaultNumbers = [50, 100, 200, 300, 450, 500, 550, 600, 650, 700];
    const segmentColors = ['#7c3aed', '#db2777', '#2563eb', '#d97706', '#9333ea', '#e11d48', '#059669', '#0891b2', '#4f46e5', '#ca8a04'];
    const defaultSegments = defaultNumbers.map((n, idx) => ({
      id: idx + 1,
      label: `Rs. ${Number(n).toLocaleString()}`,
      reward: Number(n),
      weight: 10,
      color: segmentColors[idx % segmentColors.length]
    }));

    let config = {
      enabled: true,
      dailyLimit: 1,
      prizeSegmentsRaw: '50, 100, 200, 300, 450, 500, 550, 600, 650, 700',
      prizeSegments: defaultNumbers,
      defaultWinAmount: '100',
      depositAutoWinPrize: '200',
      autoRechargeSpin: true,
      segments: defaultSegments
    };

    if (setting?.value_json) {
      try { config = { ...config, ...JSON.parse(setting.value_json) }; } catch {}
    }

    // Active users list for search selector
    const [users] = await pool.execute(
      `SELECT id, full_name, email, phone FROM users WHERE status = 'active' ORDER BY id DESC LIMIT 200`
    );

    // Active user spin allocations
    const [allocations] = await pool.execute(`
      SELECT u.id, u.full_name, u.email, u.phone,
             COALESCE(us.bonus_spins, 0) AS available_spins,
             us.locked_prize,
             COALESCE(us.locked_spins_count, 0) AS locked_spins_count,
             COALESCE(us.total_spins_used, 0) AS spins_completed,
             COALESCE((SELECT SUM(reward) FROM lucky_wheel_spins WHERE user_id = u.id), 0) AS total_cash_won,
             us.updated_at
      FROM users u
      LEFT JOIN user_spins us ON us.user_id = u.id
      WHERE (us.bonus_spins > 0 OR us.locked_prize IS NOT NULL OR us.total_spins_used > 0)
      ORDER BY us.updated_at DESC, u.id DESC
      LIMIT 100
    `);

    // Recent spin activity log
    const [recentSpins] = await pool.execute(`
      SELECT lws.id, lws.user_id, lws.segment_label, lws.reward, lws.spin_source,
             DATE_FORMAT(lws.created_at, '%d %b %Y • %h:%i %p') AS formatted_date,
             lws.created_at,
             u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM lucky_wheel_spins lws
      JOIN users u ON u.id = lws.user_id
      ORDER BY lws.id DESC LIMIT 50
    `);

    res.json({
      config,
      users,
      allocations,
      recentSpins
    });
  } catch (e) {
    console.error('Control center fetch error:', e);
    res.status(500).json({ message: 'Failed to load wheel control center' });
  }
});

app.post('/api/admin/wheel/save-global-settings', auth, adminOnly, async (req, res) => {
  try {
    const { prizeSegmentsRaw, defaultWinAmount, depositAutoWinPrize, autoRechargeSpin } = req.body;
    
    // Parse and validate 10 numbers
    const rawStr = String(prizeSegmentsRaw || '').trim();
    const parsedNums = rawStr.split(/[\s,]+/).map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
    
    if (parsedNums.length !== 10) {
      return res.status(400).json({ message: `Must specify exactly 10 valid prize numbers. Found ${parsedNums.length}.` });
    }

    const segmentColors = ['#7c3aed', '#db2777', '#2563eb', '#d97706', '#9333ea', '#e11d48', '#059669', '#0891b2', '#4f46e5', '#ca8a04'];
    const segments = parsedNums.map((n, idx) => ({
      id: idx + 1,
      label: `Rs. ${Number(n).toLocaleString()}`,
      reward: Number(n),
      weight: 10,
      color: segmentColors[idx % segmentColors.length]
    }));

    const config = {
      enabled: true,
      dailyLimit: 1,
      prizeSegmentsRaw: parsedNums.join(', '),
      prizeSegments: parsedNums,
      defaultWinAmount: defaultWinAmount || String(parsedNums[0]),
      depositAutoWinPrize: depositAutoWinPrize || String(parsedNums[1] || parsedNums[0]),
      autoRechargeSpin: autoRechargeSpin !== false,
      segments
    };

    await pool.execute(
      `INSERT INTO site_settings(setting_key, value_json, updated_by)
       VALUES('lucky_wheel_config', ?, ?)
       ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_by=VALUES(updated_by)`,
      [JSON.stringify(config), req.user.id]
    );

    res.json({ ok: true, message: 'Global wheel settings saved successfully.', config });
  } catch (e) {
    console.error('Save global wheel settings error:', e);
    res.status(500).json({ message: 'Failed to save global settings' });
  }
});

app.post('/api/admin/wheel/assign-guaranteed-spin', auth, adminOnly, async (req, res) => {
  const { userId, spinsCount, guaranteedWinAmount } = req.body;
  const count = Math.max(1, Number(spinsCount || 1));
  const prize = String(guaranteedWinAmount || '').trim();

  if (!userId) {
    return res.status(400).json({ message: 'Please select a valid user.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[u]] = await conn.execute(`SELECT id, full_name, email, phone FROM users WHERE id = ?`, [userId]);
    if (!u) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found.' });
    }

    const lockedVal = prize === 'random' ? null : prize;
    const lockedCount = prize === 'random' ? 0 : count;

    await conn.execute(`
      INSERT INTO user_spins(user_id, bonus_spins, total_spins_granted, total_spins_used, locked_prize, locked_spins_count)
      VALUES(?, ?, ?, 0, ?, ?)
      ON DUPLICATE KEY UPDATE
        bonus_spins = bonus_spins + VALUES(bonus_spins),
        total_spins_granted = total_spins_granted + VALUES(total_spins_granted),
        locked_prize = VALUES(locked_prize),
        locked_spins_count = VALUES(locked_spins_count)
    `, [u.id, count, count, lockedVal, lockedCount]);

    await conn.execute(`
      INSERT INTO spin_grants_log(user_id, spins_count, source, note, granted_by)
      VALUES(?, ?, 'admin_grant', ?, ?)
    `, [u.id, count, `Admin allocated ${count} spin(s) with locked outcome: ${lockedVal ? `Rs. ${lockedVal}` : 'Random'}`, req.user.id]);

    await createNotification(
      u.id,
      'spin_reward',
      '🎁 Special Lucky Wheel Spins Assigned!',
      `You have been granted ${count} Lucky Fortune Wheel spin(s)! Spin now to claim your reward.`,
      'rewards'
    );

    await conn.commit();
    res.json({
      ok: true,
      message: `Successfully granted ${count} spin(s) to ${u.full_name} (${u.phone || u.email}) with locked prize: ${lockedVal ? `Rs. ${lockedVal}` : 'Random'}.`
    });
  } catch (e) {
    await conn.rollback();
    console.error('Assign guaranteed spin error:', e);
    res.status(500).json({ message: 'Failed to assign spins to user' });
  } finally {
    conn.release();
  }
});

app.post('/api/admin/wheel/update-allocation', auth, adminOnly, async (req, res) => {
  const { userId, action, prizeValue } = req.body;
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    if (action === 'add_spin') {
      await pool.execute(`
        INSERT INTO user_spins(user_id, bonus_spins, total_spins_granted) VALUES(?, 1, 1)
        ON DUPLICATE KEY UPDATE bonus_spins = bonus_spins + 1, total_spins_granted = total_spins_granted + 1
      `, [userId]);
      return res.json({ ok: true, message: '+1 Free spin added to user.' });
    }
    if (action === 'set_prize') {
      await pool.execute(`UPDATE user_spins SET locked_prize = ?, locked_spins_count = GREATEST(1, locked_spins_count) WHERE user_id = ?`, [String(prizeValue), userId]);
      return res.json({ ok: true, message: `Locked prize updated to Rs. ${prizeValue}.` });
    }
    if (action === 'clear_lock') {
      await pool.execute(`UPDATE user_spins SET locked_prize = NULL, locked_spins_count = 0 WHERE user_id = ?`, [userId]);
      return res.json({ ok: true, message: 'Locked prize cleared for user.' });
    }
    if (action === 'reset') {
      await pool.execute(`UPDATE user_spins SET bonus_spins = 0, locked_prize = NULL, locked_spins_count = 0 WHERE user_id = ?`, [userId]);
      return res.json({ ok: true, message: 'User bonus spins and locked prizes reset.' });
    }
    res.status(400).json({ message: 'Unknown action.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update user allocation.' });
  }
});

// Legacy backward-compatible endpoints
app.get('/api/admin/wheel/config', auth, adminOnly, async (_req, res) => {
  try {
    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='lucky_wheel_config' LIMIT 1`);
    let config = { enabled: true, dailyLimit: 1, segments: [] };
    if (setting?.value_json) {
      try { config = { ...config, ...JSON.parse(setting.value_json) }; } catch {}
    }
    res.json(config);
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch wheel config' });
  }
});

app.post('/api/admin/wheel/config', auth, adminOnly, async (req, res) => {
  await pool.execute(
    `INSERT INTO site_settings(setting_key, value_json, updated_by)
     VALUES('lucky_wheel_config', ?, ?)
     ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_by=VALUES(updated_by)`,
    [JSON.stringify(req.body), req.user.id]
  );
  res.json({ ok: true, message: 'Settings saved.' });
});

app.get('/api/admin/wheel/history', auth, adminOnly, async (_req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT lws.id, lws.user_id, lws.segment_label, lws.reward, lws.spin_source,
             DATE_FORMAT(lws.created_at, '%d %b %Y • %h:%i %p') AS formatted_date,
             lws.created_at,
             u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM lucky_wheel_spins lws
      JOIN users u ON u.id = lws.user_id
      ORDER BY lws.id DESC LIMIT 100
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Could not fetch spin history' });
  }
});

app.post('/api/admin/wheel/grant-spins', auth, adminOnly, async (req, res) => {
  const { userId, spinsCount, note } = req.body;
  const count = Math.max(1, Number(spinsCount || 1));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await grantUserSpins(conn, userId, count, 'admin_grant', note || 'Complimentary spin', req.user.id);
    await conn.commit();
    res.json({ ok: true, message: `Granted ${count} spin(s).` });
  } catch {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to grant spin.' });
  } finally {
    conn.release();
  }
});
// ----------------- BANK & RECHARGE PAYMENT METHODS API -----------------
const FALLBACK_PAYMENT_METHODS = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    accountLabel: 'JazzCash Business Till',
    accountName: 'Code Clever Payments',
    accountNumber: '03254138875',
    instructions: 'Pay to the business till and upload your payment screenshot.',
    qrCode: '',
    status: 'active',
    logo: '/assets/Wallets/jazzcash.svg'
  },
  {
    id: 'sadapay',
    name: 'SadaPay',
    accountLabel: 'SadaPay account number',
    accountName: 'Code Clever Treasury',
    accountNumber: '03254138875',
    instructions: 'Pay to the SadaPay account and upload your payment screenshot.',
    qrCode: '',
    status: 'active',
    logo: '/assets/Wallets/sadapay.svg'
  },
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    accountLabel: 'Easypaisa Mobile Account',
    accountName: 'Code Clever Finance',
    accountNumber: '03451234567',
    instructions: 'Send money to the Easypaisa number and submit the transaction ID.',
    qrCode: '',
    status: 'active',
    logo: '/assets/Wallets/easypaisa.svg'
  },
  {
    id: 'nayapay',
    name: 'NayaPay',
    accountLabel: 'NayaPay Wallet ID',
    accountName: 'Code Clever Operations',
    accountNumber: '@codeclever',
    instructions: 'Transfer to the NayaPay ID and upload the payment receipt.',
    qrCode: '',
    status: 'active',
    logo: '/assets/Wallets/nayapay.svg'
  }
];

app.get('/api/proxy-image', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) return res.status(400).send('URL required');
    let url = rawUrl.trim();

    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      const fileIdMatch =
        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
        url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        url = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1200`;
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      if (rawUrl.includes('drive.google.com')) {
        const fileIdMatch =
          rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
          rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
          rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          const fallbackRes = await fetch(`https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`);
          if (fallbackRes.ok) {
            const buffer = await fallbackRes.arrayBuffer();
            res.setHeader('Content-Type', fallbackRes.headers.get('content-type') || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(Buffer.from(buffer));
          }
        }
      }
      return res.status(response.status).send('Failed to load image');
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('Image proxy error:', e);
    res.status(500).send('Proxy error');
  }
});

app.get('/api/payment-methods', async (_req, res) => {
  try {
    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='payment_methods_config' LIMIT 1`);
    let methods = FALLBACK_PAYMENT_METHODS;
    if (setting?.value_json) {
      try {
        const parsed = JSON.parse(setting.value_json);
        if (Array.isArray(parsed) && parsed.length > 0) methods = parsed;
      } catch {}
    }
    const active = methods.filter(m => m.status !== 'inactive');
    res.json(active.length > 0 ? active : FALLBACK_PAYMENT_METHODS);
  } catch (e) {
    res.json(FALLBACK_PAYMENT_METHODS);
  }
});

app.get('/api/admin/bank/methods', auth, adminOnly, async (_req, res) => {
  try {
    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='payment_methods_config' LIMIT 1`);
    let methods = FALLBACK_PAYMENT_METHODS;
    if (setting?.value_json) {
      try {
        const parsed = JSON.parse(setting.value_json);
        if (Array.isArray(parsed) && parsed.length > 0) methods = parsed;
      } catch {}
    }
    res.json(methods);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load bank settings' });
  }
});

app.post('/api/admin/bank/save-method', auth, adminOnly, async (req, res) => {
  try {
    const { id, name, accountLabel, accountName, accountNumber, instructions, qrCode, status, logo } = req.body;
    if (!id) return res.status(400).json({ message: 'Method ID is required' });

    const [[setting]] = await pool.execute(`SELECT value_json FROM site_settings WHERE setting_key='payment_methods_config' LIMIT 1`);
    let methods = FALLBACK_PAYMENT_METHODS;
    if (setting?.value_json) {
      try {
        const parsed = JSON.parse(setting.value_json);
        if (Array.isArray(parsed) && parsed.length > 0) methods = parsed;
      } catch {}
    }

    const idx = methods.findIndex(m => m.id === id);
    const updatedItem = {
      id,
      name: name || (idx !== -1 ? methods[idx].name : id),
      accountLabel: String(accountLabel ?? (idx !== -1 ? methods[idx].accountLabel : '')).trim(),
      accountName: String(accountName ?? (idx !== -1 ? methods[idx].accountName : '')).trim(),
      accountNumber: String(accountNumber ?? (idx !== -1 ? methods[idx].accountNumber : '')).trim(),
      instructions: String(instructions ?? (idx !== -1 ? methods[idx].instructions : '')).trim(),
      qrCode: qrCode !== undefined ? String(qrCode).trim() : (idx !== -1 ? methods[idx].qrCode : ''),
      status: status || (idx !== -1 ? methods[idx].status : 'active'),
      logo: logo || (idx !== -1 ? methods[idx].logo : `/assets/Wallets/${id}.svg`)
    };

    if (idx !== -1) {
      methods[idx] = updatedItem;
    } else {
      methods.push(updatedItem);
    }

    await pool.execute(
      `INSERT INTO site_settings (setting_key, value_json, updated_by)
       VALUES ('payment_methods_config', ?, ?)
       ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_by=VALUES(updated_by)`,
      [JSON.stringify(methods), req.user.id]
    );

    res.json({ ok: true, message: `${updatedItem.name} settings updated successfully.`, method: updatedItem, methods });
  } catch (e) {
    console.error('Save bank method error:', e);
    res.status(500).json({ message: 'Failed to save bank method settings' });
  }
});

// ----------------- DAILY CHECK-IN ENDPOINTS -----------------
app.get('/api/checkin/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Check if user has an active plan
    const [[activePlan]] = await pool.execute(`
      SELECT p.id AS plan_id, p.name AS plan_name, p.code AS plan_code 
      FROM user_plans up 
      JOIN plans p ON p.id = up.plan_id 
      WHERE up.user_id = ? AND up.status = 'active' 
      LIMIT 1
    `, [userId]);

    const eligible = !!activePlan;

    // 2. Check today's checkin
    const [[todayCheckin]] = await pool.execute(`
      SELECT id, reward, streak_count, created_at 
      FROM daily_checkins 
      WHERE user_id = ? AND checkin_date = CURDATE()
    `, [userId]);

    const claimedToday = !!todayCheckin;

    // 3. Compute streak
    let currentStreak = 0;
    if (claimedToday) {
      currentStreak = Number(todayCheckin.streak_count || 1);
    } else {
      // Check if user claimed yesterday
      const [[yesterdayCheckin]] = await pool.execute(`
        SELECT streak_count 
        FROM daily_checkins 
        WHERE user_id = ? AND checkin_date = CURDATE() - INTERVAL 1 DAY
      `, [userId]);
      currentStreak = Number(yesterdayCheckin?.streak_count || 0);
    }

    // 4. Current month checkins
    const [monthRows] = await pool.execute(`
      SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS dt, reward, streak_count 
      FROM daily_checkins 
      WHERE user_id = ? AND YEAR(checkin_date) = YEAR(CURDATE()) AND MONTH(checkin_date) = MONTH(CURDATE())
      ORDER BY checkin_date ASC
    `, [userId]);

    const monthCheckins = monthRows.map(r => r.dt);

    // 5. Total checkin earnings
    const [[totalEarnRow]] = await pool.execute(`
      SELECT COALESCE(SUM(reward), 0) AS val 
      FROM daily_checkins 
      WHERE user_id = ?
    `, [userId]);

    // 6. User wallets
    const [[walletRow]] = await pool.execute(`
      SELECT available_balance, commission_balance 
      FROM wallets 
      WHERE user_id = ?
    `, [userId]);

    // 7. Recent checkin history
    const [historyRows] = await pool.execute(`
      SELECT id, DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date, reward, streak_count, wallet_credited, created_at 
      FROM daily_checkins 
      WHERE user_id = ? 
      ORDER BY id DESC 
      LIMIT 15
    `, [userId]);

    res.json({
      eligible,
      plan_name: activePlan?.plan_name || null,
      plan_code: activePlan?.plan_code || null,
      claimed_today: claimedToday,
      current_streak: currentStreak,
      reward_amount: 10.00,
      today_date: new Date().toISOString().slice(0, 10),
      month_checkins: monthCheckins,
      total_checkin_earnings: Number(totalEarnRow?.val || 0),
      personal_balance: Number(walletRow?.available_balance || 0),
      commission_balance: Number(walletRow?.commission_balance || 0),
      history: historyRows
    });
  } catch (e) {
    console.error('Checkin status error:', e);
    res.status(500).json({ message: 'Failed to fetch check-in status' });
  }
});

app.post('/api/checkin/claim', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Must have an active plan ("Daily check-in unlocks after you activate your first plan")
    const [[activePlan]] = await pool.execute(`
      SELECT p.id AS plan_id, p.name AS plan_name, p.code AS plan_code 
      FROM user_plans up 
      JOIN plans p ON p.id = up.plan_id 
      WHERE up.user_id = ? AND up.status = 'active' 
      LIMIT 1
    `, [userId]);

    if (!activePlan) {
      return res.status(403).json({
        ok: false,
        message: 'Daily check-in unlocks after you activate your first plan.'
      });
    }

    // 2. Check if already checked in today
    const [[alreadyClaimed]] = await pool.execute(`
      SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = CURDATE()
    `, [userId]);

    if (alreadyClaimed) {
      return res.status(400).json({
        ok: false,
        message: 'You have already checked in today. Please return tomorrow!'
      });
    }

    // 3. Compute streak
    const [[yesterdayRow]] = await pool.execute(`
      SELECT streak_count FROM daily_checkins 
      WHERE user_id = ? AND checkin_date = CURDATE() - INTERVAL 1 DAY
    `, [userId]);

    const streak = (yesterdayRow ? Number(yesterdayRow.streak_count) : 0) + 1;
    const reward = 10.00;

    // 4. Insert checkin record
    const [ins] = await pool.execute(`
      INSERT INTO daily_checkins (user_id, checkin_date, reward, streak_count, wallet_credited)
      VALUES (?, CURDATE(), ?, ?, 'commission')
    `, [userId, reward, streak]);

    // 5. Strictly credit Commission Wallet
    await pool.execute(`
      UPDATE wallets 
      SET commission_balance = commission_balance + ?, lifetime_earned = lifetime_earned + ? 
      WHERE user_id = ?
    `, [reward, reward, userId]);

    // 6. Get updated balances & wallet id
    const [[wRow]] = await pool.execute(`
      SELECT id, commission_balance, available_balance FROM wallets WHERE user_id = ?
    `, [userId]);

    // 7. Record in wallet_transactions
    if (wRow) {
      await pool.execute(`
        INSERT INTO wallet_transactions 
        (wallet_id, user_id, type, direction, amount, reference_type, reference_id, balance_after, note)
        VALUES (?, ?, 'reward', 'credit', ?, 'daily_checkin', ?, ?, ?)
      `, [wRow.id, userId, reward, ins.insertId, Number(wRow.commission_balance), `Daily Check-in Reward (Streak: ${streak} Days)`]);
    }

    res.json({
      ok: true,
      message: `Daily check-in successful! Rs. 10 credited to your Commission Wallet.`,
      reward,
      streak_count: streak,
      wallet_credited: 'commission',
      new_commission_balance: Number(wRow?.commission_balance || 0),
      new_personal_balance: Number(wRow?.available_balance || 0)
    });
  } catch (e) {
    console.error('Checkin claim error:', e);
    res.status(500).json({ ok: false, message: e.message || 'Failed to process daily check-in' });
  }
});

// ----------------- CENTRALIZED ERROR HANDLING MIDDLEWARE -----------------
app.use((err, req, res, next) => {
  console.error('[Unhandled API Error]:', err.message || err);
  if (res.headersSent) return next(err);

  const isDbError = err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'PROTOCOL_CONNECTION_LOST';
  const message = isDbError
    ? 'Database service is currently unreachable. Please check MySQL / TiDB connection.'
    : (process.env.NODE_ENV === 'production' ? 'Internal server error occurred.' : (err.message || 'Internal server error'));

  res.status(500).json({
    ok: false,
    message,
    error: isDbError ? 'DATABASE_UNREACHABLE' : 'INTERNAL_SERVER_ERROR'
  });
});

// 404 Catch-All for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve production static frontend if dist folder exists
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1d' }));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT || 4000);
const server = app.listen(PORT, () => {
  console.log(`Code Clever API running on http://localhost:${PORT} (PID ${process.pid})`);
});

// Graceful Shutdown Handlers
const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP listener closed.');
    await closePool();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
