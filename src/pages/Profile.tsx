import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { User, Mail, Phone, Lock, Store, Save, AlertCircle, CheckCircle2, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface ProfileProps {
  user: any;
}

export default function Profile({ user }: ProfileProps) {
  const { darkMode, toggleDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User Profile State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Shop State (for stringers)
  const [shopData, setShopData] = useState<any>(null);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch User Data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");

        // Fetch Shop Data if stringer
        if (data.role === 'stringer' && data.shop_id) {
          const shopDoc = await getDoc(doc(db, "shops", data.shop_id));
          if (shopDoc.exists()) {
            const sData = shopDoc.data();
            setShopData(sData);
            setShopName(sData.name || "");
            setShopAddress(sData.address || "");
            setShopPhone(sData.phone || "");
            setShopSlug(sData.slug || "");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update Firestore User
      await updateDoc(doc(db, "users", user.uid), {
        name,
        phone,
      });

      // If customer, sync with customers collection
      if (user.role === 'customer') {
        const { collection, query, where, getDocs, writeBatch } = await import("firebase/firestore");
        const q = query(collection(db, "customers"), where("email", "==", auth.currentUser?.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => {
            batch.update(d.ref, { name, phone });
          });
          await batch.commit();
        }
      }

      // Update Email in Auth if changed
      if (email !== auth.currentUser?.email) {
        // This might require re-authentication
        try {
          await updateEmail(auth.currentUser!, email);
          await updateDoc(doc(db, "users", user.uid), { email });
        } catch (authErr: any) {
          if (authErr.code === 'auth/requires-recent-login') {
            setError("Email update requires a recent login. Please logout and login again to update your email.");
            setSaving(false);
            return;
          }
          throw authErr;
        }
      }

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.shop_id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateDoc(doc(db, "shops", user.shop_id), {
        name: shopName,
        address: shopAddress,
        phone: shopPhone,
      });
      setSuccess("Shop information updated successfully!");
    } catch (err: any) {
      console.error("Error updating shop:", err);
      setError(err.message || "Failed to update shop info.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      
      // Update password
      await updatePassword(auth.currentUser!, newPassword);
      
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === 'auth/wrong-password') {
        setError("Current password is incorrect.");
      } else {
        setError(err.message || "Failed to change password.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setError(null);

    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      const batch = writeBatch(db);

      // 1. Delete User document
      batch.delete(doc(db, "users", user.uid));

      // 2. If stringer, delete shop
      if (user.role === 'stringer' && user.shop_id) {
        batch.delete(doc(db, "shops", user.shop_id));
        
        // Also delete their inventory
        const inventorySnap = await getDocs(query(collection(db, "inventory"), where("shop_id", "==", user.shop_id)));
        inventorySnap.docs.forEach(d => batch.delete(d.ref));

        // And their customers, racquets, jobs? 
        // For a full account deletion, we should probably clean up everything.
        const customersSnap = await getDocs(query(collection(db, "customers"), where("shop_id", "==", user.shop_id)));
        customersSnap.docs.forEach(d => batch.delete(d.ref));

        const racquetsSnap = await getDocs(query(collection(db, "racquets"), where("shop_id", "==", user.shop_id)));
        racquetsSnap.docs.forEach(d => batch.delete(d.ref));

        const jobsSnap = await getDocs(query(collection(db, "jobs"), where("shop_id", "==", user.shop_id)));
        jobsSnap.docs.forEach(d => batch.delete(d.ref));
      }

      // 3. If customer, delete customer records
      if (user.role === 'customer') {
        const customersSnap = await getDocs(query(collection(db, "customers"), where("uid", "==", user.uid)));
        customersSnap.docs.forEach(d => batch.delete(d.ref));
      }

      await batch.commit();

      // 4. Delete Auth User
      await deleteUser(auth.currentUser);
      
      // Redirect or sign out will happen automatically as user is deleted
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error deleting account:", err);
      if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Account deletion failed.");
      } else {
        setError(err.message || "Failed to delete account. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-neutral-500">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Profile Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage your account details and preferences.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-2xl text-green-600 dark:text-green-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-neutral-900 dark:text-white">Personal Information</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Your phone"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Your email"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 ml-1 italic">Changing your email will update your login credentials.</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>
            </form>
          </section>

          {/* Shop Information (Stringer Only) */}
          {user.role === 'stringer' && (
            <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-bold text-neutral-900 dark:text-white">Shop Information</h2>
              </div>
              <form onSubmit={handleUpdateShop} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Shop Name</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Shop name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Shop Phone</label>
                    <input
                      type="tel"
                      value={shopPhone}
                      onChange={(e) => setShopPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Shop phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Shop Address</label>
                  <textarea
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none"
                    placeholder="Shop address"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">Public URL</label>
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <span className="text-sm text-neutral-500 font-mono">stringersfriend.com/{shopSlug}</span>
                    <a 
                      href={`/${shopSlug}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      View Public Page
                    </a>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Shop Info
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        {/* Security / Password */}
        <div className="space-y-8">
          <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sun className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-neutral-900 dark:text-white">Appearance</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">Dark Mode</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Switch between light and dark themes.</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-primary' : 'bg-neutral-200'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-neutral-900 dark:text-white">Security</h2>
            </div>
            <div className="p-6 space-y-6">
              {!showPasswordForm ? (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Update your password to keep your account secure.
                  </p>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <section className="bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 p-6">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              Delete Account
            </button>
          </section>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-2xl font-bold tracking-tight">Delete Account?</h2>
            </div>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
              This action is <span className="font-bold text-neutral-900 dark:text-white underline decoration-red-500">permanent</span>. 
              All your data, including jobs, racquets, and shop information will be deleted forever.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 ml-1">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  placeholder="Your password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Delete Everything"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                  }}
                  className="px-6 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
