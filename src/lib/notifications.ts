// OneSignal notification utilities

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export async function sendNotification(playerId: string, title: string, message: string, data?: Record<string, any>) {
  if (!playerId) {
    console.error('No player ID provided for notification');
    return { error: 'No player ID' };
  }
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, title, message, data }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { error };
  }
}

// Get OneSignal player ID for current user (call after user subscribes)
export async function getOneSignalPlayerId(): Promise<string | null> {
  const win = window as any;
  
  return new Promise((resolve) => {
    if (win.OneSignalDeferred) {
      win.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const userId = await OneSignal.getUserId();
          resolve(userId);
        } catch {
          resolve(null);
        }
      });
    } else if (win.OneSignal) {
      (async () => {
        try {
          const userId = await win.OneSignal.getUserId();
          resolve(userId);
        } catch {
          resolve(null);
        }
      })();
    } else {
      resolve(null);
    }
  });
}

// Trigger OneSignal prompt to subscribe user
export async function requestPushSubscription() {
  const win = window as any;
  
  if (win.OneSignalDeferred) {
    win.OneSignalDeferred.push(async (OneSignal: any) => {
      if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) {
        await OneSignal.Slidedown.promptPush();
      }
    });
  } else if (win.OneSignal?.Slidedown?.promptPush) {
    await win.OneSignal.Slidedown.promptPush();
  }
}