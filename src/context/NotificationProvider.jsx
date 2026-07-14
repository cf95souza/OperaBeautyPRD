import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Crown, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const showSuccess = (msg) => showToast(msg, 'success');
  const showError = (msg) => showToast(msg, 'error');

  const confirm = useCallback((message, title = 'Confirmação') => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        resolve: (value) => {
          setConfirmState(null);
          resolve(value);
        }
      });
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-card border animate-in slide-in-from-right-10 duration-300
              ${toast.type === 'success' ? 'bg-surface border-primary-fixed text-on-surface' : 'bg-error-container border-error text-on-error-container'}
            `}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-primary shrink-0" size={20} />
            ) : (
               <AlertCircle className="text-error shrink-0" size={20} />
            )}
            <p className="text-label-md">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 text-outline hover:text-on-surface transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => confirmState.resolve(false)} />
          <div className="relative bg-surface w-full max-w-[384px] rounded-3xl shadow-premium border border-outline-variant overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-surface-container-low border border-outline-variant rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-primary w-8 h-8 relative z-10" />
              </div>
              
              <h3 className="text-headline-md font-serif text-primary">
                {confirmState.title}
              </h3>
              <p className="text-body-md text-on-surface-variant px-4">
                {confirmState.message}
              </p>
            </div>
            
            <div className="p-6 bg-surface-container border-t border-outline-variant flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => confirmState.resolve(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={() => confirmState.resolve(true)}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
