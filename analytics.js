// Count visits on the published site without sending URL queries or report fragments.
(function () {
  if (location.hostname !== 'apulse.tech' && location.hostname !== 'www.apulse.tech') return;

  var measurementId = 'G-MW7RQ6YT1B';
  var pageLocation = location.origin + location.pathname;
  var config = { page_location: pageLocation };

  if (document.referrer) {
    try {
      var referrer = new URL(document.referrer);
      config.page_referrer = referrer.origin + referrer.pathname;
    } catch (_) {
      // Leave malformed referrers out of analytics.
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('set', config);
  window.gtag('config', measurementId, config);

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
})();
