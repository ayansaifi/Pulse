/* Result navigation stays separate from the request engine. */
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('workspace-enhanced');
  document.body.dataset.workspaceStep = 'setup';
  const completed = document.getElementById('stat-completed');
  const updateEmptyState = () => document.getElementById('results-workspace').classList.toggle('has-results', Number(completed.textContent) > 0);
  new MutationObserver(updateEmptyState).observe(completed, { childList: true, characterData: true, subtree: true });
  updateEmptyState();
  const steps = [...document.querySelectorAll('button[data-workspace-step]')];
  function selectStep(step) {
    document.body.dataset.workspaceStep = step;
    steps.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspaceStep === step)));
    if (step === 'results') {
      latencyChart?.resize();
      statusChart?.resize();
    }
  }
  steps.forEach(button => button.addEventListener('click', () => {
    selectStep(button.dataset.workspaceStep);
    document.querySelector('.main-layout').scrollIntoView({ block: 'start' });
  }));
  const tabs = [...document.querySelectorAll('[data-result-tab]')];
  function selectTab(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (tab.dataset.resultTab === 'overview') {
      latencyChart?.resize();
      statusChart?.resize();
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  });
  document.getElementById('btn-guided-setup').addEventListener('click', () => {
    selectStep('setup');
    document.getElementById('test-configuration').scrollIntoView({ block: 'start' });
    document.getElementById('target-url').focus({ preventScroll: true });
  });
  document.getElementById('btn-start').addEventListener('click', () => {
    if (state.isRunning && window.matchMedia('(max-width: 900px)').matches) {
      selectStep('results');
      document.querySelector('.main-layout').scrollIntoView({ block: 'start' });
    }
  });
});
