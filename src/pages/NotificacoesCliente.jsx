import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';

const NotificacoesCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate(`/${tenant_slug}/login`);
      return;
    }
    
    fetchNotifications();
  }, [session, navigate, tenant_slug]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.request('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.request(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearRead = async () => {
    try {
      await api.request('/notifications/read', { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-surface-variant/30 text-on-surface rounded-full active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            Notificações
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-container-margin py-lg animate-fade-in-up">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-secondary">
            <span className="material-symbols-outlined text-[64px] mb-4 opacity-50">notifications_off</span>
            <p className="text-lg font-medium">Nenhuma notificação</p>
            <p className="text-sm mt-2">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              {notifications.some(n => n.is_read) && (
                <button 
                  onClick={handleClearRead}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Limpar lidas
                </button>
              )}
            </div>
            
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-xl shadow-sm border ${notif.is_read ? 'bg-surface-variant/20 border-outline-variant/30' : 'bg-surface-container-lowest border-primary/30'} flex gap-4`}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-surface-variant text-secondary' : 'bg-primary-container text-primary'}`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {notif.title.includes('Aniversário') ? 'cake' : notif.title.includes('Retoque') ? 'auto_awesome' : 'calendar_clock'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-sm ${notif.is_read ? 'text-secondary' : 'text-on-surface'}`}>{notif.title}</h3>
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-error inline-block"></span>}
                  </div>
                  <p className={`text-sm mb-2 ${notif.is_read ? 'text-secondary/70' : 'text-on-surface/80'}`}>{notif.body}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">
                    {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificacoesCliente;
