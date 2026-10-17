# ⚡ API Pulse - Stress Tester & Rate Limit Inspector

A high-performance, developer-centric web dashboard for load-testing APIs, inspecting rate limits, and detecting exact quota breach points.

![API Pulse Preview](preview.png)

---

## 🌟 Key Features

### 1. Flexible Load & Stress Testing
- **Customizable Request Volume**: Send 10, 50, 100, 500, 1,000, 5,000, or any custom number of requests.
- **Worker Concurrency Pool**: Adjustable parallel workers (1 to 50 simultaneous in-flight connections).
- **Throttling / Delay Control**: Introduce micro-delays (0ms to 1000ms) between worker requests.
- **HTTP Methods & Payloads**: Full support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `HEAD`.
- **Dynamic Body Templates**: Inject dynamic variables into payloads: `{{id}}`, `{{timestamp}}`, `{{random}}`.
- **Live Controls**: Start, Pause, Resume, or Stop load runs on-the-fly.

### 2. Deep Rate Limit & Quota Reach Inspection
- **Automatic Header Detection**: Detects standard and provider rate-limiting headers:
  - `X-RateLimit-Limit` / `RateLimit-Limit`
  - `X-RateLimit-Remaining` / `RateLimit-Remaining`
  - `X-RateLimit-Reset` / `RateLimit-Reset`
  - `Retry-After`
- **Quota Gauge**: Real-time remaining quota vs total allowance.
- **Reset Countdown**: Dynamic real-time timer counting down to window reset.
- **First Breach Detector**: Pinpoints the exact request number (e.g. `Reached limit at Request #51`) and timestamp where HTTP 429 occurred.
- **Safe Sustainable RPS**: Calculates the maximum sustainable requests-per-second to prevent hitting 429.
- **Auto-Stop on 429**: Optional safety switch to immediately pause testing when rate limits are exhausted.

### 3. Real-Time Performance Analytics
- **Live Progress & ETA**: Percent completion, in-flight workers, elapsed time, and dynamic ETA calculation.
- **Throughput (RPS)**: Real-time requests-per-second monitoring.
- **Latency Percentiles**: Min, Max, Average, p50 (median), p95, and p99 response times.
- **Interactive Visualizations**:
  - Latency vs Quota timeline chart (Chart.js)
  - HTTP Status code distribution doughnut chart (2xx, 429, 4xx, 5xx, Network Errors)

### 4. Dual Execution Engine (Proxy vs Direct)
- **🚀 Proxy Mode (Recommended)**: Powered by the built-in zero-dependency Node.js server. Bypasses browser CORS restrictions and captures all hidden rate limit headers without browser interception.
- **🌐 Direct Browser Mode**: Pure client-side `fetch()` execution directly from the browser for public APIs with open CORS.

### 5. Built-in Mock Rate-Limited API
- Includes a built-in mock endpoint (`/api/mock-api?limit=50&window=60`) that accurately simulates rate limits and returns 429 when quota is reached, perfect for testing without having an external rate-limited target.

### 6. Export & Logging
- Searchable, filterable log table with expandable modal for headers and response bodies.
- 1-click **Export to CSV** and **Export to JSON**.

---

## ☁️ Deploying to Vercel

The project is pre-configured with `vercel.json` and Serverless functions inside `/api/` (`proxy.js` and `mock-api.js`).

### Option A: Deploy via GitHub (Easiest)
1. Push this folder to a new GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository and click **Deploy** (no build settings or environment variables needed!).
4. Your load tester is live at `https://<your-project>.vercel.app`!

### Option B: Deploy via Vercel CLI
Run in this directory:
```bash
npx vercel
```
Follow the interactive prompts to deploy directly in seconds.

---

## 🚀 Running Locally

### Method 1: Start the Local Server (Zero Dependencies!)
Run:
```powershell
node server.js
```
Or double-click `start.bat`. Open your browser at `http://localhost:3000`.

### Method 2: Standalone Browser Mode
Directly open `index.html` in your web browser. In Direct Mode, requests are executed via browser `fetch()`.

---

## 🎯 Quick Presets
- **Mock Rate-Limit API**: Tests 100 requests against the built-in 50 req/min endpoint with auto-stop on 429.
- **JSONPlaceholder (100 GET)**: Quick latency and throughput benchmarking.
- **1000 High-Throughput Burst**: Concurrency test sending 1,000 rapid GET requests.
- **POST Payload Echo**: Tests JSON payload injection with dynamic variables.
