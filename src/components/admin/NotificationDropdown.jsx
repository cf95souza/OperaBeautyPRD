import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Verifica status da permissão atual
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const enablePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Seu navegador não suporta notificações push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        // Buscar a chave pública do servidor
        const { publicKey } = await api.notifications.getPublicKey();
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Enviar para o backend
        await api.notifications.subscribe(subscription);
        alert('Notificações ativadas com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao ativar push:', error);
      alert('Ocorreu um erro ao tentar ativar as notificações.');
    }
  };

  const handleClearRead = async () => {
    try {
      await api.notifications.clearRead();
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (err) {
      console.error('Erro ao limpar notificações lidas:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const hasRead = notifications.some(n => n.is_read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-secondary hover:opacity-80 transition-opacity relative p-2"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface shadow-lg rounded-xl border border-surface-variant overflow-hidden z-50 animate-fade-in-up">
          <div className="p-4 border-b border-surface-variant bg-surface flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Notificações</h3>
            <div className="flex items-center gap-3">
              {hasRead && (
                <button 
                  onClick={handleClearRead}
                  title="Limpar lidas"
                  className="text-tertiary hover:text-error transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                </button>
              )}
              {unreadCount > 0 && (
                <span className="bg-primary-container text-on-primary-container text-xs px-2 py-1 rounded-full font-bold">
                  {unreadCount} novas
                </span>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-secondary">
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-tertiary">
                <p>Nenhuma notificação por enquanto.</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-variant">
                {notifications.map((notif) => (
                  <li 
                    key={notif.id} 
                    className={`p-4 transition-colors ${notif.is_read ? 'opacity-60 bg-surface' : 'bg-primary/5 hover:bg-primary/10 cursor-pointer'}`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-primary mt-1 shrink-0">
                        {notif.title.includes('Agendamento') ? 'calendar_month' : 'info'}
                      </span>
                      <div>
                        <h4 className="font-label-md text-label-md text-on-surface mb-1">{notif.title}</h4>
                        <p className="font-body-sm text-body-sm text-secondary line-clamp-2">{notif.body}</p>
                        <span className="text-[10px] text-tertiary mt-2 block">
                          {new Date(notif.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
            <div className="p-4 bg-surface-variant border-t border-surface-variant text-center">
              <p className="text-sm text-secondary mb-2">Fique por dentro de novos agendamentos.</p>
              <button 
                onClick={enablePushNotifications}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Ativar Notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
