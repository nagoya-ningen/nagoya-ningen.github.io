(() => {
  'use strict';

  // The measurement ID belongs to the HP's own web stream and is supplied by HTML.
  const measurementId = document.currentScript?.dataset.measurementId;
  const allowedHosts = ['nagoya-ningen.github.io', 'nagoya-ningen.pages.dev'];
  if (window.location.protocol !== 'https:' || !allowedHosts.includes(window.location.hostname)) return;
  if (typeof measurementId !== 'string' || !/^G-[A-Z0-9]{10}$/.test(measurementId)) return;
  if (window.__nagoyaAnalyticsInitialized) return;

  const pageUrl = new URL(window.location.href);
  const config = {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: pageUrl.origin + pageUrl.pathname,
    page_referrer: '',
    // Override campaign fields rather than forwarding arbitrary query values.
    campaign_source: '',
    campaign_medium: '',
    campaign_id: '',
    campaign_name: '',
    campaign_content: '',
    campaign_term: ''
  };

  // Only the referrer's origin is needed for referral attribution.
  try {
    const referrer = new URL(document.referrer);
    if (referrer.protocol === 'https:' || referrer.protocol === 'http:') {
      config.page_referrer = referrer.origin;
    }
  } catch {
    // An empty or malformed referrer is treated as unavailable.
  }

  const sources = [
    'chatgpt.com', 'perplexity.ai', 'copilot.microsoft.com',
    'google', 'google.com', 'bing', 'bing.com',
    'note', 'note.com', 'substack', 'substack.com',
    'threads', 'threads.com', 'threads.net', 'x', 'x.com', 'newsletter'
  ];
  const mediums = ['referral', 'organic', 'social', 'email'];
  const sourceValues = pageUrl.searchParams.getAll('utm_source');
  const mediumValues = pageUrl.searchParams.getAll('utm_medium');
  if (sourceValues.length === 1 && sources.includes(sourceValues[0])) {
    config.campaign_source = sourceValues[0];
    if (mediumValues.length === 1 && mediums.includes(mediumValues[0])) {
      config.campaign_medium = mediumValues[0];
    }
  }

  window.__nagoyaAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // This one config call sends the standard page_view. Outbound clicks are
  // collected by the stream's enhanced measurement, with no custom events.
  window.gtag('config', measurementId, config);

  const tag = document.createElement('script');
  tag.async = true;
  tag.referrerPolicy = 'no-referrer';
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(tag);
})();
