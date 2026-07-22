import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

const PushNotificationManager = ({ tenantSlug }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Erro ao checar assinatura Push:', err);
    }
  };

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

  const handleSubscribe = async () => {
    try {
      // 1. Pedir permissão
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você precisa permitir notificações no navegador para receber lembretes.');
        return;
      }

      // 2. Obter VAPID key pública do backend
      const { publicKey } = await api.request('/notifications/vapid-public-key');
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      // 3. Registrar Service Worker se não estiver
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 4. Assinar Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 5. Enviar pro backend
      await api.request('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription })
      });

      setSubscribed(true);
    } catch (err) {
      console.error('Erro ao assinar notificações:', err);
      alert('Erro ao ativar notificações. Tente novamente mais tarde.');
    }
  };

  if (!isSupported || subscribed) return null;

  return (
    <div className="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-center justify-between mb-4 shadow-sm animate-fade-in-up">
      <div className="flex-1 pr-4">
        <h4 className="font-bold text-sm mb-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          Ativar Lembretes
        </h4>
        <p className="text-xs opacity-90">Receba um aviso no celular 24h e 2h antes do seu horário!</p>
      </div>
      <button 
        onClick={handleSubscribe}
        className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-transform"
      >
        Ativar
      </button>
    </div>
  );
};

export default PushNotificationManager;
