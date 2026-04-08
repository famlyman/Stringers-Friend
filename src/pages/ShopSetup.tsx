import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
      const { data: existingShops, error: slugError } = await supabase
        .from('shops')
        .select('id')
        .eq('slug', slug.toLowerCase());

      if (slugError) throw slugError;

      if (existingShops && existingShops.length > 0) {
        setError("This URL handle is already taken. Please choose another one.");
        setLoading(false);
        return;
      }

      const qrCode = slug.toLowerCase();

      // Create shop in Supabase
      const { data: newShop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name,
          slug: slug.toLowerCase(),
          address,
          phone,
          owner_id: user.id,
          qr_code: qrCode,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // Update user profile with shop_id
      console.log('ShopSetup - updating profile with shop_id:', newShop.id);
      console.log('ShopSetup - user object:', user);
      console.log('ShopSetup - user.uid:', user.uid);
      console.log('ShopSetup - user.id:', user.id);
      
      console.log('ShopSetup - attempting profile update...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ shop_id: newShop.id })
        .eq('id', user.id);

      console.log('ShopSetup - profile update result:', { error: profileError });
      
      if (profileError) {
        console.error('ShopSetup - profile update failed:', profileError);
        throw profileError;
      }

      console.log('ShopSetup - profile update successful, navigating to dashboard...');
      navigate("/");
      console.log('ShopSetup - navigate() called');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create shop");
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
