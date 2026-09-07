
async function testAuth(email, password, label) {
  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log(`[${label}] Status: ${res.status}, Success: ${data.success || !!data.token}, Message: ${data.message || 'OK'}`);
    return res.status === 200;
  } catch (err) {
    console.error(`[${label}] Error:`, err.message);
    return false;
  }
}

async function run() {
  console.log('Testing Admin Login: faizanbarvi786@gmail.com / AdminPassword123!');
  await testAuth('faizanbarvi786@gmail.com', 'AdminPassword123!', 'Admin');

  console.log('\nTesting User Login: testuser@codeclever.com / UserPassword123!');
  const userOk = await testAuth('testuser@codeclever.com', 'UserPassword123!', 'User');

  if (!userOk) {
    console.log('Trying fallback password: ChatResetPass123');
    await testAuth('testuser@codeclever.com', 'ChatResetPass123', 'User (Reset)');
  }
}

run();
