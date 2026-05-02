// Vercel Node.js 18+ includes native fetch
// Only import node-fetch if needed for older runtimes

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, playerIds, title, message, data } = req.body;
  
  // Normalize to an array of IDs
  const targetIds = playerIds || (playerId ? [playerId] : []);

  if (targetIds.length === 0 || !title || !message) {
    return res.status(400).json({ error: "Missing required fields: target IDs, title, or message" });
  }

  const apiKey = process.env.ONESIGNAL_API_AUTHENTICATION_KEY || process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;

  if (!apiKey || !appId) {
    return res.status(500).json({ error: "OneSignal configuration missing" });
  }

  try {
    const authHeader = `Key ${apiKey}`;
    
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: targetIds,
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
