import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Crown, AlertTriangle } from 'lucide-react';

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
              pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 duration-300
              ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-900' : 'bg-white border-rose-100 text-rose-900'}
            `}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-rose-500 shrink-0" size={20} />
            )}
            <p className="text-xs font-black uppercase tracking-tight">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => confirmState.resolve(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Crown className="text-accent w-8 h-8 opacity-20 absolute" />
                <AlertTriangle className="text-slate-900 w-8 h-8 relative z-10" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                {confirmState.title}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                {confirmState.message}
              </p>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => confirmState.resolve(false)}
                className="flex-1 px-6 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmState.resolve(true)}
                className="flex-1 px-6 py-4 rounded-xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
