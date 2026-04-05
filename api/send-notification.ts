import type { VercelRequest, VercelResponse } from '@vercel/node';

let firebaseAdminInstance: any = null;

async function getFirebaseAdmin() {
  try {
    const admin = await import("firebase-admin");
    const adminApp = admin.default || admin;

    if (adminApp.apps.length > 0) return adminApp;
    if (firebaseAdminInstance) return firebaseAdminInstance;

    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (parseError) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", parseError);
      return null;
    }
    
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!adminApp.apps.length) {
      adminApp.initializeApp({
        credential: adminApp.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    }
    firebaseAdminInstance = adminApp;
    return firebaseAdminInstance;
  } catch (error) {
    console.error("CRITICAL Error in getFirebaseAdmin:", error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("Received send-notification request (standalone)");
  try {
    const { token, title, body, data } = req.body;
    console.log("Request body:", JSON.stringify({ token: token ? token.substring(0, 10) + "..." : null, title, body, data }));

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const firebaseAdmin = await getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({ 
        error: "Firebase Admin not initialized", 
        details: "Check server logs for FIREBASE_SERVICE_ACCOUNT issues. Make sure the environment variable is set correctly in Vercel." 
      });
    }

    console.log(`Attempting to send notification to token: ${token.substring(0, 10)}...`);
    const message = {
      notification: { 
        title: title || "New Notification", 
        body: body || "You have a new update." 
      },
      token: token,
      data: data || {},
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log(`Successfully sent message: ${response}`);
    res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("CRITICAL Error in send-notification handler:", error);
    
    res.status(500).json({ 
      error: "Failed to send notification", 
      details: error.message,
      firebaseError: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
}
