import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { flushAnalytics, trackEvent, trackPageView } from '../lib/analytics';

export default function AnalyticsTracker() {
  const location = useLocation();
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    const previousStartedAt = enteredAt.current;
    enteredAt.current = Date.now();
    trackPageView({
      previous_path_time_seconds: Math.round((Date.now() - previousStartedAt) / 1000),
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushAnalytics();
    }

    function handleClick(event) {
      const target = event.target instanceof Element
        ? event.target.closest('a,button,[data-analytics-event]')
        : null;
      if (!target) return;
      const explicitEvent = target.dataset?.analyticsEvent;
      if (explicitEvent) {
        trackEvent(explicitEvent, {
          label: target.dataset.analyticsLabel || target.textContent?.trim()?.slice(0, 80),
          href: target.href || '',
        });
      }
      if (target.tagName === 'A' && target.href) {
        const url = new URL(target.href, window.location.origin);
        if (url.origin !== window.location.origin) {
          trackEvent('outbound_link_clicked', { host: url.hostname, href: url.href });
        }
      }
      if (target.getAttribute('href') === '/create-listing' || target.getAttribute('href') === '/become-a-tutor') {
        trackEvent('become_tutor_clicked', { href: target.getAttribute('href') });
      }
    }

    window.addEventListener('click', handleClick, true);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushAnalytics);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushAnalytics);
    };
  }, []);

  return null;
}
