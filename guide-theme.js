/* Match the main Pulse app's saved light/dark theme. */
const guideTheme = localStorage.getItem('api-pulse-theme') === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', guideTheme);

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('guide-theme-toggle');
  const updateLabel = () => {
    button.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Light mode' : 'Dark mode';
  };
  updateLabel();
  button.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('api-pulse-theme', next);
    updateLabel();
  });
});
