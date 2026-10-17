/**
 * Vercel Serverless Function: /api/mock-api
 * Simulates rate-limited API responses with standard headers and 429 when quota is reached.
 */

// Memory state per serverless container instance
const memoryState = {
  windowMs: 60 * 1000,
  limit: 50,
  clients: new Map()
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Handle reset request
  if (req.query && req.query.reset === 'true') {
    memoryState.clients.clear();
    return res.status(200).json({ success: true, message: 'Mock API rate limits reset' });
  }

  const queryLimit = parseInt(req.query?.limit) || memoryState.limit;
  const queryWindow = (parseInt(req.query?.window) || 60) * 1000;
  
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let clientData = memoryState.clients.get(clientIp);
  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 0,
      resetTime: now + queryWindow
    };
    memoryState.clients.set(clientIp, clientData);
  }

  clientData.count++;
  const remaining = Math.max(0, queryLimit - clientData.count);
  const resetSeconds = Math.ceil((clientData.resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', queryLimit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(clientData.resetTime / 1000).toString());

  if (clientData.count > queryLimit) {
    res.setHeader('Retry-After', resetSeconds.toString());
    return res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: `Rate limit of ${queryLimit} requests exceeded. Try again in ${resetSeconds}s.`,
      rateLimit: {
        limit: queryLimit,
        remaining: 0,
        resetInSeconds: resetSeconds
      }
    });
  }

  return res.status(200).json({
    status: 200,
    message: 'Success from Mock Rate-Limited API on Vercel',
    timestamp: new Date().toISOString(),
    requestNumber: clientData.count,
    rateLimit: {
      limit: queryLimit,
      remaining: remaining,
      resetInSeconds: resetSeconds
    }
  });
};
