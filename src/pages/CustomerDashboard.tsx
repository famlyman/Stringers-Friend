import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, CreditCard, Package, X, Users, Bell, BellDot, Plus } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  limit,
  setDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Save, Edit2 } from "lucide-react";

export default function CustomerDashboard({ user }: { user: any }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'racquets' | 'profile'>('jobs');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddRacquetModal, setShowAddRacquetModal] = useState(false);
  const [selectedRacquet, setSelectedRacquet] = useState<any>(null);
  const [newRacquetData, setNewRacquetData] = useState({
    brand: '',
    model: '',
    serial_number: '',
    head_size: '100',
    string_pattern_mains: '16',
    string_pattern_crosses: '19'
  });
  const [requestData, setRequestData] = useState({
    string_main: '',
    string_cross: '',
    tension_main: '',
    tension_cross: '',
    notes: ''
  });

  useEffect(() => {
    if (!user || !user.email) return;

    // Fetch Jobs
    const qJobs = query(
      collection(db, "jobs"), 
      where("customer_email", "==", user.email),
      orderBy("created_at", "desc")
    );

    const unsubscribeJobs = onSnapshot(qJobs, (snapshot) => {
      const jobList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "jobs");
    });

    // Fetch Racquets
    // Note: We'll query by customer_email since customer_id might be shop-specific
    const qRacquets = query(
      collection(db, "racquets"),
      where("customer_email", "==", user.email)
    );

    const unsubscribeRacquets = onSnapshot(qRacquets, (snapshot) => {
      const racquetList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRacquets(racquetList);
      setLoading(false);
    }, (error) => {
      // If customer_email index doesn't exist yet, it might fail. 
      // In a real app, we'd ensure the index is created.
      console.error("Error fetching racquets:", error);
      setLoading(false);
    });

    // Fetch Customer Info
    const qCustomer = query(
      collection(db, "customers"),
      where("email", "==", user.email)
    );

    const unsubscribeCustomer = onSnapshot(qCustomer, async (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setCustomerInfo({
          id: snapshot.docs[0].id,
          ...data
        });
        setEditName(data.name || "");
        setEditPhone(data.phone || "");
      } else {
        // Create customer record if it doesn't exist
        try {
          // Get the first shop to associate with
          const shopsSnap = await getDocs(query(collection(db, "shops"), limit(1)));
          if (!shopsSnap.empty) {
            const shopId = shopsSnap.docs[0].id;
            const newCustomerId = `cust_${Date.now()}`;
            const newCustomer = {
              id: newCustomerId,
              uid: user.uid,
              shop_id: shopId,
              name: user.email?.split('@')[0] || "New Customer",
              email: user.email,
              phone: "",
              created_at: new Date().toISOString()
            };
            await setDoc(doc(db, "customers", newCustomerId), newCustomer);
            // The onSnapshot will fire again with the new document
          }
        } catch (error) {
          console.error("Error creating customer record:", error);
        }
      }
    });

    // Fetch Notifications
    const qNotifications = query(
      collection(db, "notifications"),
      where("customer_email", "==", user.email),
      orderBy("created_at", "desc")
    );

    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const notificationList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationList);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeRacquets();
      unsubscribeCustomer();
      unsubscribeNotifications();
    };
  }, [user.email]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRacquet || !user.email) return;

    try {
      const newJob = {
        customer_id: selectedRacquet.customer_id,
        customer_email: user.email,
        shop_id: selectedRacquet.shop_id,
        racquet_id: selectedRacquet.id,
        brand: selectedRacquet.brand,
        model: selectedRacquet.model,
        string_main: requestData.string_main,
        string_cross: requestData.string_cross || requestData.string_main,
        tension_main: Number(requestData.tension_main),
        tension_cross: Number(requestData.tension_cross || requestData.tension_main),
        notes: requestData.notes,
        status: 'pending',
        payment_status: 'unpaid',
        price: 0, // To be set by shop
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const jobDoc = await addDoc(collection(db, "jobs"), newJob);

      // Create message for shop
      await addDoc(collection(db, "messages"), {
        shop_id: selectedRacquet.shop_id,
        customer_id: selectedRacquet.customer_id,
        customer_email: user.email,
        customer_name: customerInfo?.name || user.email?.split('@')[0],
        title: "New Stringing Request",
        message: `A new stringing request has been submitted for a ${selectedRacquet.brand} ${selectedRacquet.model}.`,
        job_id: jobDoc.id,
        read: false,
        created_at: new Date().toISOString()
      });

      setShowRequestModal(false);
      setSelectedRacquet(null);
      setRequestData({
        string_main: '',
        string_cross: '',
        tension_main: '',
        tension_cross: '',
        notes: ''
      });
      setActiveTab('jobs');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "jobs");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customerInfo?.id) {
      console.error("No customer ID found for update");
      return;
    }

    try {
      await updateDoc(doc(db, "customers", customerInfo.id), {
        name: editName,
        phone: editPhone,
        updated_at: new Date().toISOString()
      });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "customers");
    }
  };

  const handleAddRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo?.id || !user.email) return;

    try {
      const racquetId = `racq_${Date.now()}`;
      const newRacquet = {
        id: racquetId,
        customer_id: customerInfo.id,
        customer_email: user.email,
        shop_id: customerInfo.shop_id,
        brand: newRacquetData.brand,
        model: newRacquetData.model,
        serial_number: newRacquetData.serial_number,
        head_size: Number(newRacquetData.head_size),
        string_pattern_mains: Number(newRacquetData.string_pattern_mains),
        string_pattern_crosses: Number(newRacquetData.string_pattern_crosses),
        current_string_main: "Not strung yet",
        current_string_cross: "Not strung yet",
        current_tension_main: 0,
        current_tension_cross: 0,
        qr_code: `racquet_${racquetId}`,
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, "racquets", racquetId), newRacquet);
      setShowAddRacquetModal(false);
      setNewRacquetData({
        brand: '',
        model: '',
        serial_number: '',
        head_size: '100',
        string_pattern_mains: '16',
        string_pattern_crosses: '19'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "racquets");
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-8 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Welcome back!</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage your racquets and track your stringing jobs.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all relative"
            >
              {unreadCount > 0 ? (
                <BellDot className="w-6 h-6 text-primary animate-pulse" />
              ) : (
                <Bell className="w-6 h-6 text-neutral-400" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-800">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <h3 className="font-bold text-primary">Notifications</h3>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-neutral-400 hover:text-primary"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${!n.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                        onClick={() => {
                          markAsRead(n.id);
                          setActiveTab('jobs');
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-bold ${!n.read ? 'text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}>{n.title}</p>
                          {!n.read && <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2">{n.message}</p>
                        <p className="text-[10px] text-neutral-400">{safeFormatDate(n.created_at, 'MMM d, h:mm a')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex">
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'jobs' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
          >
            My Jobs
          </button>
          <button 
            onClick={() => setActiveTab('racquets')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'racquets' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
          >
            My Bag
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
          >
            Profile
          </button>
        </div>
      </div>
    </div>
      {activeTab === 'jobs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-primary">{job.brand} {job.model}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Job #{job.id.slice(0, 8)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  job.status === 'completed' ? 'bg-accent/20 text-green-700 dark:text-green-400' :
                  job.status === 'in-progress' ? 'bg-primary/10 text-primary dark:bg-primary/20' :
                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-secondary/20 text-neutral-700 dark:text-neutral-300'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <Clock className="w-4 h-4 mr-2 text-neutral-400 dark:text-neutral-500" />
                  <span>Dropped off: {safeFormatDate(job.created_at, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <Package className="w-4 h-4 mr-2 text-neutral-400 dark:text-neutral-500" />
                  <span>{job.string_main} / {job.string_cross} @ {job.tension_main}lbs</span>
                </div>
                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CreditCard className="w-4 h-4 mr-2 text-neutral-400 dark:text-neutral-500" />
                  <span className={job.payment_status === 'paid' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                    {job.payment_status === 'paid' ? 'Paid' : `Unpaid - $${job.price}`}
                  </span>
                </div>
              </div>

              {job.status === 'completed' && job.payment_status === 'unpaid' && (
                <button className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                  Pay Now
                </button>
              )}
            </div>
          ))}

          {jobs.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
              <Clock className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">No active jobs found for your account.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'racquets' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">My Racquets</h2>
            <button 
              onClick={() => setShowAddRacquetModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Racquet
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {racquets.map((racquet) => (
            <div key={racquet.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-primary">{racquet.brand} {racquet.model}</h3>
                  <p className="text-[10px] text-neutral-400 font-mono uppercase">SN: {racquet.serial_number || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 text-center">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Head Size</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{racquet.head_size} sq in</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 text-center">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Pattern</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{racquet.string_pattern_mains}x{racquet.string_pattern_crosses}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Current Setup</p>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">
                    <p className="font-medium">{racquet.current_string_main} / {racquet.current_string_cross}</p>
                    <p className="text-primary font-bold">{racquet.current_tension_main} / {racquet.current_tension_cross} lbs</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setSelectedRacquet(racquet);
                    setRequestData({
                      ...requestData,
                      string_main: racquet.current_string_main || '',
                      string_cross: racquet.current_string_cross || '',
                      tension_main: racquet.current_tension_main?.toString() || '',
                      tension_cross: racquet.current_tension_cross?.toString() || ''
                    });
                    setShowRequestModal(true);
                  }}
                  className="w-full bg-primary/10 text-primary py-2 rounded-xl font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Request Stringing
                </button>
              </div>
            </div>
          ))}

          {racquets.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
              <Package className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">No racquets found in your bag.</p>
              <p className="text-xs text-neutral-400 mt-2">Add your first racquet to get started!</p>
              <button 
                onClick={() => setShowAddRacquetModal(true)}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add My First Racquet
              </button>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <div>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-2xl font-bold text-primary bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-1 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-primary">{customerInfo?.name || user.email?.split('@')[0]}</h2>
                  )}
                  <p className="text-neutral-500">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => isEditingProfile ? handleProfileUpdate({ preventDefault: () => {} } as any) : setIsEditingProfile(true)}
                className={`p-3 rounded-full transition-all ${isEditingProfile ? 'bg-primary text-white hover:bg-primary/90' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'}`}
              >
                {isEditingProfile ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Phone Number</p>
                {isEditingProfile ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-neutral-900 dark:text-white font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-neutral-900 dark:text-white font-medium">{customerInfo?.phone || 'Not provided'}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Member Since</p>
                <p className="text-neutral-900 dark:text-white font-medium">{safeFormatDate(user.metadata?.creationTime, 'MMMM d, yyyy')}</p>
              </div>
            </div>

            {isEditingProfile && (
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={handleProfileUpdate}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button 
                  onClick={() => {
                    setIsEditingProfile(false);
                    setEditName(customerInfo?.name || "");
                    setEditPhone(customerInfo?.phone || "");
                  }}
                  className="px-6 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-2xl p-6">
            <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Account Connected
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your account is linked to your email address. Your stringer uses this email to associate your racquets and jobs with your portal.
            </p>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-primary">Request Stringing</h2>
                <p className="text-sm text-neutral-500">{selectedRacquet?.brand} {selectedRacquet?.model}</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Main String</label>
                  <input
                    type="text"
                    required
                    value={requestData.string_main}
                    onChange={(e) => setRequestData({...requestData, string_main: e.target.value})}
                    placeholder="e.g. RPM Blast"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cross String</label>
                  <input
                    type="text"
                    value={requestData.string_cross}
                    onChange={(e) => setRequestData({...requestData, string_cross: e.target.value})}
                    placeholder="Same as main"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Main Tension (lbs)</label>
                  <input
                    type="number"
                    required
                    value={requestData.tension_main}
                    onChange={(e) => setRequestData({...requestData, tension_main: e.target.value})}
                    placeholder="52"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cross Tension (lbs)</label>
                  <input
                    type="number"
                    value={requestData.tension_cross}
                    onChange={(e) => setRequestData({...requestData, tension_cross: e.target.value})}
                    placeholder="Same as main"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notes / Special Requests</label>
                <textarea
                  value={requestData.notes}
                  onChange={(e) => setRequestData({...requestData, notes: e.target.value})}
                  placeholder="e.g. Pre-stretch, stencil, etc."
                  className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm min-h-[80px]"
                />
              </div>

              <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Racquet Modal */}
      {showAddRacquetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setShowAddRacquetModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>

            <h2 className="text-2xl font-bold text-primary mb-6">Add New Racquet</h2>
            
            <form onSubmit={handleAddRacquet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Brand</label>
                  <input
                    type="text"
                    required
                    value={newRacquetData.brand}
                    onChange={(e) => setNewRacquetData({...newRacquetData, brand: e.target.value})}
                    placeholder="e.g. Wilson"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Model</label>
                  <input
                    type="text"
                    required
                    value={newRacquetData.model}
                    onChange={(e) => setNewRacquetData({...newRacquetData, model: e.target.value})}
                    placeholder="e.g. Pro Staff 97"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={newRacquetData.serial_number}
                  onChange={(e) => setNewRacquetData({...newRacquetData, serial_number: e.target.value})}
                  placeholder="Found on throat or handle"
                  className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Head Size (sq in)</label>
                <input
                  type="number"
                  required
                  value={newRacquetData.head_size}
                  onChange={(e) => setNewRacquetData({...newRacquetData, head_size: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mains</label>
                  <input
                    type="number"
                    required
                    value={newRacquetData.string_pattern_mains}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_pattern_mains: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Crosses</label>
                  <input
                    type="number"
                    required
                    value={newRacquetData.string_pattern_crosses}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_pattern_crosses: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4">
                Add Racquet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
