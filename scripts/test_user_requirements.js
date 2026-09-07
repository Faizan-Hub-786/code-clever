import mysql from 'mysql2/promise';
import crypto from 'crypto';
import 'dotenv/config';

const BASE_URL = 'http://localhost:4000/api';

async function solveAltcha() {
  const res = await fetch(`${BASE_URL}/altcha-challenge`);
  const data = await res.json();
  const { algorithm, challenge, salt, signature, expires, maxnumber } = data;
  const max = maxnumber || 50000;

  for (let i = 0; i <= max; i++) {
    const hash = crypto.createHash('sha256').update(salt + i).digest('hex');
    if (hash === challenge) {
      const solution = {
        algorithm,
        challenge,
        number: i,
        salt,
        signature,
        expires,
        maxnumber: max
      };
      return Buffer.from(JSON.stringify(solution)).toString('base64');
    }
  }
  throw new Error('Failed to solve ALTCHA challenge within range');
}

async function run() {
  console.log('====================================================');
  console.log('  TESTING USER REQUIREMENTS: TEAM, FINANCE & BANK   ');
  console.log('====================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'code_clever'
  });

  // 1. Temporarily allow refer without paid plan for test chain
  await pool.execute(`UPDATE site_settings SET value_json='false' WHERE setting_key='require_active_plan_to_refer'`);

  // Log in Admin
  const adminRes = await fetch(`${BASE_URL}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faizanbarvi786@gmail.com', password: 'AdminPassword123!' })
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  console.log('Admin login status:', adminRes.status, 'Token acquired:', Boolean(adminToken));

  const [[adminUser]] = await pool.execute(`SELECT id, referral_code FROM users WHERE role='admin' LIMIT 1`);
  const adminRef = adminUser.referral_code || 'ADMIN01';
  console.log('Admin ID:', adminUser.id, 'Referral Code:', adminRef);

  // Clean up any prior test users
  await pool.execute(`DELETE FROM users WHERE email IN ('userA_test@cc.com', 'userB_test@cc.com', 'userC_test@cc.com')`);

  // ----------------------------------------------------
  // TEST 1: TEAM HIERARCHY (Level A, B, C)
  // ----------------------------------------------------
  console.log('\n--- 1. TEAM HIERARCHY REGISTRATION CHAIN ---');

  // Step A: Register User A under Admin
  const resA = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'User A Direct',
      email: 'userA_test@cc.com',
      password: 'Password123!',
      phone: '03001111111',
      invitationCode: adminRef,
      altchaPayload: await solveAltcha()
    })
  });
  const dataA = await resA.json();
  console.log('Register User A status:', resA.status, 'ID:', dataA.user?.id);
  const tokenA = dataA.token;

  const [[userARow]] = await pool.execute(`SELECT id, referral_code, referred_by, root_leader_id, team_level, referral_depth FROM users WHERE email='userA_test@cc.com'`);
  console.log('User A DB row:', userARow);
  if (userARow && userARow.referred_by === adminUser.id && userARow.team_level === 'A' && userARow.root_leader_id === adminUser.id) {
    console.log('✅ [PASS] User A is correctly set to Level A under Admin');
  } else {
    console.error('❌ [FAIL] User A level mismatch:', userARow);
  }

  // Step B: Register User B under User A
  const resB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'User B Secondary',
      email: 'userB_test@cc.com',
      password: 'Password123!',
      phone: '03002222222',
      invitationCode: userARow.referral_code,
      altchaPayload: await solveAltcha()
    })
  });
  const dataB = await resB.json();
  console.log('Register User B status:', resB.status, 'ID:', dataB.user?.id);
  const tokenB = dataB.token;

  const [[userBRow]] = await pool.execute(`SELECT id, referral_code, referred_by, root_leader_id, team_level, referral_depth FROM users WHERE email='userB_test@cc.com'`);
  console.log('User B DB row:', userBRow);
  if (userBRow && userBRow.referred_by === userARow.id && userBRow.team_level === 'B' && userBRow.root_leader_id === adminUser.id) {
    console.log('✅ [PASS] User B is correctly set to Level B under Admin');
  } else {
    console.error('❌ [FAIL] User B level mismatch:', userBRow);
  }

  // Step C: Register User C under User B
  const resC = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'User C Tertiary',
      email: 'userC_test@cc.com',
      password: 'Password123!',
      phone: '03003333333',
      invitationCode: userBRow.referral_code,
      altchaPayload: await solveAltcha()
    })
  });
  const dataC = await resC.json();
  console.log('Register User C status:', resC.status, 'ID:', dataC.user?.id);
  const tokenC = dataC.token;

  const [[userCRow]] = await pool.execute(`SELECT id, referral_code, referred_by, root_leader_id, team_level, referral_depth FROM users WHERE email='userC_test@cc.com'`);
  console.log('User C DB row:', userCRow);
  if (userCRow.referred_by === userBRow.id && userCRow.team_level === 'C' && userCRow.root_leader_id === adminUser.id) {
    console.log('✅ [PASS] User C is correctly set to Level C under Admin');
  } else {
    console.error('❌ [FAIL] User C level mismatch:', userCRow);
  }

  // Verify referrals table entries
  const [refRows] = await pool.execute(
    `SELECT referrer_id, referred_user_id, level FROM referrals WHERE referred_user_id IN (?, ?, ?) ORDER BY referred_user_id, level`,
    [userARow.id, userBRow.id, userCRow.id]
  );
  console.log('Referrals table mappings:', refRows);

  // Check Admin Team view (/api/team)
  const teamAdminRes = await fetch(`${BASE_URL}/team`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const teamAdminData = await teamAdminRes.json();
  console.log(`Admin Team counts: Level A: ${teamAdminData.level1_count}, Level B: ${teamAdminData.level2_count}, Level C: ${teamAdminData.level3_count}`);

  // Check User A Team view (/api/team)
  const teamARes = await fetch(`${BASE_URL}/team`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const teamAData = await teamARes.json();
  console.log(`User A Team counts: Level A: ${teamAData.level1_count}, Level B: ${teamAData.level2_count}, Level C: ${teamAData.level3_count}`);

  // Check User B Team view (/api/team)
  const teamBRes = await fetch(`${BASE_URL}/team`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const teamBData = await teamBRes.json();
  console.log(`User B Team counts: Level A: ${teamBData.level1_count}, Level B: ${teamBData.level2_count}, Level C: ${teamBData.level3_count}`);

  // Admin ABC Breakdown API test
  const abcRes = await fetch(`${BASE_URL}/admin/team/leader/${adminUser.id}/abc-breakdown`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const abcData = await abcRes.json();
  console.log(`Admin ABC Breakdown: Team A: ${abcData.teamA?.length}, Team B: ${abcData.teamB?.length}, Team C: ${abcData.teamC?.length}`);

  if (teamAdminData.level1_count >= 1 && teamAdminData.level2_count >= 1 && teamAdminData.level3_count >= 1 &&
      teamAData.level1_count === 1 && teamAData.level2_count === 1 && teamAData.level3_count === 0 &&
      teamBData.level1_count === 1 && teamBData.level2_count === 0) {
    console.log('✅ [PASS] Team A, B, and C hierarchy correctly calculated across all generations!');
  } else {
    console.error('❌ [FAIL] Team counts mismatch.');
  }

  // ----------------------------------------------------
  // TEST 2: DEPOSIT & WITHDRAWAL FULL CYCLE
  // ----------------------------------------------------
  console.log('\n--- 2. DEPOSIT & WITHDRAWAL TRANSACTION CYCLE ---');

  // User A deposits Rs. 3500
  const depRes = await fetch(`${BASE_URL}/deposits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'jazzcash',
      amount: 3500,
      senderName: 'User A Account',
      senderNumber: '03001111111',
      txId: 'TX123456789',
      proofImage: 'https://example.com/receipt.jpg'
    })
  });
  const depData = await depRes.json();
  console.log('Deposit submission status:', depRes.status, 'Deposit ID:', depData.id);

  // Admin approves User A deposit
  const approveRes = await fetch(`${BASE_URL}/admin/deposits/${depData.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const approveData = await approveRes.json();
  console.log('Admin deposit approve status:', approveRes.status, approveData.message);

  const [[walletAAfterDep]] = await pool.execute(`SELECT available_balance, pending_balance FROM wallets WHERE user_id=?`, [userARow.id]);
  console.log('User A wallet after deposit approved:', walletAAfterDep);
  if (Number(walletAAfterDep.available_balance) === 3500) {
    console.log('✅ [PASS] User A personal wallet credited with Rs. 3500');
  }

  // Set fund password for User A so withdrawal can be requested
  const bcrypt = (await import('bcryptjs')).default;
  const pinHash = await bcrypt.hash('123456', 10);
  await pool.execute(
    `INSERT INTO user_settings(user_id, setting_key, settings_json) VALUES(?, 'fund_password', ?) ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)`,
    [userARow.id, JSON.stringify({ pinHash })]
  );

  // User A requests withdrawal of Rs. 1000
  const withRes = await fetch(`${BASE_URL}/withdrawals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'jazzcash',
      amount: 1000,
      accountTitle: 'User A Title',
      accountNumber: '03001111111',
      fundPassword: '123456',
      walletType: 'personal'
    })
  });
  const withData = await withRes.json();
  console.log('Withdrawal request status:', withRes.status, withData.message);

  const [[walletAAfterWith]] = await pool.execute(`SELECT available_balance, pending_balance FROM wallets WHERE user_id=?`, [userARow.id]);
  console.log('User A wallet after withdrawal requested (reserved):', walletAAfterWith);
  if (Number(walletAAfterWith.available_balance) === 2500 && Number(walletAAfterWith.pending_balance) === 1000) {
    console.log('✅ [PASS] Rs. 1000 reserved to pending balance, available balance reduced to Rs. 2500');
  }

  // Get withdrawal ID
  const [[withRow]] = await pool.execute(`SELECT id, status FROM withdrawals WHERE user_id=? ORDER BY id DESC LIMIT 1`, [userARow.id]);

  // Admin marks withdrawal as Paid
  const paidRes = await fetch(`${BASE_URL}/admin/withdrawals/${withRow.id}/paid`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const paidData = await paidRes.json();
  console.log('Admin mark withdrawal paid status:', paidRes.status, paidData.message);

  const [[walletAFinal]] = await pool.execute(`SELECT available_balance, pending_balance FROM wallets WHERE user_id=?`, [userARow.id]);
  console.log('User A wallet after payout completed:', walletAFinal);
  if (Number(walletAFinal.available_balance) === 2500 && Number(walletAFinal.pending_balance) === 0) {
    console.log('✅ [PASS] Withdrawal marked paid, pending balance cleared to 0');
  }

  // ----------------------------------------------------
  // TEST 3: DYNAMIC BANK & QR CODE SYNC
  // ----------------------------------------------------
  console.log('\n--- 3. DYNAMIC BANK & QR CODE SYNC TEST ---');

  const testNewAcctNumber = '03219988776';
  const testNewAcctTitle = 'Code Clever VIP Treasury';
  const testNewQR = 'https://drive.google.com/file/d/1TEST_QR_CODE_12345/view';

  // Admin updates JazzCash bank details
  const saveBankRes = await fetch(`${BASE_URL}/admin/bank/save-method`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'jazzcash',
      name: 'JazzCash',
      accountLabel: 'JazzCash Corporate Account',
      accountName: testNewAcctTitle,
      accountNumber: testNewAcctNumber,
      instructions: 'Please send payment to this official account and save proof.',
      qrCode: testNewQR,
      status: 'active'
    })
  });
  const saveBankData = await saveBankRes.json();
  console.log('Admin save bank method status:', saveBankRes.status, saveBankData.message);

  // Fetch public payment methods (as seen by user on deposit page)
  const publicBankRes = await fetch(`${BASE_URL}/payment-methods?_t=${Date.now()}`);
  const publicMethods = await publicBankRes.json();
  const updatedJazzCash = publicMethods.find(m => m.id === 'jazzcash');
  console.log('Public payment method JazzCash:', updatedJazzCash);

  if (updatedJazzCash &&
      updatedJazzCash.accountNumber === testNewAcctNumber &&
      updatedJazzCash.accountName === testNewAcctTitle &&
      updatedJazzCash.qrCode === testNewQR) {
    console.log('✅ [PASS] Public Deposit page receives updated bank details and QR code immediately!');
  } else {
    console.error('❌ [FAIL] Bank details did not sync dynamically:', updatedJazzCash);
  }

  // Restore JazzCash to official default
  await fetch(`${BASE_URL}/admin/bank/save-method`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'jazzcash',
      name: 'JazzCash',
      accountLabel: 'JazzCash Business Till',
      accountName: 'Code Clever Payments',
      accountNumber: '03254138875',
      instructions: 'Pay to the business till and upload your payment screenshot.',
      qrCode: '',
      status: 'active'
    })
  });

  // Clean up test accounts
  await pool.execute(`DELETE FROM users WHERE email IN ('userA_test@cc.com', 'userB_test@cc.com', 'userC_test@cc.com')`);

  // Restore require_active_plan_to_refer to true
  await pool.execute(`UPDATE site_settings SET value_json='true' WHERE setting_key='require_active_plan_to_refer'`);

  await pool.end();
  console.log('\n====================================================');
  console.log('  ALL AUDIT & VALIDATION SUITES EXECUTED!           ');
  console.log('====================================================');
}

run().catch(console.error);
