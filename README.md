# API Pulse

A browser-based tool for exploring API response times, status codes and exposed rate-limit headers. It runs requests from the user's browser; it is not a distributed load-testing service.

## Run locally

Serve this directory over HTTP or HTTPS and open `index.html`. Chart.js and the optional PDF library are loaded from external CDNs, so an internet connection is required. Clipboard sharing requires a secure context (HTTPS or localhost).

## How it works

Configure an endpoint, request count, concurrency, delay, headers and optional body, then start a run. A request times out after 30 seconds. Stop cancels in-flight requests and waits for workers to finish. The 429 option halts further dispatches and cancels outstanding requests. Current and peak throughput count completions in a rolling one-second window; average throughput uses the run duration. Latency measures time to response headers, not full-body download time.

Only test endpoints you are authorized to test. Browser connection limits, CORS, preflight requests, network conditions and the user's device affect results. Browsers can only expose rate-limit headers permitted by the target's CORS policy. Missing headers do not mean a limit does not exist. Results should not be used as a substitute for a controlled, server-side load test.

## Sensitive data

Share links include only method, volume, concurrency and delay. They do not include the endpoint, headers or body. Do not put secrets in URLs. Enabling the optional third-party CORS proxy sends the request and its data to that service; use it only if you trust that service with the data. Exported results can contain endpoint URLs, response headers and response snippets; handle them as sensitive data.

The PDF's grade uses fixed illustrative thresholds; it is not an agreed SLA or a certification. Rate-limit reset values are interpreted heuristically and may vary by API.

## Verify

Run `node tests/run.js` for focused checks of sharing, validation and cancellation. This does not replace browser compatibility, accessibility, security or real-network testing.
