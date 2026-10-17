/**
 * Vercel Serverless Function: /api/proxy
 * Proxies HTTP requests to bypass CORS and capture accurate response/rate-limit headers.
 */

module.exports = async (req, res) => {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    if (!payload || !payload.url) {
      return res.status(400).json({ error: 'Missing target url in payload' });
    }

    const { url: targetUrl, method = 'GET', headers = {}, body = null } = payload;
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'ApiPulseTester/1.0',
        ...headers
      },
      redirect: 'follow'
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
      fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
      if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const startTime = Date.now();
    let upstreamRes;
    try {
      upstreamRes = await fetch(targetUrl, fetchOptions);
    } catch (fetchErr) {
      const duration = Date.now() - startTime;
      return res.status(200).json({
        status: 0,
        statusText: fetchErr.message || 'Upstream Connection Error',
        duration: duration,
        headers: {},
        rateLimitHeaders: {},
        bodySnippet: fetchErr.message,
        bodySize: 0,
        isError: true
      });
    }

    const duration = Date.now() - startTime;
    const rawHeaders = {};
    const rateLimitHeaders = {};

    upstreamRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      rawHeaders[lower] = val;
      if (lower.includes('ratelimit') || lower === 'retry-after') {
        rateLimitHeaders[lower] = val;
      }
    });

    let respText = '';
    try {
      respText = await upstreamRes.text();
    } catch (e) {
      respText = '(Body not readable)';
    }

    return res.status(200).json({
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      duration: duration,
      headers: rawHeaders,
      rateLimitHeaders: rateLimitHeaders,
      bodySnippet: respText.slice(0, 5000),
      bodySize: Buffer.byteLength(respText || '')
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Proxy execution error: ' + err.message
    });
  }
};
