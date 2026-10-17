/**
 * API Stress Tester & Rate Limit Inspector - Backend Server
 * Built with pure Node.js standard libraries (zero dependencies required)
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Mock API state for testing rate limits locally
const mockRateLimit = {
  windowMs: 60 * 1000, // 1 minute
  limit: 60,           // 60 requests allowed per window
  clients: new Map()   // IP -> { count, resetTime }
};

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Handle Static Files
function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Security check to avoid path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// Built-in Mock API with configurable rate limiting for demonstration/testing
function handleMockApi(req, res, parsedUrl) {
  const queryLimit = parseInt(parsedUrl.query.limit) || mockRateLimit.limit;
  const queryWindow = (parseInt(parsedUrl.query.window) || 60) * 1000;
  
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let clientData = mockRateLimit.clients.get(clientIp);
  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 0,
      resetTime: now + queryWindow
    };
    mockRateLimit.clients.set(clientIp, clientData);
  }

  clientData.count++;
  const remaining = Math.max(0, queryLimit - clientData.count);
  const resetSeconds = Math.ceil((clientData.resetTime - now) / 1000);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
    'X-RateLimit-Limit': queryLimit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(clientData.resetTime / 1000).toString(),
  };

  if (clientData.count > queryLimit) {
    headers['Retry-After'] = resetSeconds.toString();
    res.writeHead(429, headers);
    return res.end(JSON.stringify({
      status: 429,
      error: 'Too Many Requests',
      message: `Rate limit of ${queryLimit} requests exceeded. Try again in ${resetSeconds}s.`,
      rateLimit: {
        limit: queryLimit,
        remaining: 0,
        resetInSeconds: resetSeconds
      }
    }));
  }

  res.writeHead(200, headers);
  res.end(JSON.stringify({
    status: 200,
    message: 'Success from Mock Rate-Limited API',
    timestamp: new Date().toISOString(),
    requestNumber: clientData.count,
    rateLimit: {
      limit: queryLimit,
      remaining: remaining,
      resetInSeconds: resetSeconds
    }
  }));
}

// Reset mock rate limits
function handleResetMock(req, res) {
  mockRateLimit.clients.clear();
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({ success: true, message: 'Mock API rate limits reset' }));
}

// Proxy Endpoint to avoid CORS limitations and capture accurate response headers
function handleProxy(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  let bodyData = [];
  req.on('data', chunk => bodyData.push(chunk));
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(bodyData).toString() || '{}');
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Invalid JSON payload for proxy' }));
    }

    const targetUrl = payload.url;
    const targetMethod = (payload.method || 'GET').toUpperCase();
    const targetHeaders = payload.headers || {};
    const targetBody = payload.body || null;

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Missing target url parameter' }));
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Invalid target URL format' }));
    }

    const isHttps = parsedTarget.protocol === 'https:';
    const clientModule = isHttps ? https : http;

    const options = {
      protocol: parsedTarget.protocol,
      hostname: parsedTarget.hostname,
      port: parsedTarget.port || (isHttps ? 443 : 80),
      path: parsedTarget.pathname + parsedTarget.search,
      method: targetMethod,
      headers: {
        'User-Agent': 'ApiLoadTester/1.0',
        ...targetHeaders
      },
      timeout: 30000
    };

    if (targetBody && (targetMethod === 'POST' || targetMethod === 'PUT' || targetMethod === 'PATCH')) {
      if (!options.headers['Content-Length'] && !options.headers['content-length']) {
        options.headers['Content-Length'] = Buffer.byteLength(targetBody);
      }
    }

    const startTime = Date.now();

    const proxyReq = clientModule.request(options, (proxyRes) => {
      const responseChunks = [];
      proxyRes.on('data', chunk => responseChunks.push(chunk));
      proxyRes.on('end', () => {
        const duration = Date.now() - startTime;
        const respBody = Buffer.concat(responseChunks).toString('utf8');

        // Extract rate-limit headers explicitly for ease of frontend consumption
        const rawHeaders = proxyRes.headers;
        const rateLimitHeaders = {};
        for (const [k, v] of Object.entries(rawHeaders)) {
          const lower = k.toLowerCase();
          if (lower.includes('ratelimit') || lower === 'retry-after') {
            rateLimitHeaders[lower] = v;
          }
        }

        const result = {
          status: proxyRes.statusCode,
          statusText: proxyRes.statusMessage,
          duration: duration,
          headers: rawHeaders,
          rateLimitHeaders: rateLimitHeaders,
          bodySnippet: respBody.slice(0, 5000), // First 5KB
          bodySize: Buffer.byteLength(respBody)
        };

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(result));
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      const duration = Date.now() - startTime;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        status: 408,
        statusText: 'Request Timeout (30s exceeded)',
        duration: duration,
        headers: {},
        rateLimitHeaders: {},
        bodySnippet: 'Request timed out after 30s',
        bodySize: 0,
        isError: true
      }));
    });

    proxyReq.on('error', (err) => {
      const duration = Date.now() - startTime;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        status: 0,
        statusText: err.code || 'Network/Connection Error',
        duration: duration,
        headers: {},
        rateLimitHeaders: {},
        bodySnippet: err.message,
        bodySize: 0,
        isError: true
      }));
    });

    if (targetBody && (targetMethod === 'POST' || targetMethod === 'PUT' || targetMethod === 'PATCH')) {
      proxyReq.write(targetBody);
    }
    proxyReq.end();
  });
}

// Server Dispatcher
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/proxy') {
    return handleProxy(req, res);
  } else if (pathname === '/api/mock-api') {
    return handleMockApi(req, res, parsedUrl);
  } else if (pathname === '/api/mock-api/reset') {
    return handleResetMock(req, res);
  } else {
    return serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 API Load Tester & Rate Limit Inspector running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🎯 Mock Rate Limit API: http://localhost:${PORT}/api/mock-api?limit=50&window=60`);
  console.log(`=======================================================`);
});
