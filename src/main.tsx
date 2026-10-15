import './styles/globals.css' // Tailwind + Untitled UI. Must stay the FIRST import: it declares the cascade-layer order
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './lib/i18n'
import { RouteProvider } from './providers/route-provider'
import App from './App'
import './styles/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <RouteProvider>
          <App />
        </RouteProvider>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
)
