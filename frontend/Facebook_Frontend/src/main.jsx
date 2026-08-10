import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './contexts/ThemeContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.jsx'
import './styles/shadcn-bridge.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={250}>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
