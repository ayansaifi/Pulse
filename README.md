# ⚡ API Pulse - Client-Side Stress Tester & Rate Limit Inspector

A high-performance, developer-centric web application for testing API load, concurrency, and rate limits directly from your browser.

**Zero Backend Server Required** &bull; **Zero Dependencies** &bull; **Instant Vercel / GitHub Pages Deployment**

---

## 🌟 Features
- **Custom Request Volume**: Send 10, 50, 100, 500, 1,000, 5,000, or any custom number of requests.
- **Worker Concurrency Pool**: Adjustable parallel workers (1 to 50 simultaneous browser connections).
- **Throttling Control**: Micro-delays (0ms to 1000ms) between requests.
- **Rate Limit & Quota Inspector**:
  - Automatically captures `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
  - Quota depletion gauge and reset countdown.
  - Pinpoints the exact request number (e.g. `Reached limit at Request #51`) where HTTP 429 was hit.
  - Optional **Auto-stop on 429**.
- **Real-Time Analytics & Charts**:
  - Live throughput (RPS).
  - Latency percentiles: min, avg, max, p50 (median), p95, p99.
  - Interactive Chart.js charts: Latency scatter plot and status distribution donut.
- **Payload & Variable Templating**: `{{id}}`, `{{timestamp}}`, `{{random}}` variables in JSON bodies.
- **CORS Proxy Toggle**: Optional toggle to route through a public CORS proxy when testing third-party APIs that do not enable cross-origin headers.
- **1-Click Export**: Export full session to CSV or JSON.

---

## ☁️ Deploy to Vercel (Instant - Zero Errors)

This is a pure static web app (`index.html`, `style.css`, `app.js`). 

1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your repository: **`ayansaifi/api-tester`**.
3. Leave all settings at default (**Framework: Other**, No build command).
4. Click **Deploy**.

It deploys in ~5 seconds with zero build errors!

---

## 💻 Run Locally

Simply double-click `index.html` to open it in any web browser! No Node.js server or installation needed.
