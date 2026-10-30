const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');

function runAnalytics(url, referrer) {
  const loaded = [];
  const pageUrl = new URL(url);
  const window = {};
  const document = {
    referrer,
    createElement: () => ({}),
    head: { appendChild: script => loaded.push(script) },
  };
  vm.runInNewContext(code, { location: pageUrl, document, window, URL, Date });
  return { loaded, window };
}

const preview = runAnalytics('http://localhost:8080/report.html?endpoint=private#report=private', '');
assert.equal(preview.loaded.length, 0);
assert.equal(preview.window.dataLayer, undefined);

const published = runAnalytics(
  'https://apulse.tech/report.html?endpoint=private#report=private',
  'https://apulse.tech/?token=private#secret',
);
assert.equal(published.loaded.length, 1);
assert.equal(published.loaded[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-MW7RQ6YT1B');
const config = published.window.dataLayer[2];
assert.equal(config[0], 'config');
assert.equal(config[1], 'G-MW7RQ6YT1B');
assert.equal(config[2].page_location, 'https://apulse.tech/report.html');
assert.equal(config[2].page_referrer, 'https://apulse.tech/');
assert(!JSON.stringify(published.window.dataLayer).includes('private'));

console.log('Passed: production-only analytics and sanitized page URLs.');
