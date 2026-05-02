// OneSignal notification utilities

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export async function sendNotification(playerIdOrIds: string | string[], title: string, message: string, data?: Record<string, any>) {
  const playerIds = Array.isArray(playerIdOrIds) ? playerIdOrIds : [playerIdOrIds];
  
  if (playerIds.length === 0) return { error: 'No player IDs' };

  // Get current device to skip self-notification
  let currentDevicePlayerId = null;
  try {
    const win = window as any;
    currentDevicePlayerId = win.OneSignal?.User?.PushSubscription?.id || null;
  } catch (e) {}
  
  // Filter out the current device
  const targetIds = playerIds.filter(id => id && id !== currentDevicePlayerId);

  if (targetIds.length === 0) return { success: true, skipped: 'self' };

  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        playerIds: targetIds, 
        title, 
        message, 
        data 
      }),
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
    // Set a safety timeout of 2 seconds
    const timeout = setTimeout(() => resolve(null), 2000);

    const handleOneSignal = (OneSignal: any) => {
      try {
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (subscriptionId) {
          clearTimeout(timeout);
          resolve(subscriptionId);
          return;
        }

        if (typeof OneSignal.getUserId === 'function') {
          OneSignal.getUserId().then((id: string) => {
            clearTimeout(timeout);
            resolve(id);
          }).catch(() => {
            clearTimeout(timeout);
            resolve(null);
          });
        }
      } catch (error) {
        clearTimeout(timeout);
        resolve(null);
      }
    };

    if (win.OneSignalDeferred) {
      win.OneSignalDeferred.push(handleOneSignal);
    } else if (win.OneSignal) {
      handleOneSignal(win.OneSignal);
    } else {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// Register a listener for subscription changes
export function setupOneSignalListeners(onSubscriptionChange: (playerId: string | null) => void) {
  const win = window as any;
  
  const registerListener = (OneSignal: any) => {
    try {
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
          if (event.current.optedIn && event.current.id) {
            onSubscriptionChange(event.current.id);
          } else {
            onSubscriptionChange(null);
          }
        });
      }
    } catch (error) {
      console.error('[OneSignal] Error setting up listeners:', error);
    }
  };

  if (win.OneSignalDeferred) {
    win.OneSignalDeferred.push(registerListener);
  } else if (win.OneSignal) {
    registerListener(win.OneSignal);
  }
}

// Trigger OneSignal prompt to subscribe user
export async function requestPushSubscription() {
  const win = window as any;
  
  return new Promise<void>((resolve) => {
    const triggerPrompt = async (OneSignal: any) => {
      try {
        if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) {
          await OneSignal.Slidedown.promptPush();
        } else if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
          await OneSignal.Notifications.requestPermission();
        }
        resolve();
      } catch (error) {
        resolve();
      }
    };

    if (win.OneSignalDeferred) {
      win.OneSignalDeferred.push(triggerPrompt);
    } else if (win.OneSignal) {
      triggerPrompt(win.OneSignal);
    } else {
      resolve();
    }
  });
}