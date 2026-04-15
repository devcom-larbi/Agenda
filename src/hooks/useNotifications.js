import { useEffect, useState } from 'react';
import { parse, addMinutes, startOfDay } from 'date-fns';

async function showNotification(title, options) {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {}
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export function useNotifications(weekSchedule, settings = {}) {
  const [permission, setPermission] = useState('default');

  const {
    notifBlocksEnabled = true,
    notifAdvanceMinutes = 5,
    notifBilanEnabled = true,
    notifBilanHour = 20,
  } = settings;

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await showNotification('Notifications activées !', {
        body: `Je te préviendrai ${notifAdvanceMinutes} min avant tes événements.`,
        icon: '/pwa-icon.svg',
      });
    }
    return result === 'granted';
  };

  useEffect(() => {
    if (permission !== 'granted' || !weekSchedule) return;

    const interval = setInterval(async () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const currentDay = days[now.getDay()];
      const todaysBlocks = weekSchedule[currentDay] || [];

      // ── Option A : rappel avant chaque bloc ─────────────────────────
      if (notifBlocksEnabled) {
        for (const block of todaysBlocks) {
          if (block.isDone) continue;

          let timeStr = (block.time || '').replace('h', ':');
          if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
          if (timeStr.includes('→')) timeStr = timeStr.split('→')[0].trim();

          try {
            const blockDate = parse(timeStr, 'HH:mm', startOfDay(now));
            if (isNaN(blockDate.getTime())) continue;

            const notifyTime = addMinutes(blockDate, -notifAdvanceMinutes);
            if (h === notifyTime.getHours() && m === notifyTime.getMinutes()) {
              await showNotification("C'est bientôt l'heure !", {
                body: `Dans ${notifAdvanceMinutes} min : ${block.label}`,
                icon: '/pwa-icon.svg',
              });
            }
          } catch {}
        }
      }

      // ── Option B : bilan quotidien ───────────────────────────────────
      if (notifBilanEnabled && h === notifBilanHour && m === 0) {
        const totalBlocks = todaysBlocks.length;
        const doneBlocks = todaysBlocks.filter(b => b.isDone).length;
        const pending = totalBlocks - doneBlocks;

        if (totalBlocks > 0) {
          const msg = pending > 0
            ? `Tu as encore ${pending} bloc${pending > 1 ? 's' : ''} à valider pour aujourd'hui.`
            : 'Bravo ! Tous tes blocs du jour sont complétés.';
          await showNotification('Bilan de la journée', { body: msg, icon: '/pwa-icon.svg' });
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [permission, weekSchedule, notifBlocksEnabled, notifAdvanceMinutes, notifBilanEnabled, notifBilanHour]);

  return { permission, requestPermission };
}
