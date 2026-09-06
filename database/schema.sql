CREATE DATABASE IF NOT EXISTS code_clever
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE code_clever;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  phone VARCHAR(40) NULL,
  avatar_url LONGTEXT NULL,
  referral_code VARCHAR(32) NOT NULL UNIQUE,
  referred_by BIGINT UNSIGNED NULL,
  status ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  security_question VARCHAR(255) NULL DEFAULT 'What was the name of your first school?',
  security_answer_hash VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_referrer FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  job_bond DECIMAL(14,2) NOT NULL,
  daily_task_count INT UNSIGNED NOT NULL,
  unit_reward DECIMAL(12,2) NOT NULL,
  daily_max_reward DECIMAL(14,2) NOT NULL,
  monthly_max_reward DECIMAL(14,2) NOT NULL,
  annual_max_reward DECIMAL(14,2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  UNIQUE KEY uq_active_user_plan (user_id, status),
  CONSTRAINT fk_user_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_plans_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS task_library (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  app_icon VARCHAR(255) NOT NULL,
  app_url VARCHAR(500) NULL,
  description VARCHAR(255) NOT NULL,
  verification_type ENUM('manual','callback','proof') NOT NULL DEFAULT 'proof',
  reward_override DECIMAL(12,2) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_date DATE NOT NULL,
  task_library_id BIGINT UNSIGNED NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_daily_library (task_date, task_library_id),
  CONSTRAINT fk_daily_library FOREIGN KEY (task_library_id) REFERENCES task_library(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_task_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  daily_task_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  reward DECIMAL(12,2) NOT NULL,
  status ENUM('available','started','submitted','completed','rejected','expired') NOT NULL DEFAULT 'available',
  proof_url LONGTEXT NULL,
  verified_by BIGINT UNSIGNED NULL,
  started_at DATETIME NULL,
  submitted_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_daily_task (user_id, daily_task_id),
  CONSTRAINT fk_uta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uta_daily FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_uta_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  available_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  commission_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  lifetime_earned DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('task_reward','deposit','withdrawal','adjustment','refund','team_commission','lucky_wheel') NOT NULL,
  direction ENUM('credit','debit') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference_type VARCHAR(40) NULL,
  reference_id BIGINT UNSIGNED NULL,
  balance_after DECIMAL(14,2) NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet_tx_user_date (user_id, created_at),
  CONSTRAINT fk_wtx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  CONSTRAINT fk_wtx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deposits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  method ENUM('jazzcash','easypaisa','nayapay','sadapay') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  transaction_reference VARCHAR(120) NOT NULL,
  proof_image LONGTEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deposit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deposit_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  method ENUM('jazzcash','easypaisa','nayapay','sadapay') NOT NULL,
  account_name VARCHAR(120) NOT NULL,
  account_number VARCHAR(80) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  wallet_type ENUM('personal','commission') NOT NULL DEFAULT 'personal',
  status ENUM('pending','processing','paid','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdraw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdraw_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referrer_id BIGINT UNSIGNED NOT NULL,
  referred_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  level TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_date (user_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  value_json LONGTEXT NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(80) NOT NULL,
  settings_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_setting (user_id, setting_key),
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS team_reward_levels (
  level TINYINT UNSIGNED PRIMARY KEY,
  percent DECIMAL(5,2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS team_reward_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  source_user_id BIGINT UNSIGNED NOT NULL,
  level TINYINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference_type VARCHAR(40) NOT NULL,
  reference_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_team_reward_reference (user_id, source_user_id, level, reference_type, reference_id),
  CONSTRAINT fk_trl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trl_source FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- News & Official Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  image_url LONGTEXT NULL,
  action_url VARCHAR(500) NULL,
  action_text VARCHAR(100) NULL DEFAULT 'Join WhatsApp Channel',
  category VARCHAR(60) NOT NULL DEFAULT 'announcement',
  display_mode ENUM('every_visit','once_per_session','once_per_login') DEFAULT 'every_visit',
  active TINYINT(1) DEFAULT 1,
  is_pinned TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ann_active (active),
  INDEX idx_ann_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_checkins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  checkin_date DATE NOT NULL,
  reward DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
  streak_count INT NOT NULL DEFAULT 1,
  wallet_credited VARCHAR(32) NOT NULL DEFAULT 'commission',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_date (user_id, checkin_date),
  INDEX idx_checkin_user_date (user_id, checkin_date),
  CONSTRAINT fk_checkin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Default Plan Seeds
INSERT INTO plans
(code,name,job_bond,daily_task_count,unit_reward,daily_max_reward,monthly_max_reward,annual_max_reward,active)
VALUES
('C1','Starter',3500,2,59,118,3540,42480,1),
('C2','Growth',15500,4,129,516,15480,185760,1),
('C3','Pro',59000,8,246,1968,59040,708480,1),
('C4','Advanced',215000,12,597,7164,214920,2579040,1),
('C5','Elite',479000,16,998,15968,479040,5748480,1),
('C6','Premium',1454000,18,2693,48474,1454220,17450640,1),
('C7','Business',3869000,22,5862,128964,3868920,46427040,1),
('C8','Executive',7349000,24,10207,244968,7349040,88188480,1),
('C9','Enterprise',15149000,28,18035,504980,15149400,181792800,1)
ON DUPLICATE KEY UPDATE
name=VALUES(name), job_bond=VALUES(job_bond), daily_task_count=VALUES(daily_task_count),
unit_reward=VALUES(unit_reward), daily_max_reward=VALUES(daily_max_reward),
monthly_max_reward=VALUES(monthly_max_reward), annual_max_reward=VALUES(annual_max_reward);

-- Default Task Library Seeds (25 Real Sponsor Applications)
INSERT INTO task_library (title,category,app_icon,app_url,description,verification_type,active)
VALUES
('TikTok Lite', 'Social Video', 'Apps Icons/tiktok.svg', 'https://www.tiktok.com/', 'Evaluate short-form video streaming latency, audio sync, and engagement response.', 'proof', 1),
('Instagram Reels', 'Media & Photo', 'Apps Icons/instagram.svg', 'https://www.instagram.com/', 'Verify instant reel playback buffer, story camera filter rendering, and DM delivery.', 'proof', 1),
('Clash of Clans', 'Strategy Gaming', 'Apps Icons/Clash of clan.jpg', 'https://supercell.com/', 'Evaluate 60 FPS multiplayer village load times and army attack animations.', 'proof', 1),
('Gardenscapes', 'Casual Puzzle', 'Apps Icons/Gardensacpes.jpg', 'https://playrix.com/', 'Test puzzle board gesture sensitivity and booster reward claiming responsiveness.', 'proof', 1),
('Easypaisa FastPay', 'FinTech & Mobile Money', 'Apps Icons/04afefd3-aaf3-4d08-86e9-3c1281220097.jpg', 'https://easypaisa.com.pk/', 'Test QR payment scanner, instant mobile load, and biometric login authentication.', 'proof', 1),
('JazzCash Wallet Hub', 'Digital Banking & Payments', 'Apps Icons/0e5c35cd-c964-4501-a66b-b5f0ebaad134.jpg', 'https://jazzcash.com.pk/', 'Verify money transfer routing speed, debit card controls, and utility bill payments.', 'proof', 1),
('SadaPay Mastercard', 'Digital Neobank', 'Apps Icons/2ba54139-e360-43e4-b841-77d647d9a6de.jpg', 'https://sadapay.pk/', 'Test virtual Mastercard instant card freezing, FX exchange rate preview, and fee-free ATM locator UI.', 'proof', 1),
('NayaPay Visa Wallet', 'Finance & Everyday Lifestyle', 'Apps Icons/3456afe7-efc5-4566-a9f4-18c4619d4f59.jpg', 'https://nayapay.com/', 'Evaluate bill payment barcode scanner, in-chat money requests, and real-time SMS OTP verification speed.', 'proof', 1),
('Daraz Mega Shopping', 'E-Commerce Marketplace', 'Apps Icons/35d9294f-9bd9-40e4-8164-6403fb83a7a4.jpg', 'https://www.daraz.pk/', 'Test flash sale countdown timer accuracy, voucher claim 1-tap interaction, and doorstep COD checkout.', 'proof', 1),
('Foodpanda Express', 'Food Delivery & Pandamart', 'Apps Icons/4f100358-b530-4e4c-bcb9-ccdfa2430b97.jpg', 'https://www.foodpanda.pk/', 'Verify live GPS rider delivery tracking accuracy, restaurant menu search filters, and tip tipping workflow.', 'proof', 1),
('Careem Super App', 'Mobility & Super App', 'Apps Icons/52d3be58-9f62-43c6-83ed-576a559edefe.jpg', 'https://www.careem.com/', 'Audit captain fare estimator accuracy, route map rerouting smoothness, and Careem Pay wallet top-up.', 'proof', 1),
('InDrive Fare Bidding', 'Ride Sharing & Courier', 'Apps Icons/5a83967b-89fa-4b58-8ae3-1f73f0c5bcf9.jpg', 'https://indrive.com/', 'Evaluate peer-to-peer fare negotiation modal, passenger safety shield SOS, and driver rating submission.', 'proof', 1),
('Bykea Fast Logistics', 'Bike Taxi & Cash Delivery', 'Apps Icons/64f73a5f-0327-4136-aaf1-ecc21cd8d01d.jpg', 'https://bykea.com/', 'Verify parcel express booking, cash collection PIN verification, and driver distance estimation.', 'proof', 1),
('OLX Marketplace', 'Classifieds & Autos', 'Apps Icons/676cbef9-ee20-4309-93cb-27ca8bfe47a7.jpg', 'https://www.olx.com.pk/', 'Test classified photo compressor, direct buyer chat notifications, and verified seller badge display.', 'proof', 1),
('PakWheels Auto Portal', 'Automotive & Inspection', 'Apps Icons/6bcac3ef-c49b-437e-8f9b-9767ab8cfa4b.jpg', 'https://www.pakwheels.com/', 'Audit used car price valuation algorithm, 200+ point inspection report viewer, and auction sheet verifier.', 'proof', 1),
('Zameen Property Finder', 'Real Estate & Homes', 'Apps Icons/7236c134-b48a-4019-aa2c-7976bdc248a8.jpg', 'https://www.zameen.com/', 'Verify interactive plot finder map layers, property price index trends, and home mortgage calculator.', 'proof', 1),
('Tamasha Live Cricket HD', 'Sports OTT & Live TV', 'Apps Icons/72497e50-57ca-4837-a884-d9d6e4bf4335.jpg', 'https://tamashaweb.com/', 'Test adaptive bitrate HD live cricket match streaming, background audio PIP, and coin reward hub.', 'proof', 1),
('Tapmad TV Sports Pro', 'Live Entertainment & Matches', 'Apps Icons/74b0ffc5-4365-4c63-86e0-b379b7b9909a.jpg', 'https://tapmad.com/', 'Evaluate 4K HDR ultra-low latency live stream feed, ad-free replay buffer, and multi-language audio switch.', 'proof', 1),
('Cricbuzz Ball by Ball', 'Sports Analytics & News', 'Apps Icons/7dd2f6c0-3968-403e-bfc1-3b428fb6812a.jpg', 'https://www.cricbuzz.com/', 'Review ball-by-ball commentary sync accuracy, live win probability graphs, and push notification speed.', 'proof', 1),
('Binance Pro Crypto', 'Digital Assets & Trading', 'Apps Icons/89ff8a78-4037-4d77-ab9d-f19632941e9e.jpg', 'https://www.binance.com/', 'Audit candlestick technical chart response, P2P escrow payment verification, and price alert alerts.', 'proof', 1),
('Duolingo Language Quest', 'AI Education & Learning', 'Apps Icons/95ed9ece-3f29-4ec2-ba7d-22798de21864.jpg', 'https://duolingo.com/', 'Test speech pronunciation AI voice recognition, interactive lesson streak counter, and audio lesson clips.', 'proof', 1),
('Canva Design Studio', 'Graphics & Visual Content', 'Apps Icons/9740210f-818f-4c1a-a17d-a017105b0f1f.jpg', 'https://canva.com/', 'Verify drag-and-drop template editor responsiveness, background remover AI tool, and high-res image export.', 'proof', 1),
('CapCut Video Studio Pro', 'Video Editing & Effects', 'Apps Icons/97407e33-43f3-443b-a79c-254aa9e3ca13.jpg', 'https://capcut.com/', 'Evaluate multi-layer video timeline scrubbing, auto-subtitle speech generator, and 4K 60fps video export.', 'proof', 1),
('Spotify Music & Podcasts', 'Audio Streaming & Discovery', 'Apps Icons/a67fe4e6-900f-49ad-9457-18790efa0f51.jpg', 'https://spotify.com/', 'Test seamless song crossfade transitions, offline high-quality audio playback, and personalized playlist generator.', 'proof', 1),
('Telegram Messenger X', 'Encrypted Cloud Messaging', 'Apps Icons/c625c119-ca84-4407-a899-79c8ab8e0f4b.jpg', 'https://telegram.org/', 'Evaluate secret end-to-end encrypted chat latency, 2GB large file upload speed, and group poll creation.', 'proof', 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Default Team Commission Levels
INSERT INTO team_reward_levels (level, percent, active)
VALUES
(1, 10.00, 1),
(2, 5.00, 1),
(3, 2.00, 1)
ON DUPLICATE KEY UPDATE percent=VALUES(percent), active=VALUES(active);

-- Guest Chat Messages Table
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

-- Support Inquiries Table
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
