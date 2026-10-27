/* The report is decoded locally; loading a shared report never runs a test. */
(() => {
  let report = null;
  const byId = id => document.getElementById(id);
  const number = value => value == null ? 'Not available' : value.toLocaleString();
  const measure = (value, unit) => value == null ? 'Not available' : `${number(value)} ${unit}`;

  function render() {
    report = PulseAnalyzer.readShareHash(location.hash);
    byId('report-content').hidden = !report;
    byId('report-error').hidden = !!report;
    byId('report-status').textContent = '';
    if (!report) return;

    byId('report-headline').textContent = `${number(report.completed)} completed requests. ${number(report.counts.limited)} rate-limited responses. One snapshot of your API’s behavior.`;
    const date = new Date(report.generatedAt);
    byId('report-date').textContent = Number.isNaN(date.getTime()) ? report.generatedAt : date.toLocaleString();
    byId('report-date').dateTime = report.generatedAt;
    byId('report-completed').textContent = number(report.completed);
    byId('report-success').textContent = `${Math.round(report.counts.success / report.completed * 100)}%`;
    byId('report-limited').textContent = number(report.counts.limited);
    byId('report-latency').textContent = measure(report.averageLatencyMs, 'ms');
    byId('report-duration').textContent = measure(report.durationSeconds, 's');
    byId('report-workers').textContent = number(report.concurrency);
    byId('report-delay').textContent = measure(report.delayMs, 'ms');
    byId('report-remaining').textContent = number(report.remaining);

    const findings = [];
    if (report.first429 !== null) {
      findings.push(`HTTP 429 first appeared at request #${report.first429}. ${report.counts.limited} of ${report.completed} completed requests were rate limited.`);
      if (report.observedBefore429Rps !== null) findings.push(`Before the first 429, an average of ${report.observedBefore429Rps} successful responses completed per second. This is an observation, not a safe-rate recommendation.`);
    } else {
      findings.push('No HTTP 429 was observed. The run did not establish the API’s rate limit.');
    }
    if (report.limit !== null) findings.push(`The API exposed a limit of ${report.limit}.`);
    if (report.retryAfterSeconds !== null) findings.push(`Retry-After indicated a wait of ${report.retryAfterSeconds} seconds.`);
    else if (report.resetSeconds !== null) findings.push(`The exposed reset header indicated about ${report.resetSeconds} seconds.`);
    if ([report.limit, report.remaining, report.retryAfterSeconds, report.resetSeconds].every(value => value === null)) findings.push('No readable rate-limit headers were exposed to the browser.');
    if (report.counts.network) findings.push(`${report.counts.network} requests failed at the network layer. Browser restrictions, connectivity, and server failures cannot be distinguished here.`);
    byId('report-findings').replaceChildren(...findings.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));

    const categories = [['Success', 'success', 'success'], ['HTTP 429', 'limited', 'limited'], ['Other HTTP', 'otherHttp', 'other'], ['Network', 'network', 'network']];
    byId('report-breakdown').replaceChildren(...categories.map(([label, key, color]) => {
      const row = document.createElement('div');
      row.className = 'analyzer-bar-row';
      const name = document.createElement('span');
      name.textContent = label;
      const track = document.createElement('div');
      track.className = 'analyzer-bar-track';
      const bar = document.createElement('span');
      bar.className = `analyzer-bar-fill ${color}`;
      bar.style.width = `${report.counts[key] / report.completed * 100}%`;
      track.appendChild(bar);
      const count = document.createElement('strong');
      count.textContent = number(report.counts[key]);
      row.append(name, track, count);
      return row;
    }));
  }

  byId('report-copy').addEventListener('click', async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(location.href);
      byId('report-status').textContent = 'Report link copied.';
    } catch {
      byId('report-status').textContent = 'Copy the full address from your browser’s address bar to share this report.';
    }
  });
  byId('report-download').addEventListener('click', () => {
    if (!report) return;
    const link = document.createElement('a');
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    link.download = 'pulse-performance-report.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  window.addEventListener('hashchange', render);
  render();
})();
