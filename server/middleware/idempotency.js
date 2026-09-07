// Idempotency in-memory registry: key -> { status: 'pending'|'completed', response, expiresAt }
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 3 * 60 * 1000; // 3 minutes

// Clean up expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
}, 60000).unref();

/**
 * Idempotency Middleware for Financial / Sensitive Mutations
 */
export function idempotencyMiddleware(req, res, next) {
  const idempotencyKey =
    req.headers['idempotency-key'] ||
    req.body?.idempotencyKey ||
    (req.user?.id ? `user_${req.user.id}_${req.baseUrl || ''}${req.path}_${req.body?.transaction_reference || req.body?.amount || ''}` : null);

  if (!idempotencyKey || req.method === 'GET') {
    return next();
  }

  const now = Date.now();
  const existing = idempotencyStore.get(idempotencyKey);

  if (existing) {
    if (existing.status === 'pending') {
      return res.status(409).json({
        message: 'A duplicate request is already in progress. Please wait a moment.'
      });
    }
    if (existing.status === 'completed') {
      return res.status(existing.statusCode || 200).json(existing.body);
    }
  }

  // Mark as pending
  idempotencyStore.set(idempotencyKey, {
    status: 'pending',
    expiresAt: now + IDEMPOTENCY_TTL_MS
  });

  // Intercept response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const hasExplicitKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || req.body?.transaction_reference;
    if (res.statusCode >= 200 && res.statusCode < 300 && hasExplicitKey) {
      idempotencyStore.set(idempotencyKey, {
        status: 'completed',
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
      });
    } else {
      // Release in-flight lock if finished or on error, allowing subsequent distinct actions
      idempotencyStore.delete(idempotencyKey);
    }
    return originalJson(body);
  };

  next();
}

export function clearIdempotencyStore() {
  idempotencyStore.clear();
}
