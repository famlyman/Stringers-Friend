// Vercel Node.js 18+ includes native fetch
// Only import node-fetch if needed for older runtimes

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, title, message, data } = req.body;

  if (!playerId || !title || !message) {
    return res.status(400).json({ error: "Missing required fields: playerId, title, message" });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;

  console.log('[OneSignal] Sending notification debug:', { 
    playerId, 
    appId: appId?.substring(0, 8) + '...',
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPrefix: apiKey ? (apiKey.startsWith('os_v2_') ? 'os_v2_...' : 'Legacy/Other') : 'None'
  });

  if (!apiKey) {
    console.error('[OneSignal] API key not configured');
    return res.status(500).json({ error: "OneSignal API key not configured" });
  }

  if (!appId) {
    console.error('[OneSignal] App ID not configured');
    return res.status(500).json({ error: "OneSignal App ID not configured" });
  }

  try {
    // Determine auth prefix - newer keys use 'Key', older use 'Basic'
    // OneSignal recommends 'Key' for api.onesignal.com
    const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;
    
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        data: data || {},
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[OneSignal] API error:", result);
      return res.status(response.status).json({ error: result.errors || "OneSignal API error" });
    }

    return res.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error("[OneSignal] Send notification error:", error);
    return res.status(500).json({ error: error.message });
  }
}
