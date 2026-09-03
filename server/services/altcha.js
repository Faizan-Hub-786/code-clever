import crypto from 'crypto';
import 'dotenv/config';

const ALTCHA_HMAC_KEY =
  process.env.ALTCHA_HMAC_KEY ||
  process.env.JWT_SECRET ||
  'codeclever_default_altcha_secure_hmac_key_2026';

// Replay prevention cache: challengeSignature -> expiryTimestamp
const consumedChallenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
const DEFAULT_MAX_NUMBER = Number(process.env.ALTCHA_DIFFICULTY || 50000); // Fast proof-of-work

// Periodically clean up expired replay entries to ensure zero memory accumulation
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of consumedChallenges.entries()) {
    if (expiresAt <= now) {
      consumedChallenges.delete(key);
    }
  }
}, 60000).unref(); // unref so timer doesn't prevent Node.js exit

/**
 * Generate an ALTCHA challenge
 * @param {object} options
 * @returns {object} ALTCHA challenge payload
 */
export function createAltchaChallenge(options = {}) {
  const maxNumber = options.maxNumber || DEFAULT_MAX_NUMBER;
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const salt = crypto.randomBytes(16).toString('hex');
  const secretNumber = Math.floor(Math.random() * maxNumber);

  // Compute challenge string = SHA256(salt + secretNumber)
  const challenge = crypto
    .createHash('sha256')
    .update(salt + secretNumber)
    .digest('hex');

  // Compute HMAC signature over salt + challenge + expiresAt + maxNumber
  const signatureData = `${salt}:${challenge}:${expiresAt}:${maxNumber}`;
  const signature = crypto
    .createHmac('sha256', ALTCHA_HMAC_KEY)
    .update(signatureData)
    .digest('hex');

  return {
    algorithm: 'SHA-256',
    challenge,
    salt,
    maxnumber: maxNumber,
    signature,
    expires: expiresAt
  };
}

/**
 * Verify an ALTCHA solution with cryptographic signature and replay protection
 * @param {string|object} payload - Base64 JSON string or parsed ALTCHA payload
 * @returns {{ verified: boolean, message?: string }}
 */
export function verifyAltchaPayload(payload) {
  if (!payload) {
    return { verified: false, message: 'ALTCHA payload is missing.' };
  }

  let data = payload;
  if (typeof payload === 'string') {
    try {
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      data = JSON.parse(decoded);
    } catch {
      try {
        data = JSON.parse(payload);
      } catch {
        return { verified: false, message: 'Invalid ALTCHA payload encoding.' };
      }
    }
  }

  const { algorithm, challenge, number, salt, signature, expires, maxnumber } = data;

  if (!algorithm || !challenge || number === undefined || !salt || !signature || !expires) {
    return { verified: false, message: 'Incomplete ALTCHA verification fields.' };
  }

  if (algorithm !== 'SHA-256') {
    return { verified: false, message: 'Unsupported ALTCHA algorithm.' };
  }

  const now = Date.now();
  if (Number(expires) < now) {
    return { verified: false, message: 'ALTCHA challenge has expired. Please retry.' };
  }

  // 1. Verify HMAC Signature
  const signatureData = `${salt}:${challenge}:${expires}:${maxnumber || DEFAULT_MAX_NUMBER}`;
  const expectedSignature = crypto
    .createHmac('sha256', ALTCHA_HMAC_KEY)
    .update(signatureData)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { verified: false, message: 'Invalid ALTCHA challenge signature.' };
  }

  // 2. Replay Attack Prevention
  if (consumedChallenges.has(signature)) {
    return { verified: false, message: 'ALTCHA challenge has already been verified (replay rejected).' };
  }

  // 3. Verify Proof-of-Work Solution
  const computedChallenge = crypto
    .createHash('sha256')
    .update(salt + number)
    .digest('hex');

  if (computedChallenge !== challenge) {
    return { verified: false, message: 'Incorrect ALTCHA proof-of-work solution.' };
  }

  // Mark as consumed with expiration
  consumedChallenges.set(signature, Number(expires));

  return { verified: true };
}
