# Pulse

A browser-based tool for exploring API response times, status codes, and exposed rate-limit headers. It runs requests from the user's browser; it is not a distributed load-testing service.

## Free plan

- Up to 1,000 requests per test
- Up to 10 concurrent workers
- Manual browser runs and current-session results
- CSV and JSON exports
- No account or stored data

Pro is coming soon with saved history, scheduled checks, alerts, team workspaces, and controlled cloud runs.

## Run locally or on Cloudflare Pages

Serve this directory over HTTP or HTTPS and open `index.html`. All application assets are self-hosted. Cloudflare Pages applies the headers in `_headers`.

## How it works

Configure an endpoint, request count, concurrency, delay, headers and optional body, then start a run. A request times out after 30 seconds. Stop cancels in-flight requests and waits for workers to finish. The 429 option halts further dispatches and cancels outstanding requests. Current and peak throughput count completions in a rolling one-second window; average throughput uses the run duration. Latency measures time to response headers, not full-body download time.

Only test endpoints you are authorized to test. Browser connection limits, CORS, preflight requests, network conditions and the user's device affect results. Pulse does not route requests through a proxy. If the target blocks browser requests through CORS, configure CORS on that target or use a future Pro cloud-run test. Browsers can only expose rate-limit headers permitted by the target's CORS policy. Missing headers do not mean a limit does not exist. Results should not be used as a substitute for a controlled, server-side load test.

## Sensitive data

Do not put secrets in URLs. Exported results can contain endpoint URLs, response headers and response snippets; handle them as sensitive data.

Rate-limit reset values are interpreted heuristically and may vary by API.

## Verify

Run `node tests/run.js` for focused checks of Free-plan limits and cancellation. This does not replace browser compatibility, accessibility, security, or real-network testing.
