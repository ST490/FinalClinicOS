import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Apply the saved (or system-default) theme before first paint to avoid a flash.
;(() => {
  const isNight = () => {
    const h = new Date().getHours();
    return h >= 19 || h < 7;
  };
  const stored = localStorage.getItem('theme');
  const dark =
    stored === 'dark' ||
    (stored === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ||
    (stored === 'night' && isNight()) ||
    (!stored && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!dark);
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
