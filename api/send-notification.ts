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
      return { error: "FIREBASE_SERVICE_ACCOUNT environment variable is missing in Vercel." };
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (parseError: any) {
      return { error: "FIREBASE_SERVICE_ACCOUNT is not valid JSON.", details: parseError.message };
    }
    
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!adminApp.apps.length) {
      adminApp.initializeApp({
        credential: adminApp.credential.cert(serviceAccount),
      });
    }
    firebaseAdminInstance = adminApp;
    return firebaseAdminInstance;
  } catch (error: any) {
    return { error: "Critical error during Firebase initialization.", details: error.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, data } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const firebaseAdmin = await getFirebaseAdmin();
    
    // If getFirebaseAdmin returned an error object instead of the admin instance
    if (firebaseAdmin && 'error' in firebaseAdmin) {
      return res.status(503).json(firebaseAdmin);
    }

    if (!firebaseAdmin) {
      return res.status(503).json({ error: "Firebase Admin failed to initialize for an unknown reason." });
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
