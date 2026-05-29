import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

// On native iOS, intercept external link clicks and open them in the in-app browser
// so users never get kicked out of the app.
if (Capacitor.isNativePlatform()) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
    // Internal routes (no protocol) are handled by React Router — let them through
    if (!href.startsWith('http')) return;
    // External URL — prevent default navigation and open in in-app browser
    e.preventDefault();
    Browser.open({ url: href, presentationStyle: 'popover' }).catch(() => {});
  });
}

const root = document.getElementById('root')

if (!root) {
  console.error('[app-startup] Missing #root element')
} else {
  createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
    <Analytics />
  </StrictMode>,
  )
}
