import React, { useState, useEffect } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS } from "../constants";
import { Plus, Search, Filter, CheckCircle2, Clock, PlayCircle, CreditCard, X, Trash2, Users, Briefcase, Edit2, ChevronRight, ChevronDown, Printer, Package, MessageSquare, Mail, Phone } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { safeFormatDate } from "../lib/utils";

export default function Dashboard({ user }: { user: any }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'messages'>('jobs');
  const [messages, setMessages] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'customer' | 'job' | 'racquet' | 'message', id: string, name?: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [editingRacquet, setEditingRacquet] = useState<any | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [showQRCodeModal, setShowQRCodeModal] = useState<{ value: string, label: string, serialNumber?: string } | null>(null);
  
  // New Job Form State
  const [customers, setCustomers] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRacquetId, setSelectedRacquetId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isNewRacquet, setIsNewRacquet] = useState(false);

  const [newJob, setNewJob] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    racquet_brand: "",
    racquet_model: "",
    racquet_brand_custom: "",
    racquet_model_custom: "",
    racquet_serial: "",
    racquet_head_size: 0,
    racquet_mains: 0,
    racquet_crosses: 0,
    string_main_brand: "",
    string_main_model: "",
    string_main_brand_custom: "",
    string_main_model_custom: "",
    string_cross_brand: "",
    string_cross_model: "",
    string_cross_brand_custom: "",
    string_cross_model_custom: "",
    string_main: "",
    string_cross: "",
    tension_main: 0,
    tension_cross: 0,
    price: 25,
    notes: "",
    keep_same_string: false
  });

  useEffect(() => {
    if (!user || !user.shop_id) return;

    // Fetch Shop
    const unsubscribeShop = onSnapshot(doc(db, "shops", user.shop_id), (docSnap) => {
      if (docSnap.exists()) {
        setShop(docSnap.data());
      }
    });

    // Fetch Jobs
    const jobsQuery = query(
      collection(db, "jobs"),
      where("shop_id", "==", user.shop_id),
      orderBy("created_at", "desc")
    );
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // We need to join with racquet data for display
      setJobs(jobsData);
    });

    // Fetch Customers
    const customersQuery = query(
      collection(db, "customers"),
      where("shop_id", "==", user.shop_id)
    );
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Racquets
    const racquetsQuery = query(
      collection(db, "racquets")
    );
    const unsubscribeRacquets = onSnapshot(racquetsQuery, (snapshot) => {
      setRacquets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Messages
    const messagesQuery = query(
      collection(db, "messages"),
      where("shop_id", "==", user.shop_id),
      orderBy("created_at", "desc")
    );
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      unsubscribeShop();
      unsubscribeJobs();
      unsubscribeCustomers();
      unsubscribeRacquets();
      unsubscribeMessages();
    };
  }, [user.shop_id]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      let finalCustomerId = selectedCustomerId;
      let finalRacquetId = selectedRacquetId;

      if (isNewCustomer) {
        finalCustomerId = uuidv4();
        const customerRef = doc(db, "customers", finalCustomerId);
        batch.set(customerRef, {
          id: finalCustomerId,
          shop_id: user.shop_id,
          name: newJob.customer_name,
          email: newJob.customer_email,
          phone: newJob.customer_phone
        });
      }

      if (isNewRacquet || isNewCustomer) {
        finalRacquetId = uuidv4();
        const racquetRef = doc(db, "racquets", finalRacquetId);
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        const stringMain = newJob.string_main_brand === "Other" 
          ? `${newJob.string_main_brand_custom} ${newJob.string_main_model_custom}`
          : `${newJob.string_main_brand} ${newJob.string_main_model}`;
        
        const stringCross = newJob.string_cross_brand === "Other"
          ? `${newJob.string_cross_brand_custom} ${newJob.string_cross_model_custom}`
          : (newJob.string_cross_brand === "Same as Mains" ? stringMain : `${newJob.string_cross_brand} ${newJob.string_cross_model}`);

        batch.set(racquetRef, {
          id: finalRacquetId,
          customer_id: finalCustomerId,
          shop_id: user.shop_id,
          brand,
          model,
          serial_number: newJob.racquet_serial,
          head_size: newJob.racquet_head_size,
          string_pattern_mains: newJob.racquet_mains,
          string_pattern_crosses: newJob.racquet_crosses,
          current_string_main: stringMain,
          current_string_cross: stringCross,
          current_tension_main: newJob.tension_main,
          current_tension_cross: newJob.tension_cross,
          qr_code: `racquet_${finalRacquetId}`
        });
      } else if (selectedRacquetId) {
        // Update existing racquet with new string info
        const racquetRef = doc(db, "racquets", selectedRacquetId);
        const stringMain = newJob.keep_same_string ? newJob.string_main : (
          newJob.string_main_brand === "Other" 
            ? `${newJob.string_main_brand_custom} ${newJob.string_main_model_custom}`
            : `${newJob.string_main_brand} ${newJob.string_main_model}`
        );
        const stringCross = newJob.keep_same_string ? newJob.string_cross : (
          newJob.string_cross_brand === "Other"
            ? `${newJob.string_cross_brand_custom} ${newJob.string_cross_model_custom}`
            : (newJob.string_cross_brand === "Same as Mains" ? stringMain : `${newJob.string_cross_brand} ${newJob.string_cross_model}`)
        );

        batch.update(racquetRef, {
          current_string_main: stringMain,
          current_string_cross: stringCross,
          current_tension_main: newJob.tension_main,
          current_tension_cross: newJob.tension_cross
        });
      }

      const jobId = uuidv4();
      const jobRef = doc(db, "jobs", jobId);
      
      const stringMain = newJob.keep_same_string ? newJob.string_main : (
        newJob.string_main_brand === "Other" 
          ? `${newJob.string_main_brand_custom} ${newJob.string_main_model_custom}`
          : `${newJob.string_main_brand} ${newJob.string_main_model}`
      );
      const stringCross = newJob.keep_same_string ? newJob.string_cross : (
        newJob.string_cross_brand === "Other"
          ? `${newJob.string_cross_brand_custom} ${newJob.string_cross_model_custom}`
          : (newJob.string_cross_brand === "Same as Mains" ? stringMain : `${newJob.string_cross_brand} ${newJob.string_cross_model}`)
      );

      batch.set(jobRef, {
        id: jobId,
        racquet_id: finalRacquetId,
        shop_id: user.shop_id,
        status: "pending",
        string_main: stringMain,
        string_cross: stringCross,
        tension_main: newJob.tension_main,
        tension_cross: newJob.tension_cross,
        price: newJob.price,
        payment_status: "unpaid",
        notes: newJob.notes,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      await batch.commit();
      
      setShowNewJob(false);
      setNewJob({
        customer_name: "", customer_email: "", customer_phone: "",
        racquet_brand: "", racquet_model: "", racquet_brand_custom: "", racquet_model_custom: "", racquet_serial: "",
        racquet_head_size: 0, racquet_mains: 0, racquet_crosses: 0,
        string_main_brand: "", string_main_model: "", string_main_brand_custom: "", string_main_model_custom: "",
        string_cross_brand: "", string_cross_model: "", string_cross_brand_custom: "", string_cross_model_custom: "",
        string_main: "", string_cross: "", tension_main: 0, tension_cross: 0, price: 25, notes: "",
        keep_same_string: false
      });
      setSelectedCustomerId("");
      setSelectedRacquetId("");
      setIsNewCustomer(false);
      setIsNewRacquet(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter racquets based on selected customer
  const filteredRacquets = racquets.filter(r => r.customer_id === selectedCustomerId);

  const filteredJobs = jobs.map(j => {
    const racquet = racquets.find(r => r.id === j.racquet_id);
    const customer = customers.find(c => c.id === racquet?.customer_id);
    return {
      ...j,
      customer_name: customer?.name || "Unknown",
      brand: racquet?.brand || "",
      model: racquet?.model || ""
    };
  }).filter(j => 
    j.customer_name.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.brand.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.model.toLowerCase().includes(jobSearch.toLowerCase())
  ).filter(j => jobStatusFilter === "all" ? true : j.status === jobStatusFilter);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      const racquet = racquets.find(r => r.id === job?.racquet_id);
      const customer = customers.find(c => c.id === racquet?.customer_id);

      await updateDoc(doc(db, "jobs", jobId), { 
        status,
        updated_at: serverTimestamp()
      });

      if (customer?.email) {
        const notificationId = uuidv4();
        await setDoc(doc(db, "notifications", notificationId), {
          id: notificationId,
          customer_email: customer.email,
          shop_id: user.shop_id,
          job_id: jobId,
          title: `Job Status Updated: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your ${job.brand} ${job.model} is now ${status}.`,
          read: false,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updatePaymentStatus = async (jobId: string, payment_status: string) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), { 
        payment_status,
        updated_at: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete customer
      batch.delete(doc(db, "customers", customerId));
      
      // Delete their racquets and jobs (In a real app, you'd query first)
      const racquetsSnap = await getDocs(query(collection(db, "racquets"), where("customer_id", "==", customerId)));
      for (const rDoc of racquetsSnap.docs) {
        batch.delete(doc(db, "racquets", rDoc.id));
        const jobsSnap = await getDocs(query(collection(db, "jobs"), where("racquet_id", "==", rDoc.id)));
        for (const jDoc of jobsSnap.docs) {
          batch.delete(doc(db, "jobs", jDoc.id));
        }
      }
      
      await batch.commit();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete customer");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, "jobs", jobId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete job");
    }
  };

  const handleUpdateRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRacquet) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "racquets", editingRacquet.id), {
        brand: editingRacquet.brand,
        model: editingRacquet.model,
        serial_number: editingRacquet.serial_number,
        head_size: editingRacquet.head_size,
        string_pattern_mains: editingRacquet.string_pattern_mains,
        string_pattern_crosses: editingRacquet.string_pattern_crosses,
        current_string_main: editingRacquet.current_string_main,
        current_string_cross: editingRacquet.current_string_cross,
        current_tension_main: editingRacquet.current_tension_main,
        current_tension_cross: editingRacquet.current_tension_cross
      });
      setEditingRacquet(null);
    } catch (err) {
      console.error(err);
      setError("Failed to update racquet");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "jobs", editingJob.id), {
        string_main: editingJob.string_main,
        string_cross: editingJob.string_cross,
        tension_main: editingJob.tension_main,
        tension_cross: editingJob.tension_cross,
        price: editingJob.price,
        notes: editingJob.notes,
        updated_at: serverTimestamp()
      });
      setEditingJob(null);
    } catch (err) {
      console.error(err);
      setError("Failed to update job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRacquet = async (racquetId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "racquets", racquetId));
      const jobsSnap = await getDocs(query(collection(db, "jobs"), where("racquet_id", "==", racquetId)));
      for (const jDoc of jobsSnap.docs) {
        batch.delete(doc(db, "jobs", jDoc.id));
      }
      await batch.commit();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete racquet");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, "messages", messageId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete message");
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-1/4"></div>
    <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">{shop?.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage your shop operations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex flex-1 sm:flex-none">
            <button 
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${activeTab === 'jobs' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-primary'}`}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs
              {jobs.filter(j => j.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 animate-pulse">
                  {jobs.filter(j => j.status === 'pending').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'customers' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-primary'}`}
            >
              <Users className="w-4 h-4 mr-2" />
              Customers
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${activeTab === 'messages' ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-primary'}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 animate-pulse">
                  {messages.length}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setShowNewJob(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 mr-2 text-secondary" />
            New Job
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-bold text-primary mb-2">Confirm Delete</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Are you sure you want to delete this {deleteConfirm.type}{deleteConfirm.name ? ` "${deleteConfirm.name}"` : ""}? 
              {deleteConfirm.type === 'customer' && " This will also delete all their racquets and jobs. This action cannot be undone."}
              {deleteConfirm.type === 'job' && " This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'customer') handleDeleteCustomer(deleteConfirm.id);
                  else if (deleteConfirm.type === 'job') handleDeleteJob(deleteConfirm.id);
                  else if (deleteConfirm.type === 'racquet') handleDeleteRacquet(deleteConfirm.id);
                  else if (deleteConfirm.type === 'message') handleDeleteMessage(deleteConfirm.id);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setShowQRCodeModal(null)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>
            <h2 className="text-xl font-bold text-primary mb-6">Racquet QR Code</h2>
            <div className="flex justify-center">
              <QRCodeDisplay 
                value={showQRCodeModal.value} 
                label={showQRCodeModal.label}
                serialNumber={showQRCodeModal.serialNumber}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setEditingJob(null)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>

            <h2 className="text-2xl font-bold text-primary mb-6">Edit Job</h2>
            
            <form onSubmit={handleUpdateJob} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main String</label>
                  <input 
                    type="text" 
                    required
                    value={editingJob.string_main}
                    onChange={e => setEditingJob({...editingJob, string_main: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross String</label>
                  <input 
                    type="text" 
                    required
                    value={editingJob.string_cross}
                    onChange={e => setEditingJob({...editingJob, string_cross: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main Tension (lbs)</label>
                  <input 
                    type="number" 
                    required
                    value={editingJob.tension_main || ""}
                    onChange={e => setEditingJob({...editingJob, tension_main: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross Tension (lbs)</label>
                  <input 
                    type="number" 
                    required
                    value={editingJob.tension_cross || ""}
                    onChange={e => setEditingJob({...editingJob, tension_cross: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Price ($)</label>
                <input 
                  type="number" 
                  required
                  value={editingJob.price}
                  onChange={e => setEditingJob({...editingJob, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Notes</label>
                <textarea 
                  value={editingJob.notes}
                  onChange={e => setEditingJob({...editingJob, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none h-20 resize-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingJob(null)} 
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Racquet Modal */}
      {editingRacquet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setEditingRacquet(null)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>

            <h2 className="text-2xl font-bold text-primary mb-6">Edit Racquet</h2>
            
            <form onSubmit={handleUpdateRacquet} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Brand</label>
                  <select 
                    required
                    value={RACQUET_BRANDS.includes(editingRacquet.brand) ? editingRacquet.brand : "Other"}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setEditingRacquet({...editingRacquet, brand: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, brand: val, model: ""});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Brand</option>
                    {RACQUET_BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {(!RACQUET_BRANDS.includes(editingRacquet.brand) || editingRacquet.brand === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter Brand" 
                      required
                      value={editingRacquet.brand}
                      onChange={e => setEditingRacquet({...editingRacquet, brand: e.target.value})}
                      className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Model</label>
                  {RACQUET_BRANDS.includes(editingRacquet.brand) ? (
                    <select 
                      required
                      value={RACQUET_MODELS[editingRacquet.brand]?.includes(editingRacquet.model) ? editingRacquet.model : "Other"}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "Other") {
                          setEditingRacquet({...editingRacquet, model: ""});
                        } else {
                          setEditingRacquet({...editingRacquet, model: val});
                        }
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Model</option>
                      {RACQUET_MODELS[editingRacquet.brand]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Enter Model" 
                      required
                      value={editingRacquet.model}
                      onChange={e => setEditingRacquet({...editingRacquet, model: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  {RACQUET_BRANDS.includes(editingRacquet.brand) && (!RACQUET_MODELS[editingRacquet.brand]?.includes(editingRacquet.model) || editingRacquet.model === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter Model" 
                      required
                      value={editingRacquet.model}
                      onChange={e => setEditingRacquet({...editingRacquet, model: e.target.value})}
                      className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Serial Number</label>
                <input 
                  type="text" 
                  value={editingRacquet.serial_number || ""}
                  onChange={e => setEditingRacquet({...editingRacquet, serial_number: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Head Size</label>
                  <input 
                    type="number" 
                    value={editingRacquet.head_size || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, head_size: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="sq in"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Mains</label>
                  <input 
                    type="number" 
                    value={editingRacquet.string_pattern_mains || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, string_pattern_mains: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Crosses</label>
                  <input 
                    type="number" 
                    value={editingRacquet.string_pattern_crosses || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, string_pattern_crosses: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Main String Brand</label>
                  <select 
                    value={STRINGS.find(brand => editingRacquet.current_string_main?.startsWith(brand.brand))?.brand || "Other"}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setEditingRacquet({...editingRacquet, current_string_main: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, current_string_main: val + " "});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Brand</option>
                    {STRINGS.map(s => (
                      <option key={s.brand} value={s.brand}>{s.brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {(!STRINGS.some(brand => editingRacquet.current_string_main?.startsWith(brand.brand)) || editingRacquet.current_string_main === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter String" 
                      value={editingRacquet.current_string_main || ""}
                      onChange={e => setEditingRacquet({...editingRacquet, current_string_main: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  {STRINGS.some(brand => editingRacquet.current_string_main?.startsWith(brand.brand)) && (
                    <select 
                      value={editingRacquet.current_string_main?.split(' ').slice(1).join(' ') || ""}
                      onChange={e => {
                        const brand = STRINGS.find(b => editingRacquet.current_string_main?.startsWith(b.brand))?.brand;
                        setEditingRacquet({...editingRacquet, current_string_main: brand + " " + e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Model</option>
                      {STRINGS.find(b => editingRacquet.current_string_main?.startsWith(b.brand))?.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Cross String Brand</label>
                  <select 
                    value={editingRacquet.current_string_cross === editingRacquet.current_string_main ? "Same as Mains" : (STRINGS.find(brand => editingRacquet.current_string_cross?.startsWith(brand.brand))?.brand || "Other")}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Same as Mains") {
                        setEditingRacquet({...editingRacquet, current_string_cross: editingRacquet.current_string_main});
                      } else if (val === "Other") {
                        setEditingRacquet({...editingRacquet, current_string_cross: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, current_string_cross: val + " "});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Brand</option>
                    <option value="Same as Mains">Same as Mains</option>
                    {STRINGS.map(s => (
                      <option key={s.brand} value={s.brand}>{s.brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {editingRacquet.current_string_cross !== editingRacquet.current_string_main && (!STRINGS.some(brand => editingRacquet.current_string_cross?.startsWith(brand.brand)) || editingRacquet.current_string_cross === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter String" 
                      value={editingRacquet.current_string_cross || ""}
                      onChange={e => setEditingRacquet({...editingRacquet, current_string_cross: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  {editingRacquet.current_string_cross !== editingRacquet.current_string_main && STRINGS.some(brand => editingRacquet.current_string_cross?.startsWith(brand.brand)) && (
                    <select 
                      value={editingRacquet.current_string_cross?.split(' ').slice(1).join(' ') || ""}
                      onChange={e => {
                        const brand = STRINGS.find(b => editingRacquet.current_string_cross?.startsWith(b.brand))?.brand;
                        setEditingRacquet({...editingRacquet, current_string_cross: brand + " " + e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Model</option>
                      {STRINGS.find(b => editingRacquet.current_string_cross?.startsWith(b.brand))?.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Main Tension</label>
                  <input 
                    type="number" 
                    value={editingRacquet.current_tension_main || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, current_tension_main: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Cross Tension</label>
                  <input 
                    type="number" 
                    value={editingRacquet.current_tension_cross || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, current_tension_cross: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingRacquet(null)} 
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {showNewJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary">Create New Job</h2>
              <button onClick={() => {
                setShowNewJob(false);
                setError(null);
              }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Customer Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Customer</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(!isNewCustomer);
                      setSelectedCustomerId("");
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {isNewCustomer ? "Select Existing" : "Add New Customer"}
                  </button>
                </div>

                {isNewCustomer ? (
                  <div className="grid grid-cols-1 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <input 
                      type="text" 
                      placeholder="Customer Name" 
                      required
                      value={newJob.customer_name}
                      onChange={e => setNewJob({...newJob, customer_name: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="email" 
                        placeholder="Email" 
                        required
                        value={newJob.customer_email}
                        onChange={e => setNewJob({...newJob, customer_email: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input 
                        type="tel" 
                        placeholder="Phone" 
                        required
                        value={newJob.customer_phone}
                        onChange={e => setNewJob({...newJob, customer_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <select 
                    required
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      setSelectedRacquetId("");
                      setIsNewRacquet(false);
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Racquet Selection */}
              {(selectedCustomerId || isNewCustomer) && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Racquet</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsNewRacquet(!isNewRacquet);
                        setSelectedRacquetId("");
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {isNewRacquet ? "Select Existing" : "Add New Racquet"}
                    </button>
                  </div>

                  {isNewRacquet || isNewCustomer ? (
                    <div className="grid grid-cols-1 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Brand</label>
                          <select 
                            required
                            value={newJob.racquet_brand}
                            onChange={e => {
                              setNewJob({...newJob, racquet_brand: e.target.value, racquet_model: ""});
                            }}
                            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select Brand</option>
                            {RACQUET_BRANDS.map(brand => (
                              <option key={brand} value={brand}>{brand}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                          {newJob.racquet_brand === "Other" && (
                            <input 
                              type="text" 
                              placeholder="Enter Brand" 
                              required
                              className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                              onChange={e => setNewJob({...newJob, racquet_brand_custom: e.target.value})}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Model</label>
                          {newJob.racquet_brand && newJob.racquet_brand !== "Other" ? (
                            <select 
                              required
                              value={newJob.racquet_model}
                              onChange={e => setNewJob({...newJob, racquet_model: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select Model</option>
                              {RACQUET_MODELS[newJob.racquet_brand]?.map(model => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              placeholder="Enter Model" 
                              required
                              value={newJob.racquet_model}
                              onChange={e => setNewJob({...newJob, racquet_model: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          )}
                          {newJob.racquet_model === "Other" && (
                            <input 
                              type="text" 
                              placeholder="Enter Model" 
                              required
                              className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                              onChange={e => setNewJob({...newJob, racquet_model_custom: e.target.value})}
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Serial Number (Optional)" 
                          value={newJob.racquet_serial}
                          onChange={e => setNewJob({...newJob, racquet_serial: e.target.value})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input 
                          type="number" 
                          placeholder="Head Size (sq in)" 
                          value={newJob.racquet_head_size || ""}
                          onChange={e => setNewJob({...newJob, racquet_head_size: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="number" 
                          placeholder="Mains (e.g. 16)" 
                          value={newJob.racquet_mains || ""}
                          onChange={e => setNewJob({...newJob, racquet_mains: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input 
                          type="number" 
                          placeholder="Crosses (e.g. 19)" 
                          value={newJob.racquet_crosses || ""}
                          onChange={e => setNewJob({...newJob, racquet_crosses: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <select 
                      required
                      value={selectedRacquetId}
                      onChange={e => {
                        const rid = e.target.value;
                        setSelectedRacquetId(rid);
                        const racquet = racquets.find(r => r.id === rid);
                        if (racquet) {
                          setNewJob({
                            ...newJob,
                            string_main: racquet.current_string_main || "",
                            string_cross: racquet.current_string_cross || "",
                            tension_main: racquet.current_tension_main || 0,
                            tension_cross: racquet.current_tension_cross || 0,
                            keep_same_string: !!racquet.current_string_main
                          });
                        }
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choose a racquet...</option>
                      {filteredRacquets.map(r => (
                        <option key={r.id} value={r.id}>{r.brand} {r.model} (SN: {r.serial_number || 'N/A'})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Job Details */}
              <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Stringing Details</h3>
                  {selectedRacquetId && !isNewRacquet && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={newJob.keep_same_string}
                        onChange={e => setNewJob({...newJob, keep_same_string: e.target.checked})}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-primary">Keep same string & tension</span>
                    </label>
                  )}
                </div>

                <div className={`space-y-4 transition-opacity ${newJob.keep_same_string ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main String Brand</label>
                      <select 
                        required={!newJob.keep_same_string}
                        value={newJob.string_main_brand}
                        onChange={e => setNewJob({...newJob, string_main_brand: e.target.value, string_main_model: ""})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Brand</option>
                        {STRINGS.map(s => (
                          <option key={s.brand} value={s.brand}>{s.brand}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {newJob.string_main_brand === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Brand" 
                          required
                          className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          onChange={e => setNewJob({...newJob, string_main_brand_custom: e.target.value})}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main String Model</label>
                      {newJob.string_main_brand && newJob.string_main_brand !== "Other" ? (
                        <select 
                          required={!newJob.keep_same_string}
                          value={newJob.string_main_model}
                          onChange={e => setNewJob({...newJob, string_main_model: e.target.value})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Model</option>
                          {STRINGS.find(s => s.brand === newJob.string_main_brand)?.models.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Enter Model" 
                          required={!newJob.keep_same_string}
                          value={newJob.string_main_model}
                          onChange={e => setNewJob({...newJob, string_main_model: e.target.value})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      {newJob.string_main_model === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Model" 
                          required
                          className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          onChange={e => setNewJob({...newJob, string_main_model_custom: e.target.value})}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross String Brand</label>
                      <select 
                        required={!newJob.keep_same_string}
                        value={newJob.string_cross_brand}
                        onChange={e => setNewJob({...newJob, string_cross_brand: e.target.value, string_cross_model: ""})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Brand</option>
                        <option value="Same as Mains">Same as Mains</option>
                        {STRINGS.map(s => (
                          <option key={s.brand} value={s.brand}>{s.brand}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {newJob.string_cross_brand === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Brand" 
                          required
                          className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          onChange={e => setNewJob({...newJob, string_cross_brand_custom: e.target.value})}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross String Model</label>
                      {newJob.string_cross_brand && newJob.string_cross_brand !== "Other" && newJob.string_cross_brand !== "Same as Mains" ? (
                        <select 
                          required={!newJob.keep_same_string}
                          value={newJob.string_cross_model}
                          onChange={e => setNewJob({...newJob, string_cross_model: e.target.value})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Model</option>
                          {STRINGS.find(s => s.brand === newJob.string_cross_brand)?.models.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Enter Model" 
                          required={!newJob.keep_same_string && newJob.string_cross_brand !== "Same as Mains"}
                          disabled={newJob.string_cross_brand === "Same as Mains"}
                          value={newJob.string_cross_brand === "Same as Mains" ? "Same as Mains" : newJob.string_cross_model}
                          onChange={e => setNewJob({...newJob, string_cross_model: e.target.value})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      )}
                      {newJob.string_cross_model === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Model" 
                          required
                          className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          onChange={e => setNewJob({...newJob, string_cross_model_custom: e.target.value})}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-4 transition-opacity ${newJob.keep_same_string ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main Tension (lbs)</label>
                    <input 
                      type="number" 
                      required={!newJob.keep_same_string}
                      value={newJob.tension_main || ""}
                      onChange={e => setNewJob({...newJob, tension_main: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross Tension (lbs)</label>
                    <input 
                      type="number" 
                      required={!newJob.keep_same_string}
                      value={newJob.tension_cross || ""}
                      onChange={e => setNewJob({...newJob, tension_cross: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Price ($)</label>
                    <input 
                      type="number" 
                      required
                      value={newJob.price}
                      onChange={e => setNewJob({...newJob, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Notes</label>
                  <textarea 
                    value={newJob.notes}
                    onChange={e => setNewJob({...newJob, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none h-20 resize-none focus:ring-2 focus:ring-primary"
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-neutral-900 pb-2">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating..." : "Create Job"}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewJob(false);
                    setError(null);
                    setNewJob({
                      customer_name: "", customer_email: "", customer_phone: "",
                      racquet_brand: "", racquet_model: "", racquet_brand_custom: "", racquet_model_custom: "",
                      racquet_serial: "", racquet_head_size: 0, racquet_mains: 0, racquet_crosses: 0,
                      string_main_brand: "", string_main_model: "", string_main_brand_custom: "", string_main_model_custom: "",
                      string_cross_brand: "", string_cross_model: "", string_cross_brand_custom: "", string_cross_model_custom: "",
                      string_main: "", string_cross: "", tension_main: 0, tension_cross: 0, price: 25, notes: "",
                      keep_same_string: false
                    });
                    setSelectedCustomerId("");
                    setSelectedRacquetId("");
                    setIsNewCustomer(false);
                    setIsNewRacquet(false);
                  }} 
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'jobs' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-primary">Active Jobs</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="text" 
                      placeholder="Search jobs..." 
                      value={jobSearch}
                      onChange={e => setJobSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <select
                    value={jobStatusFilter}
                    onChange={(e) => setJobStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-bottom border-neutral-200 dark:border-neutral-800">
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Customer / Racquet</th>
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-neutral-900 dark:text-white">{job.customer_name}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">{job.brand} {job.model}</p>
                          {job.notes && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 italic line-clamp-1" title={job.notes}>
                              Note: {job.notes}
                            </p>
                          )}
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{safeFormatDate(job.created_at, 'MMM d, h:mm a')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            job.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {job.payment_status.charAt(0).toUpperCase() + job.payment_status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const racquet = racquets.find(r => r.id === job.racquet_id);
                                if (racquet) setShowQRCodeModal({ 
                                  value: racquet.qr_code, 
                                  label: `${racquet.brand} ${racquet.model}`,
                                  serialNumber: racquet.serial_number
                                });
                              }}
                              className="p-2 text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              title="Print QR Code"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingJob(job)}
                              className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              title="Edit Job"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                const racquet = racquets.find(r => r.id === job.racquet_id);
                                if (racquet) setEditingRacquet(racquet);
                              }}
                              className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              title="Edit Racquet"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {job.status === 'pending' && (
                              <button onClick={() => updateJobStatus(job.id, 'in-progress')} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Start Job">
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}
                            {job.status === 'in-progress' && (
                              <button onClick={() => updateJobStatus(job.id, 'completed')} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Complete Job">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {job.payment_status === 'unpaid' && (
                              <button onClick={() => updatePaymentStatus(job.id, 'paid')} className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors" title="Mark Paid">
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => setDeleteConfirm({ type: 'job', id: job.id, name: `Job for ${job.customer_name}` })}
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredJobs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                          {jobSearch ? "No matching jobs found." : "No active jobs found. Start by adding a customer and racquet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-primary">Customers</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      type="text" 
                      placeholder="Search customers..." 
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-bottom border-neutral-200 dark:border-neutral-800">
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Customer Info</th>
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Racquets</th>
                      <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredCustomers.map((customer) => (
                      <React.Fragment key={customer.id}>
                        <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {expandedCustomerId === customer.id ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-white">{customer.name}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{customer.email || 'No email'}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{customer.phone || 'No phone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-neutral-900 dark:text-white">
                                {racquets.filter(r => r.customer_id === customer.id).length} Saved
                              </p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id);
                                }}
                                className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline"
                              >
                                {expandedCustomerId === customer.id ? 'Hide' : 'Manage'}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'customer', id: customer.id, name: customer.name });
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedCustomerId === customer.id && (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50">
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Saved Racquets</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {racquets.filter(r => r.customer_id === customer.id).map(racquet => (
                                    <div key={racquet.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                      <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white">{racquet.brand} {racquet.model}</p>
                                        <div className="flex gap-3 mt-1">
                                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase">SN: {racquet.serial_number || 'N/A'}</p>
                                          {racquet.head_size > 0 && (
                                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase">Head: {racquet.head_size} sq in</p>
                                          )}
                                          {racquet.string_pattern_mains > 0 && (
                                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase">Pattern: {racquet.string_pattern_mains}x{racquet.string_pattern_crosses}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => setShowQRCodeModal({ 
                                            value: racquet.qr_code, 
                                            label: `${racquet.brand} ${racquet.model}`,
                                            serialNumber: racquet.serial_number
                                          })}
                                          className="p-2 text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                          title="Print QR Code"
                                        >
                                          <Printer className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingRacquet(racquet)}
                                          className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                          title="Edit Racquet"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setDeleteConfirm({ type: 'racquet', id: racquet.id, name: `${racquet.brand} ${racquet.model}` })}
                                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Delete Racquet"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {racquets.filter(r => r.customer_id === customer.id).length === 0 && (
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">No racquets saved for this customer.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                          {customerSearch ? "No matching customers found." : "No customers found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'messages' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-primary">Customer Inquiries</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full uppercase tracking-wider">
                    {messages.length} Total
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900 dark:text-white leading-tight">{msg.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <a href={`mailto:${msg.email}`} className="text-xs text-neutral-500 hover:text-primary flex items-center gap-1 transition-colors">
                                <Mail className="w-3 h-3" />
                                {msg.email}
                              </a>
                              {msg.phone && (
                                <a href={`tel:${msg.phone}`} className="text-xs text-neutral-500 hover:text-primary flex items-center gap-1 transition-colors">
                                  <Phone className="w-3 h-3" />
                                  {msg.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Received {safeFormatDate(msg.created_at, 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 justify-end">
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'message', id: msg.id, name: `Message from ${msg.name}` })}
                          className="p-3 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="Delete Message"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">No messages yet</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Inquiries from your public shop page will appear here.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Actions / Stats */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary mb-4 tracking-tight">Shop Storefront</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Customers can scan this to register and view their jobs at your shop.</p>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl flex justify-center">
              <QRCodeDisplay 
                value={shop?.qr_code} 
                label="Storefront QR" 
                shopName={shop?.name}
                shopPhone={shop?.phone}
              />
            </div>
          </div>

          <div className="bg-primary rounded-2xl p-6 text-white shadow-xl shadow-primary/20">
            <h3 className="text-lg font-semibold mb-4 tracking-tight">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'pending').length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'in-progress').length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-[10px] text-accent font-bold uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'completed').length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Unpaid</p>
                <p className="text-2xl font-bold">{jobs.filter(j => j.payment_status === 'unpaid').length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 col-span-2">
                <p className="text-[10px] text-accent font-bold uppercase tracking-wider">Total Revenue (Paid)</p>
                <p className="text-2xl font-bold">
                  ${jobs
                    .filter(j => j.status === 'completed' && j.payment_status === 'paid')
                    .reduce((acc, j) => acc + (j.price || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
