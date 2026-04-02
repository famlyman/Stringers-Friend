import React, { useState, useEffect, useMemo, useRef } from "react";
import { Clock, CheckCircle2, CreditCard, Package, X, Users, Bell, BellDot, Plus, MessageSquare, Send, Search } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { useSearchParams } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  updateDoc,
  doc,
  getDocs,
  limit,
  setDoc,
  writeBatch,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, requestNotificationPermission } from "../lib/firebase";
import { Save, Edit2, ChevronDown } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { v4 as uuidv4 } from "uuid";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { racquetSpecsService } from "../services/racquetSpecsService";

export default function CustomerDashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: 'jobs' | 'racquets' | 'messages' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'racquets' | 'messages'>(
    (searchParams.get('tab') as any) || initialTab
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'jobs' || tab === 'racquets' || tab === 'messages')) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.uid) {
      requestNotificationPermission(user.uid);
    }
  }, [user?.uid]);

  const handleTabChange = (tab: 'jobs' | 'racquets' | 'messages') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeTab]);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddRacquetModal, setShowAddRacquetModal] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchingModels, setSearchingModels] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRacquet, setSelectedRacquet] = useState<any>(null);
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);
  const [allRacquets, setAllRacquets] = useState<any[]>([]);

  const customModels = useMemo(() => {
    const models: Record<string, string[]> = {};
    allRacquets.forEach(r => {
      if (r.brand && r.model) {
        if (!models[r.brand]) models[r.brand] = [];
        if (!models[r.brand].includes(r.model)) {
          if (!RACQUET_MODELS[r.brand]?.includes(r.model)) {
            models[r.brand].push(r.model);
          }
        }
      }
    });
    return models;
  }, [allRacquets]);

  const [newRacquetData, setNewRacquetData] = useState({
    brand: '',
    brand_custom: '',
    model: '',
    model_custom: '',
    serial_number: '',
    head_size: '100',
    string_pattern_mains: '16',
    string_pattern_crosses: '19',
    mains_skip: '',
    mains_tie_off: '',
    crosses_start: '',
    crosses_tie_off: '',
    one_piece_length: '',
    two_piece_length: '',
    stringing_instructions: '',
    string_main_brand: '',
    string_main_model: '',
    string_main_brand_custom: '',
    string_main_model_custom: '',
    string_main_gauge: '',
    string_cross_brand: '',
    string_cross_model: '',
    string_cross_brand_custom: '',
    string_cross_model_custom: '',
    string_cross_gauge: '',
    current_tension_main: '',
    current_tension_cross: ''
  });

  useEffect(() => {
    if (!selectedShopId) {
      setInventoryStrings([]);
      return;
    }

    const inventoryQuery = query(
      collection(db, "inventory"),
      where("shop_id", "==", selectedShopId),
      where("type", "==", "string")
    );
    const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      setInventoryStrings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribeInventory();
  }, [selectedShopId]);

  const handleFetchSpecs = async () => {
    const brand = newRacquetData.brand === "Other" ? newRacquetData.brand_custom : newRacquetData.brand;
    const model = newRacquetData.model === "Other" ? newRacquetData.model_custom : newRacquetData.model;

    if (!brand || !model) {
      setError("Please select a brand and model first.");
      return;
    }

    setFetchingSpecs(true);
    setError(null);
    try {
      const specs = await racquetSpecsService.getSpecs(brand, model);
      if (specs) {
        setNewRacquetData(prev => ({
          ...prev,
          head_size: specs.headSize.toString(),
          string_pattern_mains: specs.patternMains.toString(),
          string_pattern_crosses: specs.patternCrosses.toString(),
          mains_skip: specs.mainsSkip || '',
          mains_tie_off: specs.mainsTieOff || '',
          crosses_start: specs.crossesStart || '',
          crosses_tie_off: specs.crossesTieOff || '',
          one_piece_length: specs.onePieceLength?.toString() || '',
          two_piece_length: specs.twoPieceLength?.toString() || '',
          stringing_instructions: specs.stringingInstructions || '',
        }));
      } else {
        setError("Could not find specifications for this model.");
      }
    } catch (err) {
      console.error("Error fetching specs:", err);
      setError("Failed to fetch specifications.");
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleSearchModels = async (query: string) => {
    const brand = newRacquetData.brand === "Other" ? newRacquetData.brand_custom : newRacquetData.brand;
    if (!brand || query.length < 2) return;

    setSearchingModels(true);
    try {
      const models = await racquetSpecsService.searchModels(brand, query);
      setModelSuggestions(models);
      setShowModelSuggestions(true);
    } catch (err) {
      console.error("Error searching models:", err);
    } finally {
      setSearchingModels(false);
    }
  };
  const [requestData, setRequestData] = useState({
    string_main: '',
    string_cross: '',
    string_main_gauge: '',
    string_cross_gauge: '',
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
      setAllRacquets(racquetList);
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
              created_at: serverTimestamp()
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

    // Fetch Messages
    const qMessages = query(
      collection(db, "messages"),
      where("customer_email", "==", user.email),
      orderBy("created_at", "asc")
    );

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "messages");
    });

    // Fetch Shops
    const qShops = query(collection(db, "shops"));
    const unsubscribeShops = onSnapshot(qShops, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(shopList);
      
      // If no shop is selected, select the first one by default
      if (shopList.length > 0 && !selectedShopId) {
        setSelectedShopId(shopList[0].id);
      }
    });

    // Sync existing racquets and jobs that might be missing customer_email
    const syncExistingData = async () => {
      try {
        const qCust = query(collection(db, "customers"), where("email", "==", user.email));
        const custSnap = await getDocs(qCust);
        const customerIds = custSnap.docs.map(d => d.id);

        if (customerIds.length === 0) return;

        for (const cid of customerIds) {
          // Sync racquets
          const qRacq = query(collection(db, "racquets"), where("customer_id", "==", cid));
          const racqSnap = await getDocs(qRacq);
          const rBatch = writeBatch(db);
          let rNeedsCommit = false;

          racqSnap.docs.forEach(docSnap => {
            if (!docSnap.data().customer_email) {
              rBatch.update(docSnap.ref, { customer_email: user.email });
              rNeedsCommit = true;
            }
          });
          if (rNeedsCommit) await rBatch.commit();

          // Sync jobs
          const qJobsSync = query(collection(db, "jobs"), where("customer_id", "==", cid));
          const jobsSnap = await getDocs(qJobsSync);
          const jBatch = writeBatch(db);
          let jNeedsCommit = false;

          jobsSnap.docs.forEach(docSnap => {
            if (!docSnap.data().customer_email) {
              jBatch.update(docSnap.ref, { customer_email: user.email });
              jNeedsCommit = true;
            }
          });
          if (jNeedsCommit) await jBatch.commit();
        }
      } catch (error) {
        console.error("Error syncing existing data:", error);
      }
    };

    syncExistingData();

    return () => {
      unsubscribeJobs();
      unsubscribeRacquets();
      unsubscribeCustomer();
      unsubscribeNotifications();
      unsubscribeMessages();
      unsubscribeShops();
    };
  }, [user.email]);

  // Mark messages as read when a shop is selected
  useEffect(() => {
    if (selectedShopId && activeTab === 'messages') {
      const unreadMessages = messages.filter(
        m => m.shop_id === selectedShopId && m.sender_role === 'stringer' && !m.read
      );
      
      if (unreadMessages.length > 0) {
        unreadMessages.forEach(async (msg) => {
          try {
            await updateDoc(doc(db, "messages", msg.id), { read: true });
          } catch (err) {
            console.error("Error marking message as read:", err);
          }
        });
      }
    }
  }, [selectedShopId, activeTab, messages]);

  useEffect(() => {
    if (!selectedRacquet?.shop_id) {
      setInventoryStrings([]);
      return;
    }

    const q = query(
      collection(db, "inventory"),
      where("shop_id", "==", selectedRacquet.shop_id),
      where("type", "==", "string")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInventoryStrings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedRacquet?.shop_id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !newMessage.trim() || !user.email) return;

    setSendingMessage(true);
    try {
      const messageId = uuidv4();
      await setDoc(doc(db, "messages", messageId), {
        id: messageId,
        shop_id: selectedShopId,
        customer_id: customerInfo?.id || "",
        customer_email: user.email,
        sender_id: user.uid,
        sender_name: customerInfo?.name || user.email.split('@')[0],
        sender_role: 'customer',
        content: newMessage.trim(),
        created_at: serverTimestamp(),
        read: false
      });

      // Send Push Notification to Shop Owner
      try {
        const shopDoc = await getDoc(doc(db, "shops", selectedShopId));
        const shopData = shopDoc.data();
        if (shopData?.owner_id) {
          const ownerDoc = await getDoc(doc(db, "users", shopData.owner_id));
          const ownerData = ownerDoc.data();
          if (ownerData?.fcmToken) {
            await fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: ownerData.fcmToken,
                title: `New message from ${customerInfo?.name || user.email.split('@')[0]}`,
                body: newMessage.trim(),
                data: { type: "message", customer_id: user.uid }
              })
            });
          }
        }
      } catch (pushErr) {
        console.error("Error sending push notification:", pushErr);
      }

      setNewMessage("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "messages");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRacquet || !user.email) return;

    try {
      const stringMain = `${requestData.string_main} ${requestData.string_main_gauge}`.trim();
      const stringCross = requestData.string_cross 
        ? `${requestData.string_cross} ${requestData.string_cross_gauge}`.trim()
        : stringMain;

      const newJob = {
        customer_id: selectedRacquet.customer_id,
        customer_email: user.email,
        shop_id: selectedRacquet.shop_id,
        racquet_id: selectedRacquet.id,
        string_main: stringMain,
        string_cross: stringCross,
        tension_main: Number(requestData.tension_main),
        tension_cross: Number(requestData.tension_cross || requestData.tension_main),
        notes: requestData.notes,
        status: 'pending',
        payment_status: 'unpaid',
        price: 0, // To be set by shop
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const jobId = uuidv4();
      await setDoc(doc(db, "jobs", jobId), {
        id: jobId,
        ...newJob
      });

      // Create message for shop
      const messageId = uuidv4();
      await setDoc(doc(db, "messages", messageId), {
        id: messageId,
        shop_id: selectedRacquet.shop_id,
        customer_id: selectedRacquet.customer_id,
        customer_email: user.email,
        customer_name: customerInfo?.name || user.email?.split('@')[0],
        sender_id: user.uid,
        sender_name: customerInfo?.name || user.email?.split('@')[0],
        sender_role: 'customer',
        title: "New Stringing Request",
        content: `A new stringing request has been submitted for a ${selectedRacquet.brand} ${selectedRacquet.model}.`,
        job_id: jobId,
        read: false,
        created_at: serverTimestamp()
      });

      setShowRequestModal(false);
      setSelectedRacquet(null);
      setRequestData({
        string_main: '',
        string_cross: '',
        string_main_gauge: '',
        string_cross_gauge: '',
        tension_main: '',
        tension_cross: '',
        notes: ''
      });
      handleTabChange('jobs');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "jobs");
    }
  };

  const handleAddRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo?.id || !user.email) return;

    try {
      const racquetId = `racq_${Date.now()}`;
      const brand = newRacquetData.brand === "Other" ? newRacquetData.brand_custom : newRacquetData.brand;
      const model = newRacquetData.model === "Other" ? newRacquetData.model_custom : newRacquetData.model;

      const stringMain = newRacquetData.string_main_brand === "Other" 
        ? `${newRacquetData.string_main_brand_custom} ${newRacquetData.string_main_model_custom} ${newRacquetData.string_main_gauge}`.trim()
        : `${newRacquetData.string_main_brand} ${newRacquetData.string_main_model} ${newRacquetData.string_main_gauge}`.trim();
      
      const stringCross = newRacquetData.string_cross_brand === "Other"
        ? `${newRacquetData.string_cross_brand_custom} ${newRacquetData.string_cross_model_custom} ${newRacquetData.string_cross_gauge}`.trim()
        : (newRacquetData.string_cross_brand === "Same as Mains" ? stringMain : `${newRacquetData.string_cross_brand} ${newRacquetData.string_cross_model} ${newRacquetData.string_cross_gauge}`.trim());

      const newRacquet = {
        id: racquetId,
        customer_id: customerInfo.id,
        customer_email: user.email,
        shop_id: customerInfo.shop_id,
        brand,
        model,
        serial_number: newRacquetData.serial_number,
        head_size: Number(newRacquetData.head_size),
        string_pattern_mains: Number(newRacquetData.string_pattern_mains),
        string_pattern_crosses: Number(newRacquetData.string_pattern_crosses),
        mains_skip: newRacquetData.mains_skip,
        mains_tie_off: newRacquetData.mains_tie_off,
        crosses_start: newRacquetData.crosses_start,
        crosses_tie_off: newRacquetData.crosses_tie_off,
        one_piece_length: Number(newRacquetData.one_piece_length) || 0,
        two_piece_length: Number(newRacquetData.two_piece_length) || 0,
        stringing_instructions: newRacquetData.stringing_instructions,
        current_string_main: stringMain || "Not strung yet",
        current_string_cross: stringCross || "Not strung yet",
        current_tension_main: Number(newRacquetData.current_tension_main) || 0,
        current_tension_cross: Number(newRacquetData.current_tension_cross) || 0,
        qr_code: `racquet_${racquetId}`,
        created_at: serverTimestamp()
      };

      await setDoc(doc(db, "racquets", racquetId), newRacquet);
      setShowAddRacquetModal(false);
      setNewRacquetData({
        brand: '', brand_custom: '', model: '', model_custom: '', serial_number: '',
        head_size: '100', string_pattern_mains: '16', string_pattern_crosses: '19',
        mains_skip: '', mains_tie_off: '', crosses_start: '', crosses_tie_off: '',
        one_piece_length: '', two_piece_length: '', stringing_instructions: '',
        string_main_brand: '', string_main_model: '', string_main_brand_custom: '', string_main_model_custom: '', string_main_gauge: '',
        string_cross_brand: '', string_cross_model: '', string_cross_brand_custom: '', string_cross_model_custom: '', string_cross_gauge: '',
        current_tension_main: '', current_tension_cross: ''
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

        <div className="flex items-center justify-between gap-4 w-full mt-4">
          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex flex-1 sm:flex-none">
            <button 
              onClick={() => handleTabChange('jobs')}
              className={`flex-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'jobs' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
            >
              My Jobs
            </button>
            <button 
              onClick={() => handleTabChange('racquets')}
              className={`flex-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'racquets' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
            >
              My Bag
            </button>
            <button 
              onClick={() => handleTabChange('messages')}
              className={`flex-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 hover:text-primary'}`}
            >
              Messages
            </button>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative flex-shrink-0">
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
              <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                          handleTabChange('jobs');
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
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-primary truncate">{racquet.brand} {racquet.model}</h3>
                  <p className="text-[10px] text-neutral-400 font-mono uppercase">SN: {racquet.serial_number || 'N/A'}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <QRCodeDisplay 
                  value={racquet.qr_code || `racquet_${racquet.id}`} 
                  label={`${racquet.brand} ${racquet.model}`}
                  serialNumber={racquet.serial_number}
                />
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
                    const isNotStrung = racquet.current_string_main === "Not strung yet";
                    setRequestData({
                      ...requestData,
                      string_main: isNotStrung ? '' : (racquet.current_string_main || ''),
                      string_cross: isNotStrung ? '' : (racquet.current_string_cross || ''),
                      string_main_gauge: '',
                      string_cross_gauge: '',
                      tension_main: (isNotStrung || racquet.current_tension_main === 0) ? '' : racquet.current_tension_main?.toString() || '',
                      tension_cross: (isNotStrung || racquet.current_tension_cross === 0) ? '' : racquet.current_tension_cross?.toString() || ''
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
          {/* Shop List */}
          <div className="md:col-span-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-700">
              <h3 className="font-bold text-primary">Shops</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {shops.map(shop => {
                const unread = messages.filter(m => m.shop_id === shop.id && m.sender_role === 'stringer' && !m.read).length;
                return (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShopId(shop.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all relative ${selectedShopId === shop.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm truncate">{shop.name}</p>
                      {unread > 0 && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                    <p className={`text-[10px] ${selectedShopId === shop.id ? 'text-white/70' : 'text-neutral-400'}`}>{shop.location}</p>
                  </button>
                );
              })}
              {shops.length === 0 && (
                <p className="text-center text-xs text-neutral-400 p-4">No shops found</p>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden flex flex-col shadow-sm">
            {selectedShopId ? (
              <>
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {shops.find(s => s.id === selectedShopId)?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-primary">{shops.find(s => s.id === selectedShopId)?.name}</h3>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Stringer</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {[...messages].filter(m => m.shop_id === selectedShopId).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                        msg.sender_role === 'customer' 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">
                          {msg.content || msg.message}
                          {msg.title && <span className="block font-bold mt-1 text-xs opacity-80">{msg.title}</span>}
                        </p>
                        <p className={`text-[10px] mt-2 ${msg.sender_role === 'customer' ? 'text-white/60' : 'text-neutral-400'}`}>
                          {safeFormatDate(msg.created_at, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {messages.filter(m => m.shop_id === selectedShopId).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-40">
                      <MessageSquare className="w-12 h-12 mb-2" />
                      <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-primary text-white p-3 rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                <h3 className="text-lg font-bold text-neutral-300 dark:text-neutral-600">Select a shop</h3>
                <p className="text-sm max-w-xs">Choose a shop from the list to view your messages or start a new conversation.</p>
              </div>
            )}
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
                  <select
                    required
                    value={requestData.string_main}
                    onChange={(e) => setRequestData({...requestData, string_main: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select string</option>
                    {(() => {
                      const allStrings = JSON.parse(JSON.stringify(STRINGS));
                      inventoryStrings.forEach(item => {
                        const existingBrand = allStrings.find((s: any) => s.brand === item.brand);
                        if (existingBrand) {
                          if (!existingBrand.models.includes(item.name)) {
                            existingBrand.models.push(item.name);
                          }
                        } else {
                          allStrings.push({ brand: item.brand, models: [item.name] });
                        }
                      });
                      return allStrings.map((brand: any) => (
                        <optgroup key={brand.brand} label={brand.brand}>
                          {brand.models.map((model: string) => (
                            <option key={`${brand.brand} ${model}`} value={`${brand.brand} ${model}`}>
                              {brand.brand} {model}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                    <option value="Other">Other (Specify in notes)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Main Gauge</label>
                  <select
                    required
                    value={requestData.string_main_gauge}
                    onChange={(e) => setRequestData({...requestData, string_main_gauge: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select Gauge</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cross String</label>
                  <select
                    value={requestData.string_cross}
                    onChange={(e) => setRequestData({...requestData, string_cross: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Same as main</option>
                    {(() => {
                      const allStrings = JSON.parse(JSON.stringify(STRINGS));
                      inventoryStrings.forEach(item => {
                        const existingBrand = allStrings.find((s: any) => s.brand === item.brand);
                        if (existingBrand) {
                          if (!existingBrand.models.includes(item.name)) {
                            existingBrand.models.push(item.name);
                          }
                        } else {
                          allStrings.push({ brand: item.brand, models: [item.name] });
                        }
                      });
                      return allStrings.map((brand: any) => (
                        <optgroup key={brand.brand} label={brand.brand}>
                          {brand.models.map((model: string) => (
                            <option key={`${brand.brand} ${model}`} value={`${brand.brand} ${model}`}>
                              {brand.brand} {model}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                    <option value="Other">Other (Specify in notes)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cross Gauge</label>
                  <select
                    required={!!requestData.string_cross}
                    disabled={!requestData.string_cross}
                    value={requestData.string_cross ? requestData.string_cross_gauge : requestData.string_main_gauge}
                    onChange={(e) => setRequestData({...requestData, string_cross_gauge: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Gauge</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Main Tension (lbs)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="80"
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
                    min="10"
                    max="80"
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
                  <select
                    required
                    value={newRacquetData.brand}
                    onChange={(e) => setNewRacquetData({...newRacquetData, brand: e.target.value, model: ''})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select Brand</option>
                    {RACQUET_BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Model</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="Search or Enter Model" 
                        required
                        value={newRacquetData.model === "Other" ? newRacquetData.model_custom : newRacquetData.model}
                        onChange={e => {
                          const val = e.target.value;
                          if (newRacquetData.brand && newRacquetData.brand !== "Other") {
                            setNewRacquetData({...newRacquetData, model: val, model_custom: val});
                            if (val.length >= 2) handleSearchModels(val);
                          } else {
                            setNewRacquetData({...newRacquetData, model: val, model_custom: val});
                          }
                        }}
                        onFocus={() => {
                          if (modelSuggestions.length > 0) setShowModelSuggestions(true);
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      />
                      {showModelSuggestions && modelSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {modelSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setNewRacquetData({...newRacquetData, model: suggestion, model_custom: suggestion});
                                setShowModelSuggestions(false);
                                // Trigger spec fetch automatically
                                setTimeout(() => handleFetchSpecs(), 0);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm text-neutral-900 dark:text-white"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {searchingModels && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {(newRacquetData.brand && (newRacquetData.model || newRacquetData.model_custom)) && (
                    <button
                      type="button"
                      onClick={handleFetchSpecs}
                      disabled={fetchingSpecs}
                      className="mt-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Search className="w-3 h-3" />
                      {fetchingSpecs ? "Searching..." : "Search Technical Specs"}
                    </button>
                  )}
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

              {/* Detailed Stringing Specs */}
              <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Stringing Pattern & Specs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Skip</label>
                    <input 
                      type="text" 
                      placeholder="7H, 9H, 7T, 9T" 
                      value={newRacquetData.mains_skip}
                      onChange={e => setNewRacquetData({...newRacquetData, mains_skip: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Tie-off</label>
                    <input 
                      type="text" 
                      placeholder="8T" 
                      value={newRacquetData.mains_tie_off}
                      onChange={e => setNewRacquetData({...newRacquetData, mains_tie_off: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Start</label>
                    <input 
                      type="text" 
                      placeholder="Head" 
                      value={newRacquetData.crosses_start}
                      onChange={e => setNewRacquetData({...newRacquetData, crosses_start: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Tie-off</label>
                    <input 
                      type="text" 
                      placeholder="5H, 11T" 
                      value={newRacquetData.crosses_tie_off}
                      onChange={e => setNewRacquetData({...newRacquetData, crosses_tie_off: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">1-Piece (ft)</label>
                    <input 
                      type="number" 
                      placeholder="33" 
                      value={newRacquetData.one_piece_length}
                      onChange={e => setNewRacquetData({...newRacquetData, one_piece_length: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">2-Piece (ft)</label>
                    <input 
                      type="number" 
                      placeholder="20/18" 
                      value={newRacquetData.two_piece_length}
                      onChange={e => setNewRacquetData({...newRacquetData, two_piece_length: e.target.value})}
                      className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 mt-4">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Detailed Stringing Instructions</label>
                <textarea 
                  placeholder="Additional pattern notes, mounting instructions, etc..." 
                  value={newRacquetData.stringing_instructions}
                  onChange={e => setNewRacquetData({...newRacquetData, stringing_instructions: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mains String Brand</label>
                  <select
                    value={newRacquetData.string_main_brand}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_main_brand: e.target.value, string_main_model: ''})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select Brand</option>
                    {(() => {
                      const allStrings = [...STRINGS];
                      inventoryStrings.forEach(item => {
                        const existingBrand = allStrings.find(s => s.brand === item.brand);
                        if (existingBrand) {
                          if (!existingBrand.models.includes(item.name)) {
                            existingBrand.models.push(item.name);
                          }
                        } else {
                          allStrings.push({ brand: item.brand, models: [item.name] });
                        }
                      });
                      return allStrings.map(s => (
                        <option key={s.brand} value={s.brand}>{s.brand}</option>
                      ));
                    })()}
                    <option value="Other">Other</option>
                  </select>
                  {newRacquetData.string_main_brand === "Other" && (
                    <input
                      type="text"
                      placeholder="Enter Brand"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_main_brand_custom: e.target.value})}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mains String Model</label>
                  {newRacquetData.string_main_brand && newRacquetData.string_main_brand !== "Other" ? (
                    <select
                      value={newRacquetData.string_main_model}
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_main_model: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="">Select Model</option>
                      {(() => {
                        const brand = STRINGS.find(s => s.brand === newRacquetData.string_main_brand);
                        const models = brand ? [...brand.models] : [];
                        
                        // Add inventory models
                        inventoryStrings.filter(s => s.brand === newRacquetData.string_main_brand).forEach(item => {
                          if (!models.includes(item.name)) {
                            models.push(item.name);
                          }
                        });

                        return models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ));
                      })()}
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter Model"
                      value={newRacquetData.string_main_model}
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_main_model: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  )}
                  {newRacquetData.string_main_model === "Other" && (
                    <input
                      type="text"
                      placeholder="Enter Model"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_main_model_custom: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Crosses String Brand</label>
                  <select
                    value={newRacquetData.string_cross_brand}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_brand: e.target.value, string_cross_model: ''})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select Brand</option>
                    <option value="Same as Mains">Same as Mains</option>
                    {(() => {
                      const allStrings = [...STRINGS];
                      inventoryStrings.forEach(item => {
                        const existingBrand = allStrings.find(s => s.brand === item.brand);
                        if (existingBrand) {
                          if (!existingBrand.models.includes(item.name)) {
                            existingBrand.models.push(item.name);
                          }
                        } else {
                          allStrings.push({ brand: item.brand, models: [item.name] });
                        }
                      });
                      return allStrings.map(s => (
                        <option key={s.brand} value={s.brand}>{s.brand}</option>
                      ));
                    })()}
                    <option value="Other">Other</option>
                  </select>
                  {newRacquetData.string_cross_brand === "Other" && (
                    <input
                      type="text"
                      placeholder="Enter Brand"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_brand_custom: e.target.value})}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Crosses String Model</label>
                  {newRacquetData.string_cross_brand && newRacquetData.string_cross_brand !== "Other" && newRacquetData.string_cross_brand !== "Same as Mains" ? (
                    <select
                      value={newRacquetData.string_cross_model}
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_model: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="">Select Model</option>
                      {(() => {
                        const brand = STRINGS.find(s => s.brand === newRacquetData.string_cross_brand);
                        const models = brand ? [...brand.models] : [];
                        
                        // Add inventory models
                        inventoryStrings.filter(s => s.brand === newRacquetData.string_cross_brand).forEach(item => {
                          if (!models.includes(item.name)) {
                            models.push(item.name);
                          }
                        });

                        return models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ));
                      })()}
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter Model"
                      disabled={newRacquetData.string_cross_brand === "Same as Mains"}
                      value={newRacquetData.string_cross_brand === "Same as Mains" ? "Same as Mains" : newRacquetData.string_cross_model}
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_model: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm disabled:opacity-50"
                    />
                  )}
                  {newRacquetData.string_cross_model === "Other" && (
                    <input
                      type="text"
                      placeholder="Enter Model"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_model_custom: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mains Gauge</label>
                  <select
                    value={newRacquetData.string_main_gauge}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_main_gauge: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Select Gauge</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Crosses Gauge</label>
                  <select
                    value={newRacquetData.string_cross_brand === "Same as Mains" ? newRacquetData.string_main_gauge : newRacquetData.string_cross_gauge}
                    disabled={newRacquetData.string_cross_brand === "Same as Mains"}
                    onChange={(e) => setNewRacquetData({...newRacquetData, string_cross_gauge: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Gauge</option>
                    {GAUGES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mains Tension (lbs)</label>
                  <input
                    type="number"
                    value={newRacquetData.current_tension_main}
                    onChange={(e) => setNewRacquetData({...newRacquetData, current_tension_main: e.target.value})}
                    placeholder="52"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Crosses Tension (lbs)</label>
                  <input
                    type="number"
                    value={newRacquetData.current_tension_cross}
                    onChange={(e) => setNewRacquetData({...newRacquetData, current_tension_cross: e.target.value})}
                    placeholder="52"
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
