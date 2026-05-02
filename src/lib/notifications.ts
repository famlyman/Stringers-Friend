// OneSignal notification utilities

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export async function sendNotification(playerId: string, title: string, message: string, data?: Record<string, any>) {
  if (!playerId) {
    console.error('No player ID provided for notification');
    return { error: 'No player ID' };
  }

  // Check if we are trying to notify ourselves (current device)
  const currentDevicePlayerId = await getOneSignalPlayerId();
  if (playerId === currentDevicePlayerId) {
    console.log('[OneSignal] Skipping notification to current device (self-notification)');
    return { success: true, skipped: 'self' };
  }

  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, title, message, data }),
    });
    const result = await response.json();
    console.log('[OneSignal] Notification send result:', result);
    return result;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { error };
  }
}

// Get OneSignal player ID for current user (call after user subscribes)
export async function getOneSignalPlayerId(): Promise<string | null> {
  const win = window as any;
  
  return new Promise((resolve) => {
    const handleOneSignal = (OneSignal: any) => {
      try {
        // v16 approach: OneSignal.User.PushSubscription.id
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (subscriptionId) {
          console.log('[OneSignal] Found subscription ID:', subscriptionId);
          resolve(subscriptionId);
          return;
        }

        // Fallback for transition or if not yet available
        // In v16, getUserId is deprecated but might still exist as an alias
        if (typeof OneSignal.getUserId === 'function') {
          OneSignal.getUserId().then((id: string) => resolve(id)).catch(() => resolve(null));
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('[OneSignal] Error getting player ID:', error);
        resolve(null);
      }
    };

    if (win.OneSignalDeferred) {
      win.OneSignalDeferred.push(handleOneSignal);
    } else if (win.OneSignal) {
      handleOneSignal(win.OneSignal);
    } else {
      resolve(null);
    }
  });
}

// Register a listener for subscription changes
export function setupOneSignalListeners(onSubscriptionChange: (playerId: string | null) => void) {
  const win = window as any;
  
  const registerListener = (OneSignal: any) => {
    try {
      // v16 listener for subscription changes
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
          console.log('[OneSignal] Subscription changed:', event.current);
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
        // In v16, Slidedown is the preferred way for soft prompts
        if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) {
          await OneSignal.Slidedown.promptPush();
        } else if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
          // Alternative: native prompt
          await OneSignal.Notifications.requestPermission();
        }
        resolve();
      } catch (error) {
        console.error('[OneSignal] Error requesting subscription:', error);
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