/**
 * Pulse - Browser-Based API Observability & Load Testing Engine
 * Free plan: current-session, browser-based testing
 */

// Application Global State
const state = {
  isRunning: false,
  isPaused: false,
  isStopped: false,
  
  // Test Configuration
  totalRequests: 100,
  concurrency: 5,
  delayMs: 0,
  stopOn429: true,
  
  // Execution Counters & Timing
  requestIndex: 0,
  completedCount: 0,
  activeWorkers: 0,
  startTime: null,
  elapsedInterval: null,
  peakRps: 0,
  endTime: null,
  controller: null,
  rateSamples: [],
  runConfig: null,
  results: [],
  analyzerReport: null,
  
  // Rate Limit Analytics
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
  
  // Filter for Request Table
  filter: 'all',
  
  // Dynamic Timers
  resetTimerInterval: null
};

// Chart instances
let latencyChart = null;
let statusChart = null;

// DOM Cache
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  
  // Config
  httpMethod: document.getElementById('http-method'),
  targetUrl: document.getElementById('target-url'),
  totalRequestsInput: document.getElementById('total-requests'),
  requestCountDisplay: document.getElementById('request-count-display'),
  requestCapacityFill: document.getElementById('request-capacity-fill'),
  concurrencySlider: document.getElementById('concurrency-slider'),
  concurrencyVal: document.getElementById('concurrency-val'),
  delaySlider: document.getElementById('delay-slider'),
  delayVal: document.getElementById('delay-val'),
  stopOn429: document.getElementById('stop-on-429'),
  
  // Headers & Body
  headersList: document.getElementById('headers-list'),
  btnAddHeader: document.getElementById('btn-add-header'),
  headerCount: document.getElementById('header-count'),
  requestBody: document.getElementById('request-body'),
  btnBeautifyJson: document.getElementById('btn-beautify-json'),
  authBearerToken: document.getElementById('auth-bearer-token'),
  btnApplyAuth: document.getElementById('btn-apply-auth'),
  
  // Primary Buttons
  btnStart: document.getElementById('btn-start'),
  btnPause: document.getElementById('btn-pause'),
  btnStop: document.getElementById('btn-stop'),
  btnClear: document.getElementById('btn-clear'),
  
  // Progress Banner
  statusBadge: document.getElementById('status-badge'),
  progressPercent: document.getElementById('progress-percent'),
  progressFill: document.getElementById('progress-fill'),
  statCompleted: document.getElementById('stat-completed'),
  statTotal: document.getElementById('stat-total'),
  statActiveWorkers: document.getElementById('stat-active-workers'),
  statElapsed: document.getElementById('stat-elapsed'),
  statEta: document.getElementById('stat-eta'),
  statInstantRps: document.getElementById('stat-instant-rps'),
  
  // Rate Limit Elements
  rateLimitPanel: document.getElementById('rate-limit-panel'),
  rateLimitBadge: document.getElementById('rate-limit-badge'),
  rlLimit: document.getElementById('rl-limit'),
  rlRemaining: document.getElementById('rl-remaining'),
  rlReset: document.getElementById('rl-reset'),
  rlBreachReq: document.getElementById('rl-breach-req'),
  rlSustainableRps: document.getElementById('rl-sustainable-rps'),
  rateLimitBanner: document.getElementById('rate-limit-banner'),
  rateLimitMsg: document.getElementById('rate-limit-msg'),
  
  // KPI Metrics
  mSuccessRate: document.getElementById('m-success-rate'),
  m2xx: document.getElementById('m-2xx'),
  m429: document.getElementById('m-429'),
  m429Pct: document.getElementById('m-429-pct'),
  mErrors: document.getElementById('m-errors'),
  m4xx: document.getElementById('m-4xx'),
  m5xx: document.getElementById('m-5xx'),
  mRps: document.getElementById('m-rps'),
  mPeakRps: document.getElementById('m-peak-rps'),
  mLatencyAvg: document.getElementById('m-latency-avg'),
  mLatencyMin: document.getElementById('m-latency-min'),
  mLatencyMax: document.getElementById('m-latency-max'),
  mLatencyP95: document.getElementById('m-latency-p95'),
  
  // Table & Action Toolbar
  logsTbody: document.getElementById('logs-tbody'),
  logCount: document.getElementById('log-count'),

  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnGuidedSetup: document.getElementById('btn-guided-setup'),
  btnReportDownload: document.getElementById('btn-report-download'),
  btnReportShare: document.getElementById('btn-report-share'),
  analyzerSummary: document.getElementById('analyzer-summary'),
  analyzerBars: document.getElementById('analyzer-bars'),
  analyzerShareNote: document.getElementById('analyzer-share-note'),

  // Detail Modal
  detailModal: document.getElementById('detail-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  modalMethodUrl: document.getElementById('modal-method-url'),
  modalStatusBadge: document.getElementById('modal-status-badge'),
  modalDuration: document.getElementById('modal-duration'),
  modalRatelimitHeaders: document.getElementById('modal-ratelimit-headers'),
  modalResponseBody: document.getElementById('modal-response-body'),
  modalAllHeaders: document.getElementById('modal-all-headers'),
  btnCopyResponse: document.getElementById('btn-copy-response'),
};

// Bootstrap App
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (typeof Chart === 'undefined') { DOM.statusBadge.textContent = 'Charts unavailable; reload'; DOM.btnStart.disabled = true; return; }
  initCharts();
  bindEvents();
  const sharedReport = PulseAnalyzer.readShareHash(location.hash);
  if (sharedReport) renderAnalyzer(sharedReport, true);
});

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('api-pulse-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  DOM.themeToggle.textContent = saved === 'dark' ? 'Light mode' : 'Dark mode';
}

DOM.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('api-pulse-theme', next);
  DOM.themeToggle.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  
  updateChartsTheme(next === 'dark');
});

function updateChartsTheme(isDark) {
  if (!latencyChart || !statusChart) return;
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  
  latencyChart.options.scales.x.grid.color = gridColor;
  latencyChart.options.scales.y.grid.color = gridColor;
  latencyChart.options.scales.x.ticks.color = textColor;
  latencyChart.options.scales.y.ticks.color = textColor;
  latencyChart.update();
}

// Chart.js Setup
function initCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  // Latency & Quota Depletion Timeline
  const ctxLatency = document.getElementById('latencyChart').getContext('2d');
  latencyChart = new Chart(ctxLatency, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Latency (ms)',
          data: [],
          borderColor: '#397e77',
          backgroundColor: 'rgba(57, 126, 119, 0.08)',
          pointBackgroundColor: [],
          pointRadius: 2.5,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Rate-Limit Quota Remaining',
          data: [],
          borderColor: '#f59e0b',
          borderDash: [4, 4],
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
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: textColor, boxWidth: 10, font: { size: 10, family: 'Inter' } }
        },
        tooltip: {
          padding: 8,
          bodyFont: { family: 'JetBrains Mono', size: 11 }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, maxTicksLimit: 8, font: { size: 10, family: 'JetBrains Mono' } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Latency (ms)', color: textColor, font: { size: 10 } },
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10, family: 'JetBrains Mono' } }
        },
        y1: {
          type: 'linear',
          display: false,
          position: 'right',
          title: { display: true, text: 'Quota Remaining', color: '#f59e0b', font: { size: 10 } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#f59e0b', font: { size: 10, family: 'JetBrains Mono' } }
        }
      }
    }
  });

  // Status Distribution Donut
  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  statusChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['2xx OK', '429 Rate Limited', '4xx Client Error', '5xx Server Error', 'Network Failed'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#10b981', // 2xx
          '#f59e0b', // 429
          '#f97316', // 4xx
          '#ef4444', // 5xx
          '#64748b'  // err
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, boxWidth: 10, font: { size: 10, family: 'Inter' } }
        }
      },
      cutout: '70%'
    }
  });
}

// Bind Event Listeners
// Keep the displayed Free allowance, quick picks and input value in sync.
function setRequestCount(value) {
  const count = Math.max(1, Math.min(1000, Math.floor(Number(value) || 1)));
  DOM.totalRequestsInput.value = count;
  DOM.requestCountDisplay.textContent = count.toLocaleString();
  DOM.statTotal.textContent = count.toLocaleString();
  DOM.requestCapacityFill.style.width = `${(count / 1000) * 100}%`;
  document.querySelectorAll('.quick-pill').forEach(pill => {
    pill.classList.toggle('active', Number(pill.getAttribute('data-val')) === count);
  });
}

function bindEvents() {
  // Method select color change
  DOM.httpMethod.addEventListener('change', (e) => {
    DOM.httpMethod.setAttribute('data-method', e.target.value);
  });

  // Preset Chips
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.preset-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      applyPreset(tag.getAttribute('data-preset'));
    });
  });

  // Quick Volume Pills
  document.querySelectorAll('.quick-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const val = Number(pill.getAttribute('data-val'));
      setRequestCount(val);
    });
  });

  DOM.totalRequestsInput.addEventListener('input', (e) => {
    if (e.target.value === '') return;
    setRequestCount(Number(e.target.value));
  });
  DOM.totalRequestsInput.addEventListener('blur', () => {
    setRequestCount(Number(DOM.totalRequestsInput.value) || 1);
  });

  // Concurrency slider
  DOM.concurrencySlider.addEventListener('input', (e) => {
    DOM.concurrencyVal.textContent = e.target.value;
  });

  // Delay slider
  DOM.delaySlider.addEventListener('input', (e) => {
    DOM.delayVal.textContent = `${e.target.value}ms`;
  });

  // Subtabs
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.subtab-view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  // Add Header
  DOM.btnAddHeader.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'header-item';
    row.innerHTML = `
      <input type="text" class="ui-input header-key" placeholder="Key">
      <input type="text" class="ui-input header-val" placeholder="Value">
      <button type="button" class="btn-icon-danger">&times;</button>
    `;
    DOM.headersList.appendChild(row);
    updateHeaderCount();
  });

  DOM.headersList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-icon-danger')) {
      e.target.closest('.header-item').remove();
      updateHeaderCount();
    }
  });

  // Format JSON Body
  DOM.btnBeautifyJson.addEventListener('click', () => {
    try {
      const val = DOM.requestBody.value.trim();
      if (!val) return;
      const parsed = JSON.parse(val);
      DOM.requestBody.value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      alert('Invalid JSON syntax: ' + e.message);
    }
  });

  // Apply Auth Bearer
  DOM.btnApplyAuth.addEventListener('click', () => {
    const token = DOM.authBearerToken.value.trim();
    if (!token) return;
    
    // Check if Authorization header already exists
    let existing = null;
    DOM.headersList.querySelectorAll('.header-item').forEach(row => {
      const k = row.querySelector('.header-key').value.trim().toLowerCase();
      if (k === 'authorization') existing = row;
    });

    if (existing) {
      existing.querySelector('.header-val').value = `Bearer ${token}`;
    } else {
      const row = document.createElement('div');
      row.className = 'header-item';
      row.innerHTML = `
        <input type="text" class="ui-input header-key" value="Authorization">
        <input type="text" class="ui-input header-val">
        <button type="button" class="btn-icon-danger">&times;</button>
      `;
      row.querySelector('.header-val').value = `Bearer ${token}`;
      DOM.headersList.appendChild(row);
      updateHeaderCount();
    }
    alert('Authorization Bearer header applied!');
  });

  // Execution Controls
  DOM.btnStart.addEventListener('click', startTest);
  DOM.btnPause.addEventListener('click', togglePause);
  DOM.btnStop.addEventListener('click', stopTest);
  DOM.btnClear.addEventListener('click', clearAll);

  // Table Filters
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.getAttribute('data-filter');
      renderLogsTable();
    });
  });

  DOM.logsTbody.addEventListener('click', (event) => {
    const inspectButton = event.target.closest('[data-request-id]');
    if (inspectButton) viewDetails(Number(inspectButton.dataset.requestId));
  });

  // Export Toolbar
  DOM.btnExportCsv.addEventListener('click', exportCsv);
  DOM.btnExportJson.addEventListener('click', exportJson);
  DOM.btnGuidedSetup.addEventListener('click', setupRateLimitRun);
  DOM.btnReportDownload.addEventListener('click', downloadAnalyzerReport);
  DOM.btnReportShare.addEventListener('click', shareAnalyzerReport);

  // Details Modal Events
  DOM.btnCloseModal.addEventListener('click', () => DOM.detailModal.classList.remove('active'));
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
  const count = DOM.headersList.querySelectorAll('.header-item').length;
  DOM.headerCount.textContent = count;
}

function setupRateLimitRun() {
  if (state.isRunning) return;
  DOM.httpMethod.value = 'GET';
  DOM.httpMethod.setAttribute('data-method', 'GET');
  setRequestCount(100);
  DOM.concurrencySlider.value = 1;
  DOM.concurrencyVal.textContent = '1';
  DOM.delaySlider.value = 100;
  DOM.delayVal.textContent = '100ms';
  DOM.stopOn429.checked = true;
  DOM.analyzerShareNote.textContent = 'Guided setup selected: 100 GET requests, one worker, 100 ms delay, and automatic stop on HTTP 429. Review the target URL, then start the test.';
  DOM.targetUrl.focus();
}

// Preset Targets (all public CORS enabled)
function applyPreset(name) {
  if (name === 'json-get-100') {
    DOM.httpMethod.value = 'GET';
    DOM.httpMethod.setAttribute('data-method', 'GET');
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
    DOM.httpMethod.setAttribute('data-method', 'GET');
    DOM.targetUrl.value = 'https://httpbin.org/status/429';
    DOM.totalRequestsInput.value = 20;
    DOM.requestCountDisplay.textContent = '20';
    DOM.statTotal.textContent = '20';
    DOM.concurrencySlider.value = 4;
    DOM.concurrencyVal.textContent = '4';
    DOM.delaySlider.value = 50;
    DOM.delayVal.textContent = '50ms';
    DOM.stopOn429.checked = true;
  } else if (name === 'burst-1000') {
    DOM.httpMethod.value = 'GET';
    DOM.httpMethod.setAttribute('data-method', 'GET');
    DOM.targetUrl.value = 'https://jsonplaceholder.typicode.com/posts/1';
    DOM.totalRequestsInput.value = 1000;
    DOM.requestCountDisplay.textContent = '1,000';
    DOM.statTotal.textContent = '1,000';
    DOM.concurrencySlider.value = 10;
    DOM.concurrencyVal.textContent = '10';
    DOM.delaySlider.value = 0;
    DOM.delayVal.textContent = '0ms';
    DOM.stopOn429.checked = false;
  } else if (name === 'post-echo') {
    DOM.httpMethod.value = 'POST';
    DOM.httpMethod.setAttribute('data-method', 'POST');
    DOM.targetUrl.value = 'https://jsonplaceholder.typicode.com/posts';
    DOM.totalRequestsInput.value = 50;
    DOM.requestCountDisplay.textContent = '50';
    DOM.statTotal.textContent = '50';
    DOM.concurrencySlider.value = 5;
    DOM.concurrencyVal.textContent = '5';
    DOM.requestBody.value = JSON.stringify({
      title: 'Benchmark Run #{{id}}',
      timestamp: '{{timestamp}}',
      randomToken: '{{random}}',
      uuid: '{{uuid}}'
    }, null, 2);
  }
  setRequestCount(DOM.totalRequestsInput.value);
}

// Start Load Test
async function startTest() {
  const rawUrl = DOM.targetUrl.value.trim();
  if (!rawUrl) {
    alert('Please enter a target URL');
    return;
  }

  if (state.isRunning) return;
  let parsedUrl;
  try { parsedUrl = new URL(rawUrl); } catch { alert('Enter a valid HTTP or HTTPS URL.'); return; }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) { alert('Use an HTTP or HTTPS URL without embedded credentials.'); return; }
  const requested = Number(DOM.totalRequestsInput.value), concurrency = Number(DOM.concurrencySlider.value), delay = Number(DOM.delaySlider.value);
  if (!Number.isInteger(requested) || requested < 1 || requested > 1000 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10 || !Number.isFinite(delay) || delay < 0 || delay > 1000) { alert('Free plan supports 1–1,000 requests, 1–10 workers, and a delay of 0–1,000 ms.'); return; }
  // Reset Run State
  state.isRunning = true;
  state.isPaused = false;
  state.isStopped = false;
  state.totalRequests = parseInt(DOM.totalRequestsInput.value, 10) || 100;
  state.concurrency = parseInt(DOM.concurrencySlider.value, 10) || 5;
  state.delayMs = parseInt(DOM.delaySlider.value, 10) || 0;
  state.stopOn429 = DOM.stopOn429.checked;
  
  state.requestIndex = 0;
  state.completedCount = 0;
  state.activeWorkers = 0;
  state.results = [];
  state.analyzerReport = null;
  state.startTime = Date.now();
  state.endTime = null;
  state.controller = new AbortController();
  state.rateSamples = [];
  state.runConfig = { url: rawUrl, method: DOM.httpMethod.value, concurrency: state.concurrency, delay: state.delayMs };
  state.peakRps = 0;

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
  DOM.statusBadge.textContent = 'Dispatched';
  DOM.statusBadge.style.color = 'var(--accent-primary)';
  DOM.statTotal.textContent = state.totalRequests.toLocaleString();
  
  DOM.rateLimitPanel.classList.remove('breached');
  DOM.rateLimitBadge.textContent = 'Inspecting Headers...';
  DOM.rateLimitBadge.className = 'status-tag';
  DOM.rateLimitBanner.style.display = 'none';
  DOM.rlLimit.textContent = '--';
  DOM.rlRemaining.textContent = '--';
  DOM.rlReset.textContent = '--';
  DOM.rlBreachReq.textContent = '--';
  DOM.rlSustainableRps.textContent = '--';
  resetAnalyzer();

  resetCharts();
  DOM.mSuccessRate.textContent = '—';
  DOM.m2xx.textContent = DOM.m429.textContent = DOM.mErrors.textContent = DOM.m4xx.textContent = DOM.m5xx.textContent = '0';
  DOM.mRps.textContent = DOM.mPeakRps.textContent = '0.0';
  DOM.mLatencyAvg.textContent = '0ms';
  DOM.mLatencyMin.textContent = DOM.mLatencyMax.textContent = '0';
  DOM.mLatencyP95.textContent = '-- / -- / --';
  DOM.m429Pct.textContent = '0% of total';
  renderLogsTable();

  if (state.elapsedInterval) clearInterval(state.elapsedInterval);
  state.elapsedInterval = setInterval(updateElapsedAndEta, 200);

  const customHeaders = getHeadersFromUI();
  const rawBody = DOM.requestBody.value;
  const method = DOM.httpMethod.value;

  // Concurrency Pool
  const workers = [];
  const activeConcurrency = Math.min(state.concurrency, state.totalRequests);
  for (let i = 0; i < activeConcurrency; i++) {
    workers.push(runWorker(i + 1, rawUrl, method, customHeaders, rawBody));
  }

  await Promise.all(workers);
  finishTest();
}

// Worker Loop
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

    // Variable Replacement
    let processedBody = null;
    if (bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(method)) {
      processedBody = bodyTemplate
        .replace(/{{id}}/g, reqNum)
        .replace(/{{timestamp}}/g, new Date().toISOString())
        .replace(/{{random}}/g, Math.random().toString(36).substring(2, 9))
        .replace(/{{uuid}}/g, generateUUID());
    }

    const result = await executeSingleRequest(reqNum, url, method, headers, processedBody);
    if (!result) break;
    const completedAt = Date.now();
    result.completedAt = completedAt;
    state.results.push(result);
    state.rateSamples.push(completedAt);
    state.rateSamples = state.rateSamples.filter(t => t > completedAt - 1000);
    state.peakRps = Math.max(state.peakRps, state.rateSamples.length);
    DOM.mPeakRps.textContent = state.peakRps.toFixed(1);
    state.completedCount++;

    inspectRateLimit(result);
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

// Client-side Browser Fetch
async function executeSingleRequest(id, url, method, headers, body) {
  const reqStart = performance.now();
  const targetUrl = url;

  const timeout = new AbortController();
  const abort = () => timeout.abort();
  state.controller.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 30000);
  try {
    const fetchOpts = { method, headers, signal: timeout.signal };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOpts.body = body;
    }

    const response = await fetch(targetUrl, fetchOpts);
    const duration = Math.round(performance.now() - reqStart);
    
    const resHeaders = {};
    const rateLimitHeaders = {};
    response.headers.forEach((v, k) => {
      const lower = k.toLowerCase();
      resHeaders[lower] = v;
      if (lower.includes('ratelimit') || lower.includes('rate-limit') || lower === 'retry-after') {
        rateLimitHeaders[lower] = v;
      }
    });

    let textSnippet = '';
    try {
      textSnippet = (await response.text()).slice(0, 3000);
    } catch (e) {
      if (timeout.signal.aborted) throw e;
      textSnippet = '(Body not readable)';
    }

    if (state.controller.signal.aborted) return null;
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
    if (state.controller.signal.aborted) return null;
    const duration = Math.round(performance.now() - reqStart);
    const isCors = err.message && err.message.toLowerCase().includes('failed to fetch');
    return {
      id: id,
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      status: 0,
      statusText: err.name === 'AbortError' ? 'Timeout' : (isCors ? 'CORS / Network Error' : (err.message || 'Error')),
      duration: duration,
      headers: {},
      rateLimitHeaders: {},
      bodySnippet: err.name === 'AbortError' ? 'Request timed out after 30 seconds.' : (isCors ? 'Network request failed. The target may block browser requests through CORS.' : err.message),
      isError: true
    };
  } finally {
    clearTimeout(timer);
    state.controller.signal.removeEventListener('abort', abort);
  }
}

// Rate Limit Inspector
function inspectRateLimit(result) {
  const rl = result.rateLimitHeaders || {};
  const combined = rl.ratelimit || '';
  const combinedField = name => {
    const match = combined.match(new RegExp('(?:^|[,;\\s])' + name + '\\s*=\\s*"?(\\d+)', 'i'));
    return match ? match[1] : undefined;
  };
  const limitVal = rl['ratelimit-limit'] ?? rl['x-ratelimit-limit'] ?? rl['x-rate-limit-limit'] ?? combinedField('limit');
  const remainingVal = rl['ratelimit-remaining'] ?? rl['x-ratelimit-remaining'] ?? rl['x-rate-limit-remaining'] ?? combinedField('remaining');
  const resetVal = rl['ratelimit-reset'] ?? rl['x-ratelimit-reset'] ?? rl['x-rate-limit-reset'] ?? combinedField('reset');
  const retryAfter = rl['retry-after'];

  if (limitVal !== undefined || remainingVal !== undefined || resetVal !== undefined || retryAfter !== undefined) {
    state.rateLimit.detected = true;
    latencyChart.options.scales.y1.display = true;

    if (limitVal !== undefined) {
      const limit = parseInt(limitVal, 10);
      if (Number.isFinite(limit)) {
        state.rateLimit.limit = limit;
        DOM.rlLimit.textContent = limit.toLocaleString();
      }
    }

    if (remainingVal !== undefined) {
      const remaining = parseInt(remainingVal, 10);
      if (Number.isFinite(remaining)) {
        state.rateLimit.remaining = remaining;
        DOM.rlRemaining.textContent = remaining.toLocaleString();
      }
      
      if (state.rateLimit.limit && state.rateLimit.remaining !== null) {
        const ratio = state.rateLimit.remaining / state.rateLimit.limit;
        if (ratio <= 0.1) DOM.rlRemaining.style.color = 'var(--danger)';
        else if (ratio <= 0.35) DOM.rlRemaining.style.color = 'var(--warning)';
        else DOM.rlRemaining.style.color = 'var(--success)';
      }
    }

    if (resetVal !== undefined || retryAfter !== undefined) {
      const secondsLeft = retryAfter !== undefined
        ? PulseAnalyzer.parseRetryAfter(retryAfter)
        : PulseAnalyzer.parseReset(resetVal);
      if (secondsLeft !== null) {
        state.rateLimit.resetCountdown = secondsLeft;
        DOM.rlReset.textContent = `${secondsLeft}s`;
        if (secondsLeft > 0) startResetCountdown(secondsLeft);
      }
    }

    if (state.rateLimit.firstBreachIndex === null) {
      DOM.rateLimitBadge.textContent = 'Rate Limit Headers Detected';
      DOM.rateLimitBadge.className = 'status-tag status-2xx';
    }
  }

  // Detect Limit Breach
  if (result.status === 429 && !state.rateLimit.firstBreachIndex) {
    state.rateLimit.firstBreachIndex = result.id;
    state.rateLimit.firstBreachTime = new Date().toLocaleTimeString();
    
    DOM.rateLimitPanel.classList.add('breached');
    DOM.rlBreachReq.textContent = `#${result.id}`;
    DOM.rateLimitBadge.textContent = 'RATE LIMIT HIT!';
    DOM.rateLimitBadge.className = 'status-tag status-429';

    DOM.rateLimitBanner.style.display = 'flex';
    DOM.rateLimitBanner.className = 'breach-alert danger';
    DOM.rateLimitMsg.innerHTML = `<strong>Rate Limit Hit!</strong> First observed at Request <strong>#${result.id}</strong> (${state.rateLimit.firstBreachTime}).`;
  }
}

function startResetCountdown(initialSeconds) {
  if (state.resetTimerInterval) clearInterval(state.resetTimerInterval);
  let remaining = initialSeconds;

  state.resetTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(state.resetTimerInterval);
      DOM.rlReset.textContent = '0s (estimate)';
      if (state.rateLimit.firstBreachIndex === null) DOM.rateLimitBadge.textContent = 'Header wait elapsed';
    } else {
      DOM.rlReset.textContent = `${remaining}s`;
    }
  }, 1000);
}

function triggerRateLimitStop(reqNum) {
  state.isStopped = true;
  state.controller.abort();
  DOM.statusBadge.textContent = 'Halted (429 Hit)';
  DOM.statusBadge.style.color = 'var(--warning)';
  DOM.rateLimitBanner.style.display = 'flex';
  DOM.rateLimitBanner.className = 'breach-alert warning';
  DOM.rateLimitMsg.innerHTML = `🛡️ <strong>Safety Auto-Halt:</strong> Dispatches stopped upon hitting HTTP 429 at Request <strong>#${reqNum}</strong>.`;
}

// Elapsed Time, ETA, and Instantaneous RPS
function updateElapsedAndEta() {
  if (!state.startTime) return;
  const now = Date.now();
  const elapsedSec = (now - state.startTime) / 1000;
  DOM.statElapsed.textContent = `${elapsedSec.toFixed(1)}s`;

  if (state.completedCount > 0 && state.isRunning) {
    state.rateSamples = state.rateSamples.filter(t => t > now - 1000);
    const rate = state.completedCount / Math.max(0.1, elapsedSec);
    const currentRate = state.rateSamples.length;
    DOM.statInstantRps.textContent = `${currentRate.toFixed(1)} RPS`;
    
    if (currentRate > state.peakRps) {
      state.peakRps = currentRate;
      DOM.mPeakRps.textContent = state.peakRps.toFixed(1);
    }

    const remainingReqs = state.totalRequests - state.completedCount;
    if (rate > 0 && remainingReqs > 0) {
      const etaSec = remainingReqs / rate;
      DOM.statEta.textContent = etaSec < 60 ? `${Math.ceil(etaSec)}s` : `${Math.floor(etaSec / 60)}m ${Math.ceil(etaSec % 60)}s`;
    } else {
      DOM.statEta.textContent = '0s';
    }
  }
  updateMetricsUI();
  renderLogsTable();
}

function updateProgressUI() {
  const pct = Math.min(100, Math.round((state.completedCount / state.totalRequests) * 100));
  DOM.progressFill.style.width = `${pct}%`;
  DOM.progressPercent.textContent = `${pct}%`;
  DOM.statCompleted.textContent = state.completedCount.toLocaleString();
  DOM.statActiveWorkers.textContent = state.activeWorkers;
}

// KPI Dashboard Calculations
function updateMetricsUI() {
  updateProgressUI();
  const total = state.results.length;
  if (total === 0) return;

  let count2xx = 0, count429 = 0, count4xx = 0, count5xx = 0, countFail = 0;
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

  const elapsedSec = Math.max(0.1, ((state.endTime || Date.now()) - state.startTime) / 1000);
  const rps = (total / elapsedSec).toFixed(1);
  DOM.mRps.textContent = rps;

  latencies.sort((a, b) => a - b);
  const avg = Math.round(latencySum / total);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  DOM.mLatencyAvg.textContent = `${avg}ms`;
  DOM.mLatencyMin.textContent = min;
  DOM.mLatencyMax.textContent = max;
  DOM.mLatencyP95.textContent = `${p50}/${p95}/${p99}ms`;

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

  const rl = result.rateLimitHeaders || {};
  const combinedMatch = (rl.ratelimit || '').match(/(?:^|[,;\s])remaining\s*=\s*"?(\d+)/i);
  const rem = rl['ratelimit-remaining'] ?? rl['x-ratelimit-remaining'] ?? rl['x-rate-limit-remaining'] ?? (combinedMatch ? combinedMatch[1] : null);
  const remaining = rem !== null ? parseInt(rem, 10) : NaN;
  latencyChart.data.datasets[1].data.push(Number.isFinite(remaining) ? remaining : null);

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

function togglePause() {
  state.isPaused = !state.isPaused;
  if (state.isPaused) {
    DOM.btnPause.textContent = '▶ Resume';
    DOM.statusBadge.textContent = 'Paused';
    DOM.statusBadge.style.color = 'var(--warning)';
  } else {
    DOM.btnPause.textContent = '⏸ Pause';
    DOM.statusBadge.textContent = 'Dispatched';
    DOM.statusBadge.style.color = 'var(--accent-primary)';
  }
}

function stopTest() {
  state.isStopped = true;
  DOM.statusBadge.textContent = 'Stopping…';
  DOM.statusBadge.style.color = 'var(--danger)';
  DOM.btnStop.disabled = true;
  state.controller.abort();
}

function finishTest() {
  state.endTime = Date.now();
  state.isRunning = false;
  if (state.isStopped && DOM.statusBadge.textContent === 'Stopping…') DOM.statusBadge.textContent = 'Stopped';
  if (state.elapsedInterval) clearInterval(state.elapsedInterval);
  
  DOM.btnStart.disabled = false;
  DOM.btnPause.disabled = true;
  DOM.btnStop.disabled = true;
  
  if (!state.isStopped) {
    DOM.statusBadge.textContent = 'Completed';
    DOM.statusBadge.style.color = 'var(--success)';
  }

  updateMetricsUI();
  DOM.statInstantRps.textContent = '0.0 RPS';
  latencyChart.update();
  renderLogsTable();
  if (state.results.length) {
    state.analyzerReport = PulseAnalyzer.summarize(state.results, {
      startTime: state.startTime,
      durationMs: state.endTime - state.startTime,
      concurrency: state.concurrency,
      delayMs: state.delayMs
    });
    renderAnalyzer(state.analyzerReport);
  }
}

function clearAll() {
  if (state.isRunning) return;
  state.results = [];
  state.analyzerReport = null;
  state.requestIndex = 0;
  state.completedCount = 0;
  state.peakRps = 0;
  
  DOM.progressFill.style.width = '0%';
  DOM.progressPercent.textContent = '0%';
  DOM.statCompleted.textContent = '0';
  DOM.statActiveWorkers.textContent = '0';
  DOM.statElapsed.textContent = '0.0s';
  DOM.statEta.textContent = '--';
  DOM.statInstantRps.textContent = '0.0 RPS';
  DOM.statusBadge.textContent = 'Idle';
  DOM.statusBadge.style.color = 'var(--text-muted)';

  DOM.rateLimitPanel.classList.remove('breached');
  DOM.rateLimitBadge.textContent = 'Waiting for data';
  DOM.rateLimitBadge.className = 'status-tag';
  DOM.rateLimitBanner.style.display = 'none';
  DOM.rlLimit.textContent = '--';
  DOM.rlRemaining.textContent = '--';
  DOM.rlReset.textContent = '--';
  DOM.rlBreachReq.textContent = '--';
  DOM.rlSustainableRps.textContent = '--';

  DOM.mSuccessRate.textContent = '—';
  DOM.m2xx.textContent = '0';
  DOM.m429.textContent = '0';
  DOM.m429Pct.textContent = '0% of total';
  DOM.mErrors.textContent = '0';
  DOM.m4xx.textContent = '0';
  DOM.m5xx.textContent = '0';
  DOM.mRps.textContent = '0.0';
  DOM.mPeakRps.textContent = '0.0';
  DOM.mLatencyAvg.textContent = '0ms';
  DOM.mLatencyMin.textContent = '0';
  DOM.mLatencyMax.textContent = '0';
  DOM.mLatencyP95.textContent = '-- / -- / --';

  resetCharts();
  renderLogsTable();
  resetAnalyzer();
}

// Request Stream Table
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
        <td colspan="7" class="log-empty-cell">
          ${state.results.length === 0 ? 'No requests sent yet.' : 'No requests matching current filter.'}
        </td>
      </tr>
    `;
    return;
  }

  const displayRows = filtered.slice(-250).reverse();
  let html = '';

  for (let i = 0; i < displayRows.length; i++) {
    const item = displayRows[i];
    let badgeClass = 'status-2xx';
    if (item.status === 429) badgeClass = 'status-429';
    else if (item.status >= 400 && item.status < 500) badgeClass = 'status-4xx';
    else if (item.status >= 500 || item.status === 0) badgeClass = 'status-5xx';

    let latencyClass = 'latency-normal';
    if (item.duration < 150) latencyClass = 'latency-fast';
    else if (item.duration > 400) latencyClass = 'latency-slow';
    if (item.duration > 800) latencyClass = 'latency-critical';

    const remainingQuota = (item.rateLimitHeaders && item.rateLimitHeaders['x-ratelimit-remaining']) ?? '--';
    const preview = escapeHtml(item.bodySnippet ? item.bodySnippet.substring(0, 65) : '(empty)');

    html += `
      <tr>
        <td>#${item.id}</td>
        <td><strong class="log-method">${item.method}</strong></td>
        <td><span class="status-tag ${badgeClass}">${item.status || 'ERR'} ${escapeHtml(item.statusText || '')}</span></td>
        <td class="${latencyClass}"><strong>${item.duration}ms</strong></td>
        <td>${remainingQuota}</td>
        <td class="log-preview">
          ${preview}
        </td>
        <td>
          <button class="btn-secondary log-inspect-button" data-request-id="${item.id}">Inspect</button>
        </td>
      </tr>
    `;
  }

  DOM.logsTbody.innerHTML = html;
}

// Request Inspector Modal
function viewDetails(reqId) {
  const item = state.results.find(r => r.id === reqId);
  if (!item) return;

  DOM.modalMethodUrl.textContent = `${item.method} ${item.url}`;
  
  let badgeClass = 'status-2xx';
  if (item.status === 429) badgeClass = 'status-429';
  else if (item.status >= 400 && item.status < 500) badgeClass = 'status-4xx';
  else if (item.status >= 500 || item.status === 0) badgeClass = 'status-5xx';

  DOM.modalStatusBadge.className = `status-tag ${badgeClass}`;
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
}

// Helpers
function resetAnalyzer() {
  DOM.analyzerSummary.textContent = 'Run a test to see the analysis.';
  DOM.analyzerBars.innerHTML = '';
  DOM.analyzerShareNote.textContent = 'Reports and share links contain aggregate numbers only. Endpoint URLs, headers, and response bodies are excluded.';
  DOM.btnReportDownload.disabled = true;
  DOM.btnReportShare.disabled = true;
}

function renderAnalyzer(report, shared = false) {
  if (!PulseAnalyzer.isValidReport(report)) return;
  state.analyzerReport = report;
  const findings = [];
  if (report.first429 !== null) {
    findings.push(`HTTP 429 first appeared at request #${report.first429}. ${report.counts.limited} of ${report.completed} completed requests returned 429.`);
    if (report.observedBefore429Rps !== null) findings.push(`Before the first observed 429, ${report.observedBefore429Rps} successful responses per second were completed on average. This is not a guaranteed safe rate.`);
  } else {
    findings.push(`No HTTP 429 was observed in ${report.completed} completed requests. This does not establish the API's limit or a safe request rate.`);
  }
  if (report.limit !== null) findings.push(`Exposed limit header: ${report.limit}.`);
  if (report.remaining !== null) findings.push(`Last exposed remaining quota: ${report.remaining}.`);
  if (report.retryAfterSeconds !== null) findings.push(`Retry-After indicated ${report.retryAfterSeconds} seconds when observed.`);
  else if (report.resetSeconds !== null) findings.push(`An exposed reset header indicated about ${report.resetSeconds} seconds when observed.`);
  if (report.limit === null && report.remaining === null && report.retryAfterSeconds === null && report.resetSeconds === null) findings.push('No readable rate-limit headers were exposed to this browser.');
  if (report.counts.network > 0) findings.push(`${report.counts.network} request(s) failed at the network layer; CORS, connectivity, and server failures cannot be distinguished here.`);
  findings.push(`Average response-header latency: ${report.averageLatencyMs} ms. Test duration: ${report.durationSeconds} s.`);
  DOM.analyzerSummary.textContent = findings.join('\n');

  const bars = [
    ['Success', report.counts.success, 'success'],
    ['429', report.counts.limited, 'limited'],
    ['Other HTTP', report.counts.otherHttp, 'other'],
    ['Network', report.counts.network, 'network']
  ];
  DOM.analyzerBars.innerHTML = bars.map(([label, count, css]) =>
    `<div class="analyzer-bar-row"><span>${label}</span><div class="analyzer-bar-track"><span class="analyzer-bar-fill ${css}"></span></div><strong>${count}</strong></div>`
  ).join('');
  DOM.analyzerBars.querySelectorAll('.analyzer-bar-fill').forEach((bar, index) => {
    bar.style.width = `${(bars[index][1] / report.completed) * 100}%`;
  });
  DOM.btnReportDownload.disabled = false;
  DOM.btnReportShare.disabled = false;
  DOM.analyzerShareNote.textContent = shared
    ? 'Shared aggregate report. Its values are supplied by the link and are not independently verified. No endpoint URL, credentials, headers, or response bodies were included. Run your own test below.'
    : 'Report ready. Download or share aggregate numbers without endpoint URLs, credentials, headers, or response bodies.';
}

function downloadAnalyzerReport() {
  const report = state.analyzerReport;
  if (!PulseAnalyzer.isValidReport(report)) return;
  const link = document.createElement('a');
  link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
  link.download = `pulse_rate_limit_report_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function shareAnalyzerReport() {
  const report = state.analyzerReport;
  if (!PulseAnalyzer.isValidReport(report)) return;
  const url = location.origin + location.pathname + PulseAnalyzer.shareHash(report);
  try {
    await navigator.clipboard.writeText(url);
    DOM.analyzerShareNote.textContent = 'Safe report link copied. Only aggregate numbers are in the link.';
  } catch {
    DOM.analyzerShareNote.textContent = 'Could not copy automatically. Use the download button to share the aggregate report.';
  }
}

function getHeadersFromUI() {
  const headers = {};
  DOM.headersList.querySelectorAll('.header-item').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const val = row.querySelector('.header-val').value.trim();
    if (key) headers[key] = val;
  });
  return headers;
}

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
      r.timestamp,
      r.method,
      r.url,
      r.status,
      r.statusText || '',
      r.duration,
      rl['x-ratelimit-remaining'] || '',
      rl['x-ratelimit-limit'] || '',
      rl['x-ratelimit-reset'] || ''
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(row => row.map(value => { const text = String(value ?? ''); const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '""') + '"'; }).join(',')).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `api_pulse_${cleanHostname(DOM.targetUrl.value)}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportJson() {
  if (state.results.length === 0) {
    alert('No results to export yet.');
    return;
  }

  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: 'Pulse',
      endpoint: DOM.targetUrl.value,
      method: DOM.httpMethod.value
    },
    summary: {
      totalRequests: state.results.length,
      successRate: DOM.mSuccessRate.textContent,
      rateLimited429: DOM.m429.textContent,
      clientErrors: DOM.m4xx.textContent,
      serverErrors: DOM.m5xx.textContent,
      rps: DOM.mRps.textContent,
      peakRps: DOM.mPeakRps.textContent,
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
  link.setAttribute('download', `api_pulse_${cleanHostname(DOM.targetUrl.value)}_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function cleanHostname(url) {
  try {
    return new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
  } catch (e) {
    return 'benchmark';
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
