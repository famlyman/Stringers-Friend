import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { v4 as uuidv4 } from "uuid";

export default function ShopSetup({ user }: { user: any }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic slug validation
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.");
      setLoading(false);
      return;
    }

    try {
      // Check if slug is unique
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const slugQuery = query(collection(db, "shops"), where("slug", "==", slug.toLowerCase()));
      const slugSnapshot = await getDocs(slugQuery);

      if (!slugSnapshot.empty) {
        setError("This URL handle is already taken. Please choose another one.");
        setLoading(false);
        return;
      }

      const shopId = uuidv4();
      const qrCode = `shop_${shopId}`;

      // Create shop in Firestore
      await setDoc(doc(db, "shops", shopId), {
        id: shopId,
        name,
        slug: slug.toLowerCase(),
        address,
        phone,
        owner_id: user.uid,
        qr_code: qrCode,
        created_at: new Date().toISOString()
      });

      // Update user profile with shop_id
      await updateDoc(doc(db, "users", user.uid), {
        shop_id: shopId
      });

      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Setup Your Shop</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Tell us about your racquet stringing business</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Shop Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="e.g. Ace Racquet Services"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Custom URL Handle (Slug)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">stringersfriend.com/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="w-full pl-[145px] pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="e.g. ace-racquets"
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 ml-1">This will be your unique handle for customers to find you.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Business Address</label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none h-24 resize-none"
              placeholder="Where can customers find you?"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="(555) 000-0000"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating Shop..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
