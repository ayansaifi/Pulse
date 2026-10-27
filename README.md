# Pulse

A browser-based tool for exploring API response times, status codes, and exposed rate-limit headers. It runs requests from the user's browser; it is not a distributed load-testing service.

## Free plan

- Up to 1,000 requests per test
- Up to 10 concurrent workers
- Manual browser runs and current-session results
- CSV and JSON exports
- No account or stored data

Pro is coming soon with saved history, scheduled checks, alerts, team workspaces, and controlled cloud runs.

## Rate-limit analyzer

The guided setup selects 100 GET requests, one worker, a 100 ms delay, and stop on the first observed HTTP 429. After any run, the analyzer summarizes 429 responses, exposed rate-limit and Retry-After headers, network failures, and observed throughput before the first 429. A single browser run does not establish a guaranteed safe rate. The public guide is at `rate-limit-tester.html`.

The analyzer's separate JSON report and share link include aggregate numbers only; they exclude endpoint URLs, request and response headers, credentials, and response bodies. Share links open `report.html`, which reads the report from the URL fragment without storing it on a server or making test requests. Previously copied homepage report links redirect to the dedicated view. Invalid or incomplete links show an explanation. The original CSV and JSON exports remain detailed and can contain sensitive endpoint data.

## Workspace

The setup panel and tabbed results sit side by side on desktop. Smaller screens offer Configure and Results steps; starting a valid run opens Results. Advanced request settings and plan information can be expanded as needed. `workspace.css` reuses the site's green light/dark theme, and `workspace.js` manages navigation and chart empty states.

## Run locally or on Cloudflare Pages

Serve this directory over HTTP or HTTPS and open `index.html`. All application assets are self-hosted. Cloudflare Pages applies the headers in `_headers`.

The static `404.html` supplies a real not-found page on hosts that support it. The Cloudflare Pages `_headers` rule applies the existing security policy across the site; static styles live in `style.css` so the policy can keep inline styles blocked. Configure a separate `www.apulse.tech` DNS record and redirect to the apex domain in Cloudflare if `www` should work.

## How it works

The homepage, API load-testing guide, and rate-limit guide are public search landing pages with canonical URLs. sitemap.xml lists the site's public HTML pages and robots.txt points crawlers to it. The homepage includes visible product details and truthful WebSite and Organization structured data; guides use article metadata. No fabricated reviews or ratings are added.

Organic and AI-assisted search visibility still depends on discovery, indexing, third-party references, and each search provider's systems. After publishing, verify the domain in Google Search Console and Bing Webmaster Tools, submit /sitemap.xml, and request indexing for the public landing pages.

Configure an endpoint, request count, concurrency, delay, headers and optional body, then start a run. A request times out after 30 seconds. Stop cancels in-flight requests and waits for workers to finish. The 429 option halts further dispatches and cancels outstanding requests. Current and peak throughput count completions in a rolling one-second window; average throughput uses the run duration. Latency measures time to response headers, not full-body download time.

Only test endpoints you are authorized to test. Browser connection limits, CORS, preflight requests, network conditions and the user's device affect results. Pulse does not route requests through a proxy. If the target blocks browser requests through CORS, configure CORS on that target or use a future Pro cloud-run test. Browsers can only expose rate-limit headers permitted by the target's CORS policy. Missing headers do not mean a limit does not exist. Results should not be used as a substitute for a controlled, server-side load test.

## Sensitive data

Do not put secrets in URLs. Exported results can contain endpoint URLs, response headers and response snippets; handle them as sensitive data.

Rate-limit reset values are interpreted heuristically and may vary by API.

## Verify

Run `node tests/run.js` and `node tests/analyzer.js` for focused checks of Free-plan limits, cancellation, analyzer behavior, and aggregate report privacy. This does not replace browser compatibility, accessibility, security, or real-network testing.

With Playwright available, run `node tests/browser.cjs` to exercise a local test run, report sharing, old and invalid links, keyboard tabs, responsive layouts, and dark mode under the site's CSP. Set `PULSE_BROWSER_PATH` to an installed Chromium browser if needed. Optional `PULSE_SCREENSHOT_DIR` saves preview screenshots. The test server binds to localhost and uses a local API fixture.
