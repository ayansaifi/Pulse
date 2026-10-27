const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { Date, URL, encodeURIComponent, decodeURIComponent };
vm.createContext(context);
vm.runInContext(fs.readFileSync('analyzer.js', 'utf8'), context);
const analyzer = vm.runInContext('PulseAnalyzer', context);

const startTime = Date.parse('2026-10-28T10:00:00.000Z');
const results = [
  { id: 1, status: 200, duration: 40, completedAt: startTime + 100,
    url: 'https://private.example/api?token=secret', headers: { authorization: 'secret' }, bodySnippet: 'secret',
    rateLimitHeaders: { 'x-ratelimit-limit': '100', 'x-ratelimit-remaining': '99' } },
  { id: 2, status: 429, duration: 80, completedAt: startTime + 500,
    url: 'https://private.example/api?token=secret', rateLimitHeaders: { 'retry-after': '30', 'x-ratelimit-remaining': '0' } },
  { id: 3, status: 0, duration: 100, completedAt: startTime + 520, rateLimitHeaders: {} }
];
const report = analyzer.summarize(results, { startTime, durationMs: 520, concurrency: 1, delayMs: 100 }, startTime + 520);
assert.equal(report.first429, 2);
assert.equal(report.counts.limited, 1);
assert.equal(report.counts.network, 1);
assert.equal(report.limit, 100);
assert.equal(report.remaining, 0);
assert.equal(report.retryAfterSeconds, 30);
assert.equal(report.observedBefore429Rps, 2);
assert(analyzer.isValidReport(report));

const serialized = JSON.stringify(report);
for (const secret of ['private.example', 'token=secret', 'authorization', 'bodySnippet']) assert(!serialized.includes(secret));
const shared = analyzer.readShareHash(analyzer.shareHash(report));
assert.equal(shared.first429, 2);
assert.equal(analyzer.readShareHash('#report=%7Bbad'), null);
assert.equal(analyzer.readShareHash('#report=' + encodeURIComponent(JSON.stringify({ ...report, endpoint: 'secret' }))), null);
assert.equal(analyzer.parseRetryAfter('Wed, 28 Oct 2026 10:00:30 GMT', startTime), 30);
assert.equal(analyzer.parseReset('1793181630', startTime), 30);
assert.equal(analyzer.summarize([], {}), null);
console.log('Passed: rate-limit summary, header parsing, and safe sharing.');
