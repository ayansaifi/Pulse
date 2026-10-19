# ⚡ API Pulse Pro - Client-Side Load Tester & Rate Limit Inspector

A high-performance, developer-centric web application for testing API load, concurrency, and rate limits directly from your browser.

**Zero Backend Server Required** &bull; **Zero Dependencies** &bull; **Instant Vercel / GitHub Pages Deployment**

👉 **Live Demo**: [https://ayansaifi.github.io/api-tester/](https://ayansaifi.github.io/api-tester/)

---

## 🌟 Production Features
- **Custom Request Volume**: Send 50, 100, 500, 1,000, 5,000, 10,000, or any custom volume.
- **Worker Concurrency Pool**: Adjustable parallel workers (1 to 50 simultaneous browser connections).
- **Throttling & Pacing Control**: Micro-delays (0ms to 1000ms) between requests.
- **📄 Executive PDF Audit Report Generator**:
  - Automatically compiles a multi-page, client-ready SLA benchmark PDF report.
  - Computes SLA Performance Grade (Grade A+, A, B, C, F).
  - Includes executive KPI table, tail-latency percentiles (p50, p90, p95, p99), rate limit breach autopsy, and status breakdown.
- **📥 cURL Import**: Paste any cURL command from your terminal, Postman, or browser DevTools to auto-populate method, endpoint, headers, and body.
- **🔗 Shareable Test Configurations**: 1-click share button serializes your test setup directly into a shareable URL link.
- **Rate Limit & Quota Inspector**:
  - Captures `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
  - Quota depletion gauge and live countdown to reset.
  - Pinpoints the exact request number (e.g. `Reached limit at Request #51`) where HTTP 429 occurred.
  - Optional **Auto-stop on 429**.
- **Real-Time Analytics & Charts**:
  - Live throughput (Instant & Peak RPS).
  - Tail latency percentiles: min, avg, max, p50 (median), p90, p95, p99.
  - Interactive Chart.js charts: Latency scatter plot and status distribution donut.
- **Payload & Variable Templating**: `{{id}}`, `{{timestamp}}`, `{{random}}`, `{{uuid}}` variables in JSON bodies with 1-click JSON Beautifier.
- **CORS Proxy Toggle**: Optional toggle to route through a public CORS proxy when testing third-party APIs that do not enable cross-origin headers.
- **1-Click Export**: Export full session to CSV, JSON, or Executive PDF.

---

## 💻 Run Locally

Simply double-click `index.html` to open it in any web browser! No Node.js server or installation needed.
