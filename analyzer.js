/* Aggregate-only rate-limit reports. Never copy target URLs, request headers or bodies. */
const PulseAnalyzer = (() => {
  const integer = value => {
    const match = String(value ?? '').match(/^\s*(\d+)/);
    return match ? Number(match[1]) : null;
  };

  function parseRetryAfter(value, now = Date.now()) {
    if (value == null) return null;
    const seconds = integer(value);
    if (seconds !== null && /^\s*\d+\s*$/.test(String(value))) return seconds;
    const date = Date.parse(String(value));
    return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : null;
  }

  function parseReset(value, now = Date.now()) {
    const number = integer(value);
    if (number === null) return null;
    if (number > 1e12) return Math.max(0, Math.ceil((number - now) / 1000));
    if (number > 1e9) return Math.max(0, Math.ceil(number - now / 1000));
    return number;
  }

  function exposedHeaders(results, now) {
    const fields = { limit: null, remaining: null, resetSeconds: null, retryAfterSeconds: null };
    for (const result of results) {
      const h = result.rateLimitHeaders || {};
      const combined = h.ratelimit || '';
      const combinedField = name => {
        const match = combined.match(new RegExp('(?:^|[,;\\s])' + name + '\\s*=\\s*"?(\\d+)', 'i'));
        return match ? match[1] : null;
      };
      const limit = integer(h['ratelimit-limit'] ?? h['x-ratelimit-limit'] ?? h['x-rate-limit-limit'] ?? combinedField('limit'));
      const remaining = integer(h['ratelimit-remaining'] ?? h['x-ratelimit-remaining'] ?? h['x-rate-limit-remaining'] ?? combinedField('remaining'));
      const reset = parseReset(h['ratelimit-reset'] ?? h['x-ratelimit-reset'] ?? h['x-rate-limit-reset'] ?? combinedField('reset'), now);
      const retry = parseRetryAfter(h['retry-after'], now);
      if (limit !== null) fields.limit = limit;
      if (remaining !== null) fields.remaining = remaining;
      if (reset !== null) fields.resetSeconds = reset;
      if (retry !== null) fields.retryAfterSeconds = retry;
    }
    return fields;
  }

  function summarize(results, config = {}, now = Date.now()) {
    if (!Array.isArray(results) || results.length === 0) return null;
    const counts = { success: 0, limited: 0, otherHttp: 0, network: 0 };
    let first429 = null;
    let first429At = null;
    let before429 = 0;
    let latencySum = 0;
    for (const result of results) {
      const status = Number(result.status) || 0;
      latencySum += Number(result.duration) || 0;
      if (status === 429) {
        counts.limited++;
        if (first429 === null) {
          first429 = Number(result.id) || null;
          first429At = Number(result.completedAt) || null;
        }
      } else if (status >= 200 && status < 300) {
        counts.success++;
        if (first429 === null) before429++;
      } else if (status === 0) counts.network++;
      else counts.otherHttp++;
    }
    const visible = exposedHeaders(results, now);
    const duration = Math.max(0, Number(config.durationMs) || 0);
    const pre429Ms = first429At !== null && Number(config.startTime) > 0 ? first429At - Number(config.startTime) : null;
    const observedBefore429Rps = pre429Ms !== null && pre429Ms > 0
      ? Math.round((before429 / Math.max(pre429Ms / 1000, 0.1)) * 10) / 10 : null;
    return {
      version: 1,
      generatedAt: new Date(now).toISOString(),
      completed: results.length,
      counts,
      first429,
      limit: visible.limit,
      remaining: visible.remaining,
      resetSeconds: visible.resetSeconds,
      retryAfterSeconds: visible.retryAfterSeconds,
      observedBefore429Rps,
      averageLatencyMs: Math.round(latencySum / results.length),
      durationSeconds: Math.round(duration / 100) / 10,
      concurrency: Number(config.concurrency) || null,
      delayMs: Number(config.delayMs) || 0
    };
  }

  function isValidReport(report) {
    if (!report || report.version !== 1 || !Number.isInteger(report.completed) || report.completed < 1 || report.completed > 1000) return false;
    const allowed = ['version', 'generatedAt', 'completed', 'counts', 'first429', 'limit', 'remaining', 'resetSeconds', 'retryAfterSeconds', 'observedBefore429Rps', 'averageLatencyMs', 'durationSeconds', 'concurrency', 'delayMs'];
    if (Object.keys(report).length !== allowed.length || !allowed.every(key => Object.prototype.hasOwnProperty.call(report, key))) return false;
    if (typeof report.generatedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(report.generatedAt)) return false;
    if (!report.counts || !['success', 'limited', 'otherHttp', 'network'].every(k => Number.isInteger(report.counts[k]) && report.counts[k] >= 0)) return false;
    if (Object.keys(report.counts).some(key => !['success', 'limited', 'otherHttp', 'network'].includes(key))) return false;
    if (Object.values(report.counts).reduce((a, b) => a + b, 0) !== report.completed) return false;
    return ['first429', 'limit', 'remaining', 'resetSeconds', 'retryAfterSeconds', 'observedBefore429Rps', 'averageLatencyMs', 'durationSeconds', 'concurrency', 'delayMs']
      .every(k => report[k] == null || (typeof report[k] === 'number' && Number.isFinite(report[k]) && report[k] >= 0));
  }

  function shareHash(report) {
    if (!isValidReport(report)) throw new Error('Invalid report');
    return '#report=' + encodeURIComponent(JSON.stringify(report));
  }

  function readShareHash(hash) {
    if (typeof hash !== 'string' || !hash.startsWith('#report=') || hash.length > 4000) return null;
    try {
      const report = JSON.parse(decodeURIComponent(hash.slice(8)));
      return isValidReport(report) ? report : null;
    } catch { return null; }
  }

  return { summarize, parseRetryAfter, parseReset, isValidReport, shareHash, readShareHash };
})();
