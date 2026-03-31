import React, { useState, useEffect } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { Plus, Search, Filter, CheckCircle2, Clock, PlayCircle, CreditCard, X, Trash2, Users, Briefcase, Edit2, ChevronRight, ChevronDown, Printer, Package, MessageSquare, Mail, Phone, Send } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { safeFormatDate } from "../lib/utils";

export default function Dashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: 'jobs' | 'customers' | 'messages' }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'messages'>(initialTab);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedCustomerIdForChat, setSelectedCustomerIdForChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
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
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);

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
    string_main_gauge: "",
    string_main_brand_custom: "",
    string_main_model_custom: "",
    string_cross_brand: "",
    string_cross_model: "",
    string_cross_gauge: "",
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
    setActiveTab(initialTab);
  }, [initialTab]);

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
      collection(db, "racquets"),
      where("shop_id", "==", user.shop_id)
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

    // Fetch Inventory Strings
    const inventoryQuery = query(
      collection(db, "inventory"),
      where("shop_id", "==", user.shop_id),
      where("type", "==", "string")
    );
    const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      setInventoryStrings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      unsubscribeShop();
      unsubscribeJobs();
      unsubscribeCustomers();
      unsubscribeRacquets();
      unsubscribeMessages();
      unsubscribeInventory();
    };
  }, [user.shop_id]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!user.shop_id) throw new Error("Shop ID is missing. Please check your profile.");

      const batch = writeBatch(db);
      let finalCustomerId = selectedCustomerId;
      let finalRacquetId = selectedRacquetId;
      let finalCustomerEmail = newJob.customer_email;

      if (isNewCustomer) {
        if (!newJob.customer_name || !newJob.customer_email) {
          throw new Error("Customer name and email are required.");
        }
        // Check if a user with this email already exists as a customer
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", newJob.customer_email), where("role", "==", "customer"));
        const userSnap = await getDocs(q);
        let linkedUid = null;
        if (!userSnap.empty) {
          linkedUid = userSnap.docs[0].id;
        }

        finalCustomerId = uuidv4();
        const customerRef = doc(db, "customers", finalCustomerId);
        batch.set(customerRef, {
          id: finalCustomerId,
          shop_id: user.shop_id,
          name: newJob.customer_name,
          email: newJob.customer_email,
          phone: newJob.customer_phone,
          uid: linkedUid,
          created_at: serverTimestamp()
        });
      } else if (selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (customer) {
          finalCustomerEmail = customer.email;
        }
      } else {
        throw new Error("Please select a customer or add a new one.");
      }

      // Helper to handle "Other" string and add to inventory
      const handleOtherString = async (brand: string, model: string, customBrand: string, customModel: string, gauge: string) => {
        const isOther = brand === "Other" || model === "Other";
        const finalBrand = brand === "Other" ? customBrand : brand;
        const finalModel = model === "Other" ? customModel : model;
        const stringName = `${finalBrand} ${finalModel} ${gauge}`.trim();

        if (isOther && finalBrand && finalModel) {
          const newId = uuidv4();
          // Add to inventory batch
          batch.set(doc(db, "inventory", newId), {
            id: newId,
            shop_id: user.shop_id,
            brand: finalBrand,
            name: finalModel,
            gauge: gauge,
            type: "string",
            sub_type: "set",
            quantity: 1,
            price: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          return stringName;
        }
        return stringName;
      };

      if (isNewRacquet || isNewCustomer) {
        finalRacquetId = uuidv4();
        const racquetRef = doc(db, "racquets", finalRacquetId);
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        if (!brand || !model) throw new Error("Racquet brand and model are required.");

        const stringMain = await handleOtherString(
          newJob.string_main_brand, 
          newJob.string_main_model, 
          newJob.string_main_brand_custom, 
          newJob.string_main_model_custom,
          newJob.string_main_gauge
        );
        
        const stringCross = newJob.string_cross_brand === "Same as Mains" 
          ? stringMain 
          : await handleOtherString(
              newJob.string_cross_brand, 
              newJob.string_cross_model, 
              newJob.string_cross_brand_custom, 
              newJob.string_cross_model_custom,
              newJob.string_cross_gauge
            );

        batch.set(racquetRef, {
          id: finalRacquetId,
          customer_id: finalCustomerId,
          customer_email: finalCustomerEmail,
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
          qr_code: `racquet_${finalRacquetId}`,
          created_at: serverTimestamp()
        });
      } else if (selectedRacquetId) {
        // Update existing racquet with new string info
        const racquetRef = doc(db, "racquets", selectedRacquetId);
        const stringMain = newJob.keep_same_string ? newJob.string_main : await handleOtherString(
          newJob.string_main_brand, 
          newJob.string_main_model, 
          newJob.string_main_brand_custom, 
          newJob.string_main_model_custom,
          newJob.string_main_gauge
        );
        const stringCross = newJob.keep_same_string ? newJob.string_cross : (
          newJob.string_cross_brand === "Same as Mains" ? stringMain : await handleOtherString(
            newJob.string_cross_brand, 
            newJob.string_cross_model, 
            newJob.string_cross_brand_custom, 
            newJob.string_cross_model_custom,
            newJob.string_cross_gauge
          )
        );

        batch.update(racquetRef, {
          current_string_main: stringMain,
          current_string_cross: stringCross,
          current_tension_main: newJob.tension_main,
          current_tension_cross: newJob.tension_cross,
          updated_at: serverTimestamp()
        });
      } else {
        throw new Error("Please select a racquet or add a new one.");
      }

      const jobId = uuidv4();
      const jobRef = doc(db, "jobs", jobId);
      
      const stringMain = newJob.keep_same_string ? newJob.string_main : await handleOtherString(
        newJob.string_main_brand, 
        newJob.string_main_model, 
        newJob.string_main_brand_custom, 
        newJob.string_main_model_custom,
        newJob.string_main_gauge
      );
      const stringCross = newJob.keep_same_string ? newJob.string_cross : (
        newJob.string_cross_brand === "Same as Mains" ? stringMain : await handleOtherString(
          newJob.string_cross_brand, 
          newJob.string_cross_model, 
          newJob.string_cross_brand_custom, 
          newJob.string_cross_model_custom,
          newJob.string_cross_gauge
        )
      );

      batch.set(jobRef, {
        id: jobId,
        racquet_id: finalRacquetId,
        customer_id: finalCustomerId,
        customer_email: finalCustomerEmail,
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

      // Create notification for customer
      if (finalCustomerEmail) {
        const notificationId = uuidv4();
        const racquet = racquets.find(r => r.id === finalRacquetId) || { brand: newJob.racquet_brand, model: newJob.racquet_model };
        batch.set(doc(db, "notifications", notificationId), {
          id: notificationId,
          customer_email: finalCustomerEmail,
          shop_id: user.shop_id,
          job_id: jobId,
          title: "New Job Created",
          message: `A new stringing job has been created for your ${racquet.brand} ${racquet.model}.`,
          read: false,
          created_at: new Date().toISOString()
        });
      }

      await batch.commit();
      
      setShowNewJob(false);
      setNewJob({
        customer_name: "", customer_email: "", customer_phone: "",
        racquet_brand: "", racquet_model: "", racquet_brand_custom: "", racquet_model_custom: "", racquet_serial: "",
        racquet_head_size: 0, racquet_mains: 0, racquet_crosses: 0,
        string_main_brand: "", string_main_model: "", string_main_gauge: "", string_main_brand_custom: "", string_main_model_custom: "",
        string_cross_brand: "", string_cross_model: "", string_cross_gauge: "", string_cross_brand_custom: "", string_cross_model_custom: "",
        string_main: "", string_cross: "", tension_main: 0, tension_cross: 0, price: 25, notes: "",
        keep_same_string: false
      });
      setSelectedCustomerId("");
      setSelectedRacquetId("");
      setIsNewCustomer(false);
      setIsNewRacquet(false);
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create job. Please try again.");
      handleFirestoreError(err, OperationType.WRITE, "create_job");
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

  // Combine static strings with inventory strings
  const allStrings = JSON.parse(JSON.stringify(STRINGS)); // Deep clone to avoid mutating constant
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

      // Update racquet current setup if job is completed
      if (status === 'completed' && job?.racquet_id) {
        await updateDoc(doc(db, "racquets", job.racquet_id), {
          current_string_main: job.string_main || "Not specified",
          current_string_cross: job.string_cross || job.string_main || "Not specified",
          current_tension_main: Number(job.tension_main) || 0,
          current_tension_cross: Number(job.tension_cross || job.tension_main) || 0,
          updated_at: new Date().toISOString()
        });
      }

      if (customer?.email) {
        const notificationId = uuidv4();
        await setDoc(doc(db, "notifications", notificationId), {
          id: notificationId,
          customer_email: customer.email,
          shop_id: user.shop_id,
          job_id: jobId,
          title: `Job Status Updated: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} is now ${status}.`,
          read: false,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}`);
    }
  };

  const updatePaymentStatus = async (jobId: string, payment_status: string) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), { 
        payment_status,
        updated_at: serverTimestamp()
      });

      if (payment_status === 'paid') {
        const job = jobs.find(j => j.id === jobId);
        const racquet = racquets.find(r => r.id === job?.racquet_id);
        const customer = customers.find(c => c.id === racquet?.customer_id);

        if (customer?.email) {
          const notificationId = uuidv4();
          await setDoc(doc(db, "notifications", notificationId), {
            id: notificationId,
            customer_email: customer.email,
            shop_id: user.shop_id,
            job_id: jobId,
            title: "Payment Received",
            message: `Payment for your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} has been received. Thank you!`,
            read: false,
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}/payment`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete customer
      batch.delete(doc(db, "customers", customerId));
      
      // Delete their racquets and jobs
      const racquetsSnap = await getDocs(query(
        collection(db, "racquets"), 
        where("customer_id", "==", customerId),
        where("shop_id", "==", user.shop_id)
      ));
      for (const rDoc of racquetsSnap.docs) {
        batch.delete(doc(db, "racquets", rDoc.id));
        const jobsSnap = await getDocs(query(
          collection(db, "jobs"), 
          where("racquet_id", "==", rDoc.id),
          where("shop_id", "==", user.shop_id)
        ));
        for (const jDoc of jobsSnap.docs) {
          batch.delete(doc(db, "jobs", jDoc.id));
        }
      }
      
      await batch.commit();
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `delete_customer/${customerId}`);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, "jobs", jobId));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `jobs/${jobId}`);
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
        current_tension_cross: editingRacquet.current_tension_cross,
        updated_at: serverTimestamp()
      });
      setEditingRacquet(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `racquets/${editingRacquet.id}`);
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
      handleFirestoreError(err, OperationType.UPDATE, `jobs/${editingJob.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRacquet = async (racquetId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "racquets", racquetId));
      const jobsSnap = await getDocs(query(
        collection(db, "jobs"), 
        where("racquet_id", "==", racquetId),
        where("shop_id", "==", user.shop_id)
      ));
      for (const jDoc of jobsSnap.docs) {
        batch.delete(doc(db, "jobs", jDoc.id));
      }
      await batch.commit();
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `delete_racquet/${racquetId}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, "messages", messageId));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerIdForChat || !newMessage.trim() || !user.shop_id) return;

    setSendingMessage(true);
    try {
      const messageId = uuidv4();
      const customer = customers.find(c => c.id === selectedCustomerIdForChat);
      await setDoc(doc(db, "messages", messageId), {
        id: messageId,
        shop_id: user.shop_id,
        customer_id: selectedCustomerIdForChat,
        customer_email: customer?.email || "",
        sender_id: user.uid,
        sender_name: shop?.name || "Shop",
        sender_role: 'stringer',
        content: newMessage.trim(),
        created_at: serverTimestamp(),
        read: false
      });
      setNewMessage("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "messages");
    } finally {
      setSendingMessage(false);
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
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Brand</option>
                        {allStrings.map((s: any) => (
                          <option key={s.brand} value={s.brand}>{s.brand}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {newJob.string_main_brand === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Brand" 
                          required
                          value={newJob.string_main_brand_custom}
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
                          {allStrings.find((s: any) => s.brand === newJob.string_main_brand)?.models.map((model: string) => (
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
                          value={newJob.string_main_model_custom}
                          className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          onChange={e => setNewJob({...newJob, string_main_model_custom: e.target.value})}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Main Gauge</label>
                      <select 
                        required={!newJob.keep_same_string}
                        value={newJob.string_main_gauge}
                        onChange={e => setNewJob({...newJob, string_main_gauge: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Gauge</option>
                        {GAUGES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Cross Gauge</label>
                      <select 
                        required={!newJob.keep_same_string && newJob.string_cross_brand !== "Same as Mains"}
                        disabled={newJob.string_cross_brand === "Same as Mains"}
                        value={newJob.string_cross_brand === "Same as Mains" ? newJob.string_main_gauge : newJob.string_cross_gauge}
                        onChange={e => setNewJob({...newJob, string_cross_gauge: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="">Select Gauge</option>
                        {GAUGES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
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
                        {allStrings.map((s: any) => (
                          <option key={s.brand} value={s.brand}>{s.brand}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {newJob.string_cross_brand === "Other" && (
                        <input 
                          type="text" 
                          placeholder="Enter Brand" 
                          required
                          value={newJob.string_cross_brand_custom}
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
                          {allStrings.find((s: any) => s.brand === newJob.string_cross_brand)?.models.map((model: string) => (
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
                          value={newJob.string_cross_model_custom}
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
                      string_main_brand: "", string_main_model: "", string_main_gauge: "", string_main_brand_custom: "", string_main_model_custom: "",
                      string_cross_brand: "", string_cross_model: "", string_cross_gauge: "", string_cross_brand_custom: "", string_cross_model_custom: "",
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
          {activeTab === 'jobs' && (
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
          )}
          {activeTab === 'customers' && (
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
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomerIdForChat(customer.id);
                                  setActiveTab('messages');
                                }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Message Customer"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
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
                            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
              {/* Customer List */}
              <div className="md:col-span-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                  <h3 className="font-bold text-primary">Conversations</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {/* Derive unique customers from messages or use existing customers list */}
                  {customers.map(customer => {
                    const lastMsg = [...messages].filter(m => m.customer_id === customer.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                    const unread = messages.filter(m => m.customer_id === customer.id && m.sender_role === 'customer' && !m.read).length;
                    
                    return (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomerIdForChat(customer.id)}
                        className={`w-full text-left p-3 rounded-2xl transition-all relative ${selectedCustomerIdForChat === customer.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm truncate">{customer.name}</p>
                          {unread > 0 && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                        </div>
                        {lastMsg && (
                          <p className={`text-[10px] truncate mt-0.5 ${selectedCustomerIdForChat === customer.id ? 'text-white/70' : 'text-neutral-400'}`}>
                            {lastMsg.content || lastMsg.message}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {customers.length === 0 && (
                    <p className="text-center text-xs text-neutral-400 p-4">No customers yet</p>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="md:col-span-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
                {selectedCustomerIdForChat ? (
                  <>
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customers.find(c => c.id === selectedCustomerIdForChat)?.name?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-primary">{customers.find(c => c.id === selectedCustomerIdForChat)?.name}</h3>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Customer</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'message', id: selectedCustomerIdForChat, name: `Conversation with ${customers.find(c => c.id === selectedCustomerIdForChat)?.name}` })}
                          className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30 dark:bg-neutral-900/30">
                      {[...messages].filter(m => m.customer_id === selectedCustomerIdForChat).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex ${msg.sender_role === 'stringer' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                            msg.sender_role === 'stringer' 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-100 dark:border-neutral-700 rounded-tl-none'
                          }`}>
                            <p className="text-sm leading-relaxed">
                              {msg.content || msg.message}
                              {msg.title && <span className="block font-bold mt-1 text-xs opacity-80">{msg.title}</span>}
                            </p>
                            <div className="flex items-center justify-between gap-4 mt-2">
                              <p className={`text-[10px] ${msg.sender_role === 'stringer' ? 'text-white/60' : 'text-neutral-400'}`}>
                                {safeFormatDate(msg.created_at, 'h:mm a')}
                              </p>
                              {msg.sender_role === 'stringer' && msg.read && (
                                <CheckCircle2 className="w-3 h-3 text-white/60" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {messages.filter(m => m.customer_id === selectedCustomerIdForChat).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-40">
                          <MessageSquare className="w-12 h-12 mb-2" />
                          <p className="text-sm">No messages yet. Start the conversation!</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                    <h3 className="text-lg font-bold text-neutral-300 dark:text-neutral-600">Select a conversation</h3>
                    <p className="text-sm max-w-xs">Choose a customer from the list to view your messages or start a new conversation.</p>
                  </div>
                )}
              </div>
            </div>
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
