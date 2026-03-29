import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, query, collection, where, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("stringer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role
      });

      // If role is customer, link to existing customer records across all shops
      if (role === "customer") {
        const q = query(collection(db, "customers"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        
        for (const customerDoc of querySnapshot.docs) {
          const customerId = customerDoc.id;
          // Link customer doc
          await updateDoc(doc(db, "customers", customerId), { uid: user.uid });
          
          // Link racquets
          const qRacq = query(collection(db, "racquets"), where("customer_id", "==", customerId));
          const racqSnap = await getDocs(qRacq);
          for (const rDoc of racqSnap.docs) {
            if (!rDoc.data().customer_email) {
              await updateDoc(doc(db, "racquets", rDoc.id), { customer_email: user.email });
            }
          }

          // Link jobs
          const qJobs = query(collection(db, "jobs"), where("customer_id", "==", customerId));
          const jobsSnap = await getDocs(qJobs);
          for (const jDoc of jobsSnap.docs) {
            if (!jDoc.data().customer_email) {
              await updateDoc(doc(db, "jobs", jDoc.id), { customer_email: user.email });
            }
          }
        }
      }

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/20 -rotate-3">
            <span className="text-2xl font-bold text-secondary">SP</span>
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Create Account</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Join StringerPro today</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("stringer")}
                disabled={loading}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  role === "stringer"
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:border-primary/50"
                }`}
              >
                Racquet Stringer
              </button>
              <button
                type="button"
                onClick={() => setRole("customer")}
                disabled={loading}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  role === "customer"
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:border-primary/50"
                }`}
              >
                Customer
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
