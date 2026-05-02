import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

console.log("Server starting with Supabase (Firebase removed)");

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), vercel: !!process.env.VERCEL });
});

app.post("/api/send-notification", async (req, res) => {
  try {
    const { playerId, playerIds, title, message, data } = req.body;

    // Normalize to an array of IDs
    const targetIds = playerIds || (playerId ? [playerId] : []);

    if (targetIds.length === 0 || !title || !message) {
      return res.status(400).json({ error: "Missing required fields: target IDs, title, or message" });
    }

    const apiKey = process.env.ONESIGNAL_API_AUTHENTICATION_KEY || process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;

    console.log('[OneSignal] Sending notification:', { 
      targetCount: targetIds.length,
      title, 
      appId: appId?.substring(0, 8) + '...',
      apiKeySource: process.env.ONESIGNAL_API_AUTHENTICATION_KEY ? 'AUTHENTICATION_KEY' : (process.env.ONESIGNAL_REST_API_KEY ? 'REST_API_KEY' : 'None')
    });

    if (!apiKey) {
      console.error('[OneSignal] API key not configured');
      return res.status(500).json({ error: "OneSignal API key not configured" });
    }

    if (!appId) {
      console.error('[OneSignal] App ID not configured');
      return res.status(500).json({ error: "OneSignal App ID not configured" });
    }

    // OneSignal documentation specifies 'Key <key>' for the REST API
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
      console.error("OneSignal API error:", result);
      return res.status(response.status).json({ error: result.errors || "OneSignal API error" });
    }

    res.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error("Send notification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Global error handler for Express (MUST be after routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error Catch-all:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  const PORT = 3000;

  // ONLY run Vite or static serving if NOT on Vercel
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving (for non-Vercel environments)
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production") {
  startServer();
} else if (!process.env.VERCEL) {
  // In production but not on Vercel (e.g. a regular VPS or container)
  startServer();
}
