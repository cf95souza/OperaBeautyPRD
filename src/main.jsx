import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Atualização Automática do PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Quando detecta nova versão, notifica o usuário
    if (confirm('✨ Uma nova versão do sistema está disponível! Clique em OK para atualizar e corrigir problemas.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline');
  },
});

// Verifica silenciosamente se há novas versões a cada 30 minutos (evita recarregar na cara do usuário)
setInterval(() => {
  if (updateSW) updateSW(false); // apenas checa, não recarrega sozinho
}, 30 * 60 * 1000);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
