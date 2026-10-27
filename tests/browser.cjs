const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const csp = fs.readFileSync(path.join(root, '_headers'), 'utf8').match(/Content-Security-Policy: (.+)/)[1].trim();
let requests = 0;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/fixture') {
    requests++;
    res.writeHead(requests === 1 ? 200 : 429, { 'Content-Type': 'application/json', 'X-RateLimit-Limit': '1', 'X-RateLimit-Remaining': '0', 'Retry-After': '10' });
    return res.end('{"ok":true}');
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': csp });
  fs.createReadStream(file).pipe(res);
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.PULSE_BROWSER_PATH ? { executablePath: process.env.PULSE_BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const capture = async name => {
      if (process.env.PULSE_SCREENSHOT_DIR) {
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
        fs.mkdirSync(process.env.PULSE_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.PULSE_SCREENSHOT_DIR, name + '.png'), fullPage: true });
      }
    };
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page overflows the viewport');
    await page.goto(origin);
    await noOverflow();
    await capture('pulse-desktop');
    await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-limits').getAttribute('aria-selected'), 'true');
    assert(await page.locator('#view-limits').isVisible());
    await page.locator('#target-url').fill(origin + '/fixture');
    await page.locator('#total-requests').fill('2');
    await page.locator('#concurrency-slider').fill('1');
    await page.locator('#btn-start').click();
    await page.waitForFunction(() => !document.getElementById('btn-report-share').disabled);
    assert.match(await page.locator('#analyzer-summary').textContent(), /HTTP 429 first appeared/);
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    assert(!(await page.locator('.chart-empty').first().isVisible()));
    await capture('pulse-results');
    await page.getByRole('tab', { name: 'Rate limits & report', exact: true }).click();
    await page.locator('#btn-report-share').click();
    await page.waitForFunction(() => document.getElementById('analyzer-share-note').textContent.startsWith('Report link copied'));
    const link = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(new URL(link).pathname, '/report.html');
    assert(!decodeURIComponent(link).includes('/fixture'));
    await page.goto(link);
    assert(await page.locator('#report-content').isVisible());
    assert.equal(await page.locator('#report-completed').textContent(), '2');
    assert.equal(await page.locator('#report-limited').textContent(), '1');
    assert.match(await page.locator('#report-findings').textContent(), /HTTP 429 first appeared at request #2/);
    assert.equal(requests, 2, 'Opening a report must not run requests');
    await noOverflow();
    await capture('pulse-shared-report');
    // Previously copied homepage links must open the new report page.
    await page.goto(origin + '/' + new URL(link).hash);
    await page.waitForURL('**/report.html#*');
    assert(await page.locator('#report-content').isVisible());
    await page.goto(origin);
    await page.evaluate(hash => { location.hash = hash; }, new URL(link).hash);
    await page.waitForURL('**/report.html#*');
    assert(await page.locator('#report-content').isVisible());
    await page.goto(origin + '/report.html#report=broken');
    assert(await page.locator('#report-error').isVisible());
    assert(!(await page.locator('#report-content').isVisible()));
    await page.goto(origin + '/report.html');
    assert(await page.locator('#report-error').isVisible());
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin);
      await noOverflow();
      assert(await page.locator('#setup-workspace').isVisible());
      assert(!(await page.locator('#results-workspace').isVisible()));
      await capture(`pulse-${width}-setup`);
      await page.locator('button[data-workspace-step="results"]').click();
      await page.getByRole('tab', { name: 'Request log', exact: true }).click();
      assert(await page.locator('#logs-tbody').isVisible());
      await noOverflow();
      await page.getByRole('tab', { name: 'Overview', exact: true }).click();
      await capture(`pulse-${width}`);
      await page.goto(link);
      await noOverflow();
    }
    // A valid mobile run opens Results; configuration remains reachable.
    await page.goto(origin);
    await page.locator('#target-url').fill(origin + '/fixture');
    await page.locator('#total-requests').fill('1');
    await page.locator('#btn-start').click();
    assert(await page.locator('#results-workspace').isVisible());
    await page.locator('button[data-workspace-step="setup"]').click();
    assert(await page.locator('#setup-workspace').isVisible());
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(origin);
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await capture('pulse-dark');
    assert.deepEqual(errors, []);
    console.log('Passed: real-browser run, report copy/open, old links, invalid reports, keyboard tabs, desktop/tablet/mobile layout, dark theme.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
