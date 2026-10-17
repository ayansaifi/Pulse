/**
 * API Pulse - Pure Client-Side Stress Tester & Rate Limit Inspector
 * 100% Browser Executed - Zero Background Server Required
 */

// Application State
const state = {
  isRunning: false,
  isPaused: false,
  isStopped: false,
  
  // Test Config
  totalRequests: 100,
  concurrency: 5,
  delayMs: 0,
  stopOn429: true,
  useCorsProxy: false,
  
  // Tracking
  requestIndex: 0,
  completedCount: 0,
  activeWorkers: 0,
  startTime: null,
  elapsedInterval: null,
  results: [],
  
  // Rate Limit Stats
  rateLimit: {
    detected: false,
    limit: null,
    remaining: null,
    resetTime: null,
    resetCountdown: null,
    firstBreachIndex: null,
    firstBreachTime: null,
    sustainableRps: null
  },
  
  // UI filter
  filter: 'all',
  
  // Countdown Timer
  resetTimerInterval: null
};

// Charts instances
let latencyChart = null;
let statusChart = null;

// DOM Elements Cache
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  corsProxyToggle: document.getElementById('cors-proxy'),
  
  httpMethod: document.getElementById('http-method'),
  targetUrl: document.getElementById('target-url'),
  totalRequestsInput: document.getElementById('total-requests'),
  requestCountDisplay: document.getElementById('request-count-display'),
  concurrencySlider: document.getElementById('concurrency-slider'),
  concurrencyVal: document.getElementById('concurrency-val'),
  delaySlider: document.getElementById('delay-slider'),
  delayVal: document.getElementById('delay-val'),
  stopOn429: document.getElementById('stop-on-429'),
  
  headersList: document.getElementById('headers-list'),
  btnAddHeader: document.getElementById('btn-add-header'),
  headerCount: document.getElementById('header-count'),
  requestBody: document.getElementById('request-body'),
  
  btnStart: document.getElementById('btn-start'),
  btnPause: document.getElementById('btn-pause'),
  btnStop: document.getElementById('btn-stop'),
  btnClear: document.getElementById('btn-clear'),
  
  statusBadge: document.getElementById('status-badge'),
  progressPercent: document.getElementById('progress-percent'),
  progressFill: document.getElementById('progress-fill'),
  statCompleted: document.getElementById('stat-completed'),
  statTotal: document.getElementById('stat-total'),
  statActiveWorkers: document.getElementById('stat-active-workers'),
  statElapsed: document.getElementById('stat-elapsed'),
  statEta: document.getElementById('stat-eta'),
  
  // Rate Limit Elements
  rateLimitCard: document.getElementById('rate-limit-card'),
  rateLimitBadge: document.getElementById('rate-limit-badge'),
  rlLimit: document.getElementById('rl-limit'),
  rlRemaining: document.getElementById('rl-remaining'),
  rlReset: document.getElementById('rl-reset'),
  rlBreachReq: document.getElementById('rl-breach-req'),
  rlSustainableRps: document.getElementById('rl-sustainable-rps'),
  rateLimitBanner: document.getElementById('rate-limit-banner'),
  rateLimitMsg: document.getElementById('rate-limit-msg'),
  
  // Metrics
  mSuccessRate: document.getElementById('m-success-rate'),
  m2xx: document.getElementById('m-2xx'),
  m429: document.getElementById('m-429'),
  m429Pct: document.getElementById('m-429-pct'),
  mErrors: document.getElementById('m-errors'),
  m4xx: document.getElementById('m-4xx'),
  m5xx: document.getElementById('m-5xx'),
  mRps: document.getElementById('m-rps'),
  mLatencyAvg: document.getElementById('m-latency-avg'),
  mLatencyMin: document.getElementById('m-latency-min'),
  mLatencyMax: document.getElementById('m-latency-max'),
  mLatencyP95: document.getElementById('m-latency-p95'),
  
  // Table & Logs
  logsTbody: document.getElementById('logs-tbody'),
  logCount: document.getElementById('log-count'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportJson: document.getElementById('btn-export-json'),
  
  // Modal
  detailModal: document.getElementById('detail-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  modalMethodUrl: document.getElementById('modal-method-url'),
  modalStatusBadge: document.getElementById('modal-status-badge'),
  modalDuration: document.getElementById('modal-duration'),
  modalRatelimitHeaders: document.getElementById('modal-ratelimit-headers'),
  modalResponseBody: document.getElementById('modal-response-body'),
  modalAllHeaders: document.getElementById('modal-all-headers'),
  btnCopyResponse: document.getElementById('btn-copy-response')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCharts();
  bindEvents();
});

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('api-tester-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  DOM.themeToggle.textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
}

DOM.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('api-tester-theme', next);
  DOM.themeToggle.textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
  
  if (latencyChart && statusChart) {
    const isDark = next === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    latencyChart.options.scales.x.grid.color = gridColor;
    latencyChart.options.scales.y.grid.color = gridColor;
    latencyChart.options.scales.x.ticks.color = textColor;
    latencyChart.options.scales.y.ticks.color = textColor;
    latencyChart.update();
  }
});

// Chart.js Visualizations
function initCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  // Latency & Quota Chart
  const ctxLatency = document.getElementById('latencyChart').getContext('2d');
  latencyChart = new Chart(ctxLatency, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Latency (ms)',
          data: [],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          pointBackgroundColor: [],
          pointRadius: 3,
          borderWidth: 2,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Rate-Limit Remaining',
          data: [],
          borderColor: '#f59e0b',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1.5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: textColor, boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, maxTicksLimit: 10 }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Latency (ms)', color: textColor, font: { size: 10 } },
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y1: {
          type: 'linear',
          display: false,
          position: 'right',
          title: { display: true, text: 'Quota Remaining', color: '#f59e0b', font: { size: 10 } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#f59e0b' }
        }
      }
    }
  });

  // Status Distribution Chart
  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  statusChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['2xx OK', '429 Rate Limit', '4xx Client', '5xx Server', 'Failed'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#10b981', // 2xx
          '#f59e0b', // 429
          '#f97316', // 4xx
          '#ef4444', // 5xx
          '#64748b'  // err
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, boxWidth: 10, font: { size: 10 } }
        }
      },
      cutout: '65%'
    }
  });
}

// Bind Event Listeners
function bindEvents() {
  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyPreset(chip.getAttribute('data-preset'));
    });
  });

  // Number quick chips
  document.querySelectorAll('.num-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.num-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = parseInt(chip.getAttribute('data-val'), 10);
      DOM.totalRequestsInput.value = val;
      DOM.requestCountDisplay.textContent = val.toLocaleString();
      DOM.statTotal.textContent = val.toLocaleString();
    });
  });

  DOM.totalRequestsInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    DOM.requestCountDisplay.textContent = val.toLocaleString();
    DOM.statTotal.textContent = val.toLocaleString();
  });

  // Concurrency slider
  DOM.concurrencySlider.addEventListener('input', (e) => {
    DOM.concurrencyVal.textContent = e.target.value;
  });

  // Delay slider
  DOM.delaySlider.addEventListener('input', (e) => {
    DOM.delayVal.textContent = `${e.target.value}ms`;
  });

  // CORS Proxy toggle
  DOM.corsProxyToggle.addEventListener('change', (e) => {
    state.useCorsProxy = e.target.checked;
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  // Add Header
  DOM.btnAddHeader.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="text-input header-key" placeholder="Key">
      <input type="text" class="text-input header-val" placeholder="Value">
      <button type="button" class="btn-remove">&times;</button>
    `;
    DOM.headersList.appendChild(row);
    updateHeaderCount();
  });

  DOM.headersList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      e.target.closest('.header-row').remove();
      updateHeaderCount();
    }
  });

  // Controls
  DOM.btnStart.addEventListener('click', startTest);
  DOM.btnPause.addEventListener('click', togglePause);
  DOM.btnStop.addEventListener('click', stopTest);
  DOM.btnClear.addEventListener('click', clearAll);

  // Table Filters
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.getAttribute('data-filter');
      renderLogsTable();
    });
  });

  // Export Buttons
  DOM.btnExportCsv.addEventListener('click', exportCsv);
  DOM.btnExportJson.addEventListener('click', exportJson);

  // Modal
  DOM.btnCloseModal.addEventListener('click', () => {
    DOM.detailModal.classList.remove('active');
  });

  DOM.detailModal.addEventListener('click', (e) => {
    if (e.target === DOM.detailModal) DOM.detailModal.classList.remove('active');
  });

  DOM.btnCopyResponse.addEventListener('click', () => {
    navigator.clipboard.writeText(DOM.modalResponseBody.textContent);
    DOM.btnCopyResponse.textContent = 'Copied!';
    setTimeout(() => DOM.btnCopyResponse.textContent = 'Copy', 1500);
  });
}

function updateHeaderCount() {
  const count = DOM.headersList.querySelectorAll('.header-row').length;
  DOM.headerCount.textContent = count;
}

// Preset configurations (all open public CORS endpoints)
function applyPreset(name) {
  if (name === 'json-get-100') {
    DOM.httpMethod.value = 'GET';
    DOM.targetUrl.value = 'https://jsonplaceholder.typicode.com/posts/1';
    DOM.totalRequestsInput.value = 100;
    DOM.requestCountDisplay.textContent = '100';
    DOM.statTotal.textContent = '100';
    DOM.concurrencySlider.value = 10;
    DOM.concurrencyVal.textContent = '10';
    DOM.delaySlider.value = 0;
    DOM.delayVal.textContent = '0ms';
  } else if (name === 'rate-limit-demo') {
    DOM.httpMethod.value = 'GET';
    DOM.targetUrl.value = 'https://httpbin.org/status/429';
    DOM.totalRequestsInput.value = 10;
    DOM.requestCountDisplay.textContent = '10';
    DOM.statTotal.textContent = '10';
    DOM.concurrencySlider.value = 2;
    DOM.concurrencyVal.textContent = '2';
    DOM.delaySlider.value = 100;
    DOM.delayVal.textContent = '100ms';
    DOM.stopOn429.checked = true;
  } else if (name === 'heavy-1000') {
    DOM.httpMethod.value = 'GET';
    DOM.targetUrl.value = 'https://jsonplaceholder.typicode.com/posts/1';
    DOM.totalRequestsInput.value = 1000;
    DOM.requestCountDisplay.textContent = '1,000';
    DOM.statTotal.textContent = '1,000';
    DOM.concurrencySlider.value = 25;
    DOM.concurrencyVal.textContent = '25';
    DOM.delaySlider.value = 0;
    DOM.delayVal.textContent = '0ms';
    DOM.stopOn429.checked = false;
  } else if (name === 'post-echo') {
    DOM.httpMethod.value = 'POST';
    DOM.targetUrl.value = 'https://jsonplaceholder.typicode.com/posts';
    DOM.totalRequestsInput.value = 50;
    DOM.requestCountDisplay.textContent = '50';
    DOM.statTotal.textContent = '50';
    DOM.concurrencySlider.value = 5;
    DOM.concurrencyVal.textContent = '5';
    DOM.requestBody.value = JSON.stringify({
      title: 'Load Test Item {{id}}',
      timestamp: '{{timestamp}}',
      randomToken: '{{random}}'
    }, null, 2);
  }
}

// Start Load Test
async function startTest() {
  const rawUrl = DOM.targetUrl.value.trim();
  if (!rawUrl) {
    alert('Please enter a valid target URL');
    return;
  }

  // Reset state
  state.isRunning = true;
  state.isPaused = false;
  state.isStopped = false;
  state.totalRequests = parseInt(DOM.totalRequestsInput.value, 10) || 100;
  state.concurrency = parseInt(DOM.concurrencySlider.value, 10) || 5;
  state.delayMs = parseInt(DOM.delaySlider.value, 10) || 0;
  state.stopOn429 = DOM.stopOn429.checked;
  state.useCorsProxy = DOM.corsProxyToggle.checked;
  
  state.requestIndex = 0;
  state.completedCount = 0;
  state.activeWorkers = 0;
  state.results = [];
  state.startTime = Date.now();

  // Reset Rate Limit State
  state.rateLimit = {
    detected: false,
    limit: null,
    remaining: null,
    resetTime: null,
    resetCountdown: null,
    firstBreachIndex: null,
    firstBreachTime: null,
    sustainableRps: null
  };

  if (state.resetTimerInterval) clearInterval(state.resetTimerInterval);

  // Update UI Controls
  DOM.btnStart.disabled = true;
  DOM.btnPause.disabled = false;
  DOM.btnPause.textContent = '⏸ Pause';
  DOM.btnStop.disabled = false;
  DOM.statusBadge.textContent = 'Running';
  DOM.statusBadge.style.color = 'var(--accent-primary)';
  DOM.statTotal.textContent = state.totalRequests.toLocaleString();
  
  DOM.rateLimitCard.classList.remove('reached');
  DOM.rateLimitBadge.textContent = 'Inspecting Headers...';
  DOM.rateLimitBadge.className = 'badge';
  DOM.rateLimitBanner.style.display = 'none';
  DOM.rlLimit.textContent = '--';
  DOM.rlRemaining.textContent = '--';
  DOM.rlReset.textContent = '--';
  DOM.rlBreachReq.textContent = '--';
  DOM.rlSustainableRps.textContent = '--';

  resetCharts();
  renderLogsTable();

  if (state.elapsedInterval) clearInterval(state.elapsedInterval);
  state.elapsedInterval = setInterval(updateElapsedAndEta, 200);

  const customHeaders = getHeadersFromUI();
  const rawBody = DOM.requestBody.value;
  const method = DOM.httpMethod.value;

  // Launch Concurrency Worker Pool
  const workers = [];
  const activeConcurrency = Math.min(state.concurrency, state.totalRequests);
  for (let i = 0; i < activeConcurrency; i++) {
    workers.push(runWorker(i + 1, rawUrl, method, customHeaders, rawBody));
  }

  await Promise.all(workers);
  finishTest();
}

// Individual Worker in the Concurrency Pool
async function runWorker(workerId, url, method, headers, bodyTemplate) {
  state.activeWorkers++;
  updateProgressUI();

  while (state.requestIndex < state.totalRequests && !state.isStopped) {
    while (state.isPaused && !state.isStopped) {
      await sleep(100);
    }
    if (state.isStopped) break;

    const reqNum = ++state.requestIndex;
    if (reqNum > state.totalRequests) break;

    // Render variables
    let processedBody = null;
    if (bodyTemplate && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      processedBody = bodyTemplate
        .replace(/{{id}}/g, reqNum)
        .replace(/{{timestamp}}/g, new Date().toISOString())
        .replace(/{{random}}/g, Math.random().toString(36).substring(2, 9));
    }

    // Execute Request 100% in Browser
    const result = await executeSingleRequest(reqNum, url, method, headers, processedBody);
    state.results.push(result);
    state.completedCount++;

    inspectRateLimit(result);
    updateMetricsUI();
    addChartDataPoint(result);

    // Stop on 429
    if (result.status === 429 && state.stopOn429) {
      triggerRateLimitStop(reqNum);
      break;
    }

    if (state.delayMs > 0 && !state.isStopped) {
      await sleep(state.delayMs);
    }
  }

  state.activeWorkers--;
  updateProgressUI();
}

// Pure Client-side Browser Fetch
async function executeSingleRequest(id, url, method, headers, body) {
  const reqStart = performance.now();
  
  // Optional public CORS bypass if target blocks CORS
  let targetUrl = url;
  if (state.useCorsProxy) {
    targetUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  }

  try {
    const fetchOpts = {
      method: method,
      headers: headers
    };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOpts.body = body;
    }

    const response = await fetch(targetUrl, fetchOpts);
    const duration = Math.round(performance.now() - reqStart);
    
    // Extract available headers
    const resHeaders = {};
    const rateLimitHeaders = {};
    response.headers.forEach((v, k) => {
      const lower = k.toLowerCase();
      resHeaders[lower] = v;
      if (lower.includes('ratelimit') || lower === 'retry-after') {
        rateLimitHeaders[lower] = v;
      }
    });

    let textSnippet = '';
    try {
      textSnippet = (await response.text()).slice(0, 3000);
    } catch (e) {
      textSnippet = '(Body snippet not readable)';
    }

    return {
      id: id,
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      status: response.status,
      statusText: response.statusText,
      duration: duration,
      headers: resHeaders,
      rateLimitHeaders: rateLimitHeaders,
      bodySnippet: textSnippet,
      isError: false
    };
  } catch (err) {
    const duration = Math.round(performance.now() - reqStart);
    const isCors = err.message && err.message.toLowerCase().includes('failed to fetch');
    return {
      id: id,
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      status: 0,
      statusText: isCors ? 'CORS / Network Error' : (err.message || 'Error'),
      duration: duration,
      headers: {},
      rateLimitHeaders: {},
      bodySnippet: isCors ? 'Request blocked by browser CORS policy. Toggle "CORS Proxy" in settings to bypass.' : err.message,
      isError: true
    };
  }
}

// Rate Limit & Header Inspection
function inspectRateLimit(result) {
  const rl = result.rateLimitHeaders || {};
  
  const limitVal = rl['x-ratelimit-limit'] || rl['ratelimit-limit'] || rl['x-rate-limit-limit'];
  const remainingVal = rl['x-ratelimit-remaining'] || rl['ratelimit-remaining'] || rl['x-rate-limit-remaining'];
  const resetVal = rl['x-ratelimit-reset'] || rl['ratelimit-reset'] || rl['x-rate-limit-reset'];
  const retryAfter = rl['retry-after'];

  if (limitVal !== undefined || remainingVal !== undefined || resetVal !== undefined || retryAfter !== undefined) {
    state.rateLimit.detected = true;
    latencyChart.options.scales.y1.display = true;

    if (limitVal !== undefined) {
      state.rateLimit.limit = parseInt(limitVal, 10);
      DOM.rlLimit.textContent = state.rateLimit.limit.toLocaleString();
    }

    if (remainingVal !== undefined) {
      state.rateLimit.remaining = parseInt(remainingVal, 10);
      DOM.rlRemaining.textContent = state.rateLimit.remaining.toLocaleString();
      
      if (state.rateLimit.limit) {
        const ratio = state.rateLimit.remaining / state.rateLimit.limit;
        if (ratio <= 0.1) DOM.rlRemaining.style.color = 'var(--danger)';
        else if (ratio <= 0.35) DOM.rlRemaining.style.color = 'var(--warning)';
        else DOM.rlRemaining.style.color = 'var(--success)';
      }
    }

    if (resetVal !== undefined || retryAfter !== undefined) {
      let secondsLeft = 0;
      if (retryAfter !== undefined) {
        secondsLeft = parseInt(retryAfter, 10) || 0;
      } else if (resetVal !== undefined) {
        const resetNum = parseInt(resetVal, 10);
        secondsLeft = resetNum > 1000000000 ? Math.max(0, Math.ceil(resetNum - (Date.now() / 1000))) : resetNum;
      }

      state.rateLimit.resetCountdown = secondsLeft;
      DOM.rlReset.textContent = `${secondsLeft}s`;
      startResetCountdown(secondsLeft);

      if (state.rateLimit.limit && secondsLeft > 0) {
        const safeRps = (state.rateLimit.limit / Math.max(1, secondsLeft)).toFixed(2);
        DOM.rlSustainableRps.textContent = `${safeRps}/s`;
      }
    }

    DOM.rateLimitBadge.textContent = 'Rate Limit Headers Detected';
    DOM.rateLimitBadge.className = 'badge badge-2xx';
  }

  // Detect Limit Reach / Breach (HTTP 429 or Remaining == 0)
  if ((result.status === 429 || state.rateLimit.remaining === 0) && !state.rateLimit.firstBreachIndex) {
    state.rateLimit.firstBreachIndex = result.id;
    state.rateLimit.firstBreachTime = new Date().toLocaleTimeString();
    
    DOM.rateLimitCard.classList.add('reached');
    DOM.rlBreachReq.textContent = `#${result.id}`;
    DOM.rateLimitBadge.textContent = 'LIMIT REACHED!';
    DOM.rateLimitBadge.className = 'badge badge-429';

    DOM.rateLimitBanner.style.display = 'flex';
    DOM.rateLimitBanner.className = 'alert-banner alert-danger';
    DOM.rateLimitMsg.innerHTML = `<strong>Rate Limit Hit!</strong> First reached at Request <strong>#${result.id}</strong> (${state.rateLimit.firstBreachTime}). Quota exhausted.`;
  }
}

// Reset Countdown
function startResetCountdown(initialSeconds) {
  if (state.resetTimerInterval) clearInterval(state.resetTimerInterval);
  let remaining = initialSeconds;

  state.resetTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(state.resetTimerInterval);
      DOM.rlReset.textContent = '0s (Reset)';
      DOM.rateLimitBadge.textContent = 'Quota Refreshed';
      DOM.rateLimitBadge.className = 'badge badge-2xx';
    } else {
      DOM.rlReset.textContent = `${remaining}s`;
    }
  }, 1000);
}

// Stop execution automatically when 429 reached
function triggerRateLimitStop(reqNum) {
  state.isStopped = true;
  DOM.statusBadge.textContent = 'Stopped (Limit Reached)';
  DOM.statusBadge.style.color = 'var(--warning)';
  DOM.rateLimitBanner.style.display = 'flex';
  DOM.rateLimitBanner.className = 'alert-banner alert-warning';
  DOM.rateLimitMsg.innerHTML = `🛡️ <strong>Auto-Stop Triggered:</strong> Execution paused automatically upon hitting HTTP 429 at Request <strong>#${reqNum}</strong>.`;
}

// Update Elapsed & ETA
function updateElapsedAndEta() {
  if (!state.startTime) return;
  const elapsedSec = (Date.now() - state.startTime) / 1000;
  DOM.statElapsed.textContent = `${elapsedSec.toFixed(1)}s`;

  if (state.completedCount > 0 && state.isRunning) {
    const rate = state.completedCount / elapsedSec;
    const remainingReqs = state.totalRequests - state.completedCount;
    if (rate > 0 && remainingReqs > 0) {
      const etaSec = remainingReqs / rate;
      DOM.statEta.textContent = etaSec < 60 ? `${Math.ceil(etaSec)}s` : `${Math.floor(etaSec / 60)}m ${Math.ceil(etaSec % 60)}s`;
    } else {
      DOM.statEta.textContent = '0s';
    }
  }
}

// Progress and Stats UI
function updateProgressUI() {
  const pct = Math.min(100, Math.round((state.completedCount / state.totalRequests) * 100));
  DOM.progressFill.style.width = `${pct}%`;
  DOM.progressPercent.textContent = `${pct}%`;
  DOM.statCompleted.textContent = state.completedCount.toLocaleString();
  DOM.statActiveWorkers.textContent = state.activeWorkers;
}

// Real-time Metrics Calculation
function updateMetricsUI() {
  updateProgressUI();

  const total = state.results.length;
  if (total === 0) return;

  let count2xx = 0;
  let count429 = 0;
  let count4xx = 0;
  let count5xx = 0;
  let countFail = 0;
  let latencySum = 0;
  let latencies = [];

  for (let i = 0; i < total; i++) {
    const r = state.results[i];
    latencies.push(r.duration);
    latencySum += r.duration;

    if (r.status >= 200 && r.status < 300) count2xx++;
    else if (r.status === 429) count429++;
    else if (r.status >= 400 && r.status < 500) count4xx++;
    else if (r.status >= 500 && r.status < 600) count5xx++;
    else countFail++;
  }

  const successPct = Math.round((count2xx / total) * 100);
  DOM.mSuccessRate.textContent = `${successPct}%`;
  DOM.m2xx.textContent = count2xx.toLocaleString();

  DOM.m429.textContent = count429.toLocaleString();
  const rateLimitPct = ((count429 / total) * 100).toFixed(1);
  DOM.m429Pct.textContent = `${rateLimitPct}% of total`;

  DOM.mErrors.textContent = (count4xx + count5xx + countFail).toLocaleString();
  DOM.m4xx.textContent = count4xx.toLocaleString();
  DOM.m5xx.textContent = (count5xx + countFail).toLocaleString();

  const elapsedSec = Math.max(0.1, (Date.now() - state.startTime) / 1000);
  const rps = (total / elapsedSec).toFixed(1);
  DOM.mRps.textContent = rps;

  latencies.sort((a, b) => a - b);
  const avg = Math.round(latencySum / total);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  DOM.mLatencyAvg.textContent = `${avg}ms`;
  DOM.mLatencyMin.textContent = min;
  DOM.mLatencyMax.textContent = max;
  DOM.mLatencyP95.textContent = `${p50} / ${p95} / ${p99}ms`;

  statusChart.data.datasets[0].data = [count2xx, count429, count4xx, count5xx, countFail];
  statusChart.update('none');
}

// Chart buffer
let chartUpdatePending = false;
function addChartDataPoint(result) {
  if (state.totalRequests > 200 && result.id % Math.ceil(state.totalRequests / 150) !== 0 && result.id !== state.totalRequests && result.status !== 429) {
    return;
  }

  const pointColor = result.status >= 200 && result.status < 300 ? '#10b981' :
                     result.status === 429 ? '#f59e0b' :
                     result.status >= 400 && result.status < 500 ? '#f97316' : '#ef4444';

  latencyChart.data.labels.push(`#${result.id}`);
  latencyChart.data.datasets[0].data.push(result.duration);
  latencyChart.data.datasets[0].pointBackgroundColor.push(pointColor);

  const rem = result.rateLimitHeaders && result.rateLimitHeaders['x-ratelimit-remaining'];
  if (rem !== undefined) {
    latencyChart.data.datasets[1].data.push(parseInt(rem, 10));
  }

  if (!chartUpdatePending) {
    chartUpdatePending = true;
    requestAnimationFrame(() => {
      latencyChart.update('none');
      chartUpdatePending = false;
    });
  }
}

function resetCharts() {
  latencyChart.data.labels = [];
  latencyChart.data.datasets[0].data = [];
  latencyChart.data.datasets[0].pointBackgroundColor = [];
  latencyChart.data.datasets[1].data = [];
  latencyChart.options.scales.y1.display = false;
  latencyChart.update();

  statusChart.data.datasets[0].data = [0, 0, 0, 0, 0];
  statusChart.update();
}

// Pause
function togglePause() {
  state.isPaused = !state.isPaused;
  if (state.isPaused) {
    DOM.btnPause.textContent = '▶ Resume';
    DOM.statusBadge.textContent = 'Paused';
    DOM.statusBadge.style.color = 'var(--warning)';
  } else {
    DOM.btnPause.textContent = '⏸ Pause';
    DOM.statusBadge.textContent = 'Running';
    DOM.statusBadge.style.color = 'var(--accent-primary)';
  }
}

// Stop
function stopTest() {
  state.isStopped = true;
  DOM.statusBadge.textContent = 'Stopped';
  DOM.statusBadge.style.color = 'var(--danger)';
  finishTest();
}

function finishTest() {
  state.isRunning = false;
  if (state.elapsedInterval) clearInterval(state.elapsedInterval);
  
  DOM.btnStart.disabled = false;
  DOM.btnPause.disabled = true;
  DOM.btnStop.disabled = true;
  
  if (!state.isStopped) {
    DOM.statusBadge.textContent = 'Finished';
    DOM.statusBadge.style.color = 'var(--success)';
  }

  updateMetricsUI();
  latencyChart.update();
  renderLogsTable();
}

// Clear
function clearAll() {
  if (state.isRunning) return;
  state.results = [];
  state.requestIndex = 0;
  state.completedCount = 0;
  
  DOM.progressFill.style.width = '0%';
  DOM.progressPercent.textContent = '0%';
  DOM.statCompleted.textContent = '0';
  DOM.statActiveWorkers.textContent = '0';
  DOM.statElapsed.textContent = '0.0s';
  DOM.statEta.textContent = '--';
  DOM.statusBadge.textContent = 'Idle';
  DOM.statusBadge.style.color = 'var(--text-secondary)';

  DOM.rateLimitCard.classList.remove('reached');
  DOM.rateLimitBadge.textContent = 'Awaiting Requests...';
  DOM.rateLimitBadge.className = 'badge';
  DOM.rateLimitBanner.style.display = 'none';
  DOM.rlLimit.textContent = '--';
  DOM.rlRemaining.textContent = '--';
  DOM.rlReset.textContent = '--';
  DOM.rlBreachReq.textContent = '--';
  DOM.rlSustainableRps.textContent = '--';

  DOM.mSuccessRate.textContent = '100%';
  DOM.m2xx.textContent = '0';
  DOM.m429.textContent = '0';
  DOM.m429Pct.textContent = '0% of total';
  DOM.mErrors.textContent = '0';
  DOM.m4xx.textContent = '0';
  DOM.m5xx.textContent = '0';
  DOM.mRps.textContent = '0.0';
  DOM.mLatencyAvg.textContent = '0ms';
  DOM.mLatencyMin.textContent = '0';
  DOM.mLatencyMax.textContent = '0';
  DOM.mLatencyP95.textContent = '-- / -- / --';

  resetCharts();
  renderLogsTable();
}

// Render Request Logs Table
function renderLogsTable() {
  const filtered = state.results.filter(r => {
    if (state.filter === 'all') return true;
    if (state.filter === '2xx') return r.status >= 200 && r.status < 300;
    if (state.filter === '429') return r.status === 429;
    if (state.filter === '4xx') return r.status >= 400 && r.status < 500 && r.status !== 429;
    if (state.filter === '5xx') return r.status >= 500 && r.status < 600;
    if (state.filter === 'failed') return r.status === 0 || r.isError;
    return true;
  });

  DOM.logCount.textContent = filtered.length.toLocaleString();

  if (filtered.length === 0) {
    DOM.logsTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          ${state.results.length === 0 ? 'No requests sent yet.' : 'No requests matching selected filter.'}
        </td>
      </tr>
    `;
    return;
  }

  const displayRows = filtered.slice(-200).reverse();
  let html = '';

  for (let i = 0; i < displayRows.length; i++) {
    const item = displayRows[i];
    let badgeClass = 'badge-2xx';
    if (item.status === 429) badgeClass = 'badge-429';
    else if (item.status >= 400 && item.status < 500) badgeClass = 'badge-4xx';
    else if (item.status >= 500 || item.status === 0) badgeClass = 'badge-5xx';

    const remainingQuota = (item.rateLimitHeaders && item.rateLimitHeaders['x-ratelimit-remaining']) ?? '--';
    const preview = escapeHtml(item.bodySnippet ? item.bodySnippet.substring(0, 70) : '(empty)');

    html += `
      <tr>
        <td>#${item.id}</td>
        <td><strong>${item.method}</strong></td>
        <td><span class="badge ${badgeClass}">${item.status || 'ERR'} ${item.statusText || ''}</span></td>
        <td>${item.duration}ms</td>
        <td>${remainingQuota}</td>
        <td style="color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${preview}
        </td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick="viewDetails(${item.id})">View</button>
        </td>
      </tr>
    `;
  }

  DOM.logsTbody.innerHTML = html;
}

// Modal Detail
window.viewDetails = function(reqId) {
  const item = state.results.find(r => r.id === reqId);
  if (!item) return;

  DOM.modalMethodUrl.textContent = `${item.method} ${item.url}`;
  
  let badgeClass = 'badge-2xx';
  if (item.status === 429) badgeClass = 'badge-429';
  else if (item.status >= 400 && item.status < 500) badgeClass = 'badge-4xx';
  else if (item.status >= 500 || item.status === 0) badgeClass = 'badge-5xx';

  DOM.modalStatusBadge.className = `badge ${badgeClass}`;
  DOM.modalStatusBadge.textContent = `${item.status} ${item.statusText}`;
  DOM.modalDuration.textContent = `${item.duration}ms (${item.timestamp})`;

  const rlKeys = Object.keys(item.rateLimitHeaders || {});
  if (rlKeys.length > 0) {
    DOM.modalRatelimitHeaders.textContent = JSON.stringify(item.rateLimitHeaders, null, 2);
  } else {
    DOM.modalRatelimitHeaders.textContent = 'No rate limit headers found in response.';
  }

  try {
    const parsed = JSON.parse(item.bodySnippet);
    DOM.modalResponseBody.textContent = JSON.stringify(parsed, null, 2);
  } catch (e) {
    DOM.modalResponseBody.textContent = item.bodySnippet || '(empty body)';
  }

  DOM.modalAllHeaders.textContent = JSON.stringify(item.headers, null, 2);
  DOM.detailModal.classList.add('active');
};

function getHeadersFromUI() {
  const headers = {};
  DOM.headersList.querySelectorAll('.header-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const val = row.querySelector('.header-val').value.trim();
    if (key) headers[key] = val;
  });
  return headers;
}

// Export CSV
function exportCsv() {
  if (state.results.length === 0) {
    alert('No results to export yet.');
    return;
  }

  const rows = [
    ['Request_ID', 'Timestamp', 'Method', 'URL', 'Status', 'Status_Text', 'Duration_ms', 'RateLimit_Remaining', 'RateLimit_Limit', 'RateLimit_Reset']
  ];

  state.results.forEach(r => {
    const rl = r.rateLimitHeaders || {};
    rows.push([
      r.id,
      `"${r.timestamp}"`,
      r.method,
      `"${r.url}"`,
      r.status,
      `"${r.statusText || ''}"`,
      r.duration,
      rl['x-ratelimit-remaining'] || '',
      rl['x-ratelimit-limit'] || '',
      rl['x-ratelimit-reset'] || ''
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(',')).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `api_load_test_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export JSON
function exportJson() {
  if (state.results.length === 0) {
    alert('No results to export yet.');
    return;
  }

  const exportData = {
    summary: {
      totalRequests: state.results.length,
      successRate: DOM.mSuccessRate.textContent,
      rateLimited429: DOM.m429.textContent,
      clientErrors: DOM.m4xx.textContent,
      serverErrors: DOM.m5xx.textContent,
      rps: DOM.mRps.textContent,
      avgLatency: DOM.mLatencyAvg.textContent,
      minLatency: DOM.mLatencyMin.textContent,
      maxLatency: DOM.mLatencyMax.textContent,
      percentiles: DOM.mLatencyP95.textContent,
      rateLimitDetected: state.rateLimit.detected,
      rateLimitLimit: state.rateLimit.limit,
      firstBreachRequestId: state.rateLimit.firstBreachIndex
    },
    results: state.results
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `api_load_test_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
