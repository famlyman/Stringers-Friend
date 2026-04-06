import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { racquetSpecsService } from "../services/racquetSpecsService";
import { Plus, Search, Filter, CheckCircle2, Clock, PlayCircle, CreditCard, X, Trash2, Users, Briefcase, Edit2, ChevronRight, ChevronDown, Printer, Package, MessageSquare, Mail, Phone, Send, Scan, AlertTriangle, History, RefreshCw } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { QrScanner } from "../components/QrScanner";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, serverTimestamp, orderBy, getDoc, limit, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, requestNotificationPermission } from "../lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { safeFormatDate } from "../lib/utils";

export default function Dashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: 'jobs' | 'customers' | 'messages' | 'inventory' }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'messages' | 'inventory'>(initialTab);
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [regeneratingQR, setRegeneratingQR] = useState(false);

  useEffect(() => {
    if (!user.shop_id) return;

    const q = query(
      collection(db, "inventory"),
      where("shop_id", "==", user.shop_id),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventoryItems(items);
      setInventoryStrings(items.filter((i: any) => i.type === 'string'));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "inventory");
    });

    return () => unsubscribe();
  }, [user.shop_id]);

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
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRacquetId, setSelectedRacquetId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isNewRacquet, setIsNewRacquet] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchingModels, setSearchingModels] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [selectedCrossInventoryId, setSelectedCrossInventoryId] = useState("");



  const customModels = useMemo(() => {
    const models: Record<string, string[]> = {};
    racquets.forEach(r => {
      if (r.brand && r.model) {
        if (!models[r.brand]) models[r.brand] = [];
        if (!models[r.brand].includes(r.model)) {
          // Only add if it's not already in the hardcoded list
          if (!RACQUET_MODELS[r.brand]?.includes(r.model)) {
            models[r.brand].push(r.model);
          }
        }
      }
    });
    return models;
  }, [racquets]);

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
    racquet_mains_skip: "",
    racquet_mains_tie_off: "",
    racquet_crosses_start: "",
    racquet_crosses_tie_off: "",
    racquet_one_piece_length: "",
    racquet_two_piece_length: "",
    racquet_stringing_instructions: "",
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
    service_type: "string_full_bed",
    custom_service_category: "string",
    additional_service_request: "",
    notes: "",
    keep_same_string: false
  });

  const handleScan = useCallback((decodedText: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    
    let actualValue = decodedText;
    if (decodedText.includes("/scan/")) {
      actualValue = decodedText.split("/scan/").pop() || decodedText;
    }
    
    // Handle the case where the scanned value might be a URL or just the ID
    // The console shows: racquet_a43f98fa-2481-414f-a134-eebe18aee317
    // But the code expects "racquet:ID"
    
    let type = "";
    let id = "";
    
    if (actualValue.startsWith("job:")) {
      type = "job";
      id = actualValue.split(":")[1];
    } else if (actualValue.startsWith("racquet:")) {
      type = "racquet";
      id = actualValue.split(":")[1];
    } else if (actualValue.startsWith("racquet_")) {
      type = "racquet";
      id = actualValue; // The ID itself is "racquet_..."
    } else if (actualValue.startsWith("job_")) {
      type = "job";
      id = actualValue; // The ID itself is "job_..."
    } else {
      // Fallback: assume it's a racquet ID if it starts with racquet_
      if (actualValue.includes("racquet_")) {
        type = "racquet";
        id = actualValue;
      } else if (actualValue.includes("job_")) {
        type = "job";
        id = actualValue;
      }
    }

    console.log("Processing scan:", { type, id });

    if (type === "job") {
      const job = jobs.find(j => j.id === id);
      console.log("Job found:", job);
      
      // Ensure scanner is closed regardless of finding a job or racquet
      setShowScanner(false);
      
      if (job) {
        setEditingJob(job);
      } else {
        console.log("Job not found in jobs list:", jobs);
      }
    } else if (type === "racquet") {
      // Remove prefix if present to match ID in database
      const cleanId = id.replace('racquet_', '');
      console.log("Searching for racquet ID:", cleanId);
      
      const job = jobs.find(j => j.racquet_id === cleanId && j.status !== 'completed');
      console.log("Job found for racquet:", job);
      
      // Ensure scanner is closed regardless of finding a job or racquet
      setShowScanner(false);
      
      if (job) {
        setEditingJob(job);
      } else {
        const racquet = racquets.find(r => r.id === cleanId);
        console.log("Racquet found:", racquet);
        if (racquet) {
          const customer = customers.find(c => c.id === racquet.customer_id);
          setSelectedCustomerId(racquet.customer_id);
          setSelectedRacquetId(racquet.id);
          setNewJob({
            ...newJob,
            customer_name: customer?.name || "",
            customer_email: customer?.email || "",
            customer_phone: customer?.phone || "",
            racquet_brand: racquet.brand || "",
            racquet_model: racquet.model || "",
            racquet_serial: racquet.serial_number || "",
            racquet_head_size: racquet.head_size || 0,
            racquet_mains: racquet.string_pattern_mains || 0,
            racquet_crosses: racquet.string_pattern_crosses || 0,
            racquet_stringing_instructions: racquet.stringing_instructions || "",
            string_main_model: racquet.current_string_main || "",
            string_cross_model: racquet.current_string_cross || "",
            tension_main: racquet.current_tension_main || 0,
            tension_cross: racquet.current_tension_cross || 0,
            notes: "",
            keep_same_string: false
          });
          setShowNewJob(true);
        } else {
          console.log("Racquet not found in racquets list:", racquets);
        }
      }
    }
    
    setIsProcessingScan(false);
  }, [jobs, racquets, customers, newJob, setEditingJob, setShowScanner, setSelectedCustomerId, setSelectedRacquetId, setShowNewJob, setNewJob, isProcessingScan]);

  const handleFetchSpecs = async (brandParam?: string, modelParam?: string, isEditing: boolean = false) => {
    const brand = brandParam || (isEditing 
      ? editingRacquet.brand 
      : (newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand));
    const model = modelParam || (isEditing 
      ? editingRacquet.model 
      : (newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model));

    if (!brand || !model) {
      setError("Please select a brand and model first.");
      return;
    }

    setFetchingSpecs(true);
    setError(null);
    try {
      const specs = await racquetSpecsService.getSpecs(brand, model);
      if (specs) {
        if (isEditing) {
          setEditingRacquet(prev => ({
            ...prev,
            head_size: specs.headSize,
            string_pattern_mains: specs.patternMains,
            string_pattern_crosses: specs.patternCrosses,
            mains_skip: specs.mainsSkip || "",
            mains_tie_off: specs.mainsTieOff || "",
            crosses_start: specs.crossesStart || "",
            crosses_tie_off: specs.crossesTieOff || "",
            one_piece_length: specs.onePieceLength || "",
            two_piece_length: specs.twoPieceLength || "",
            stringing_instructions: specs.stringingInstructions || ""
          }));
        } else {
          setNewJob(prev => ({
            ...prev,
            racquet_head_size: specs.headSize,
            racquet_mains: specs.patternMains,
            racquet_crosses: specs.patternCrosses,
            racquet_mains_skip: specs.mainsSkip || "",
            racquet_mains_tie_off: specs.mainsTieOff || "",
            racquet_crosses_start: specs.crossesStart || "",
            racquet_crosses_tie_off: specs.crossesTieOff || "",
            racquet_one_piece_length: specs.onePieceLength || "",
            racquet_two_piece_length: specs.twoPieceLength || "",
            racquet_stringing_instructions: specs.stringingInstructions || "",
            notes: prev.notes + (prev.notes ? "\n" : "") + `Recommended Tension: ${specs.tensionRangeMin}-${specs.tensionRangeMax} lbs`
          }));
        }
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

  const handleSearchModels = async (query: string, isEditing = false) => {
    const brand = isEditing 
      ? editingRacquet.brand 
      : (newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand);
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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user?.uid) {
      requestNotificationPermission(user.uid);
    }
  }, [user?.uid]);

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
      orderBy("created_at", "asc")
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

  // Mark messages as read when a conversation is selected
  useEffect(() => {
    if (selectedCustomerIdForChat && activeTab === 'messages') {
      const unreadMessages = messages.filter(
        m => m.customer_id === selectedCustomerIdForChat && m.sender_role !== 'stringer' && !m.read
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
  }, [selectedCustomerIdForChat, activeTab, messages]);

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
            packaging: "set",
            quantity: 1,
            price: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          return { name: stringName, id: newId };
        }
        
        // Find existing inventory ID if not "Other"
        const existingItem = inventoryStrings.find(i => 
          i.brand === finalBrand && i.name === finalModel && i.gauge === gauge
        );
        
        return { name: stringName, id: existingItem?.id || selectedInventoryId || "" };
      };

      if (isNewRacquet || isNewCustomer) {
        finalRacquetId = uuidv4();
        const racquetRef = doc(db, "racquets", finalRacquetId);
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        if (!brand || !model) throw new Error("Racquet brand and model are required.");

        const mainStringData = await handleOtherString(
          newJob.string_main_brand, 
          newJob.string_main_model, 
          newJob.string_main_brand_custom, 
          newJob.string_main_model_custom,
          newJob.string_main_gauge
        );
        
        const crossStringData = newJob.string_cross_brand === "Same as Mains" 
          ? mainStringData 
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
          head_size: Number(newJob.racquet_head_size) || 0,
          string_pattern_mains: Number(newJob.racquet_mains) || 0,
          string_pattern_crosses: Number(newJob.racquet_crosses) || 0,
          mains_skip: newJob.racquet_mains_skip,
          mains_tie_off: newJob.racquet_mains_tie_off,
          crosses_start: newJob.racquet_crosses_start,
          crosses_tie_off: newJob.racquet_crosses_tie_off,
          one_piece_length: newJob.racquet_one_piece_length || "",
          two_piece_length: newJob.racquet_two_piece_length || "",
          stringing_instructions: newJob.racquet_stringing_instructions,
          current_string_main: mainStringData.name,
          current_string_cross: crossStringData.name,
          current_tension_main: Number(newJob.tension_main) || 0,
          current_tension_cross: Number(newJob.tension_cross) || 0,
          qr_code: `racquet_${finalRacquetId}`,
          created_at: serverTimestamp()
        });
      } else if (selectedRacquetId) {
        // Update existing racquet with new string info
        const racquetRef = doc(db, "racquets", selectedRacquetId);
        const mainStringData = newJob.keep_same_string ? { name: newJob.string_main, id: "" } : await handleOtherString(
          newJob.string_main_brand, 
          newJob.string_main_model, 
          newJob.string_main_brand_custom, 
          newJob.string_main_model_custom,
          newJob.string_main_gauge
        );
        const crossStringData = newJob.keep_same_string ? { name: newJob.string_cross, id: "" } : (
          newJob.string_cross_brand === "Same as Mains" ? mainStringData : await handleOtherString(
            newJob.string_cross_brand, 
            newJob.string_cross_model, 
            newJob.string_cross_brand_custom, 
            newJob.string_cross_model_custom,
            newJob.string_cross_gauge
          )
        );

        batch.update(racquetRef, {
          current_string_main: mainStringData.name,
          current_string_cross: crossStringData.name,
          current_tension_main: Number(newJob.tension_main) || 0,
          current_tension_cross: Number(newJob.tension_cross) || 0,
          updated_at: serverTimestamp()
        });
      } else {
        throw new Error("Please select a racquet or add a new one.");
      }

      const jobId = uuidv4();
      const jobRef = doc(db, "jobs", jobId);
      
      const mainStringData = newJob.keep_same_string ? { name: newJob.string_main, id: "" } : await handleOtherString(
        newJob.string_main_brand, 
        newJob.string_main_model, 
        newJob.string_main_brand_custom, 
        newJob.string_main_model_custom,
        newJob.string_main_gauge
      );
      const crossStringData = newJob.keep_same_string ? { name: newJob.string_cross, id: "" } : (
        newJob.string_cross_brand === "Same as Mains" ? mainStringData : await handleOtherString(
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
        string_main: mainStringData.name,
        string_cross: crossStringData.name,
        inventory_id: mainStringData.id || selectedInventoryId || "",
        cross_inventory_id: crossStringData.id || selectedCrossInventoryId || "",
        tension_main: Number(newJob.tension_main) || 0,
        tension_cross: Number(newJob.tension_cross) || 0,
        price: Number(newJob.price) || 0,
        payment_status: "unpaid",
        service_type: newJob.service_type,
        custom_service_category: newJob.service_type === 'custom' ? newJob.custom_service_category : "",
        additional_service_request: newJob.service_type === 'custom' ? newJob.additional_service_request : "",
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
          type: "other",
          title: "New Job Created",
          message: `A new stringing job has been created for your ${racquet.brand} ${racquet.model}.`,
          read: false,
          created_at: serverTimestamp()
        });

        // Send Push Notification
      try {
        const customerSnap = await getDocs(query(collection(db, "users"), where("email", "==", finalCustomerEmail), limit(1)));
        if (!customerSnap.empty) {
          const customerData = customerSnap.docs[0].data();
          if (customerData.fcmToken) {
            await fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: customerData.fcmToken,
                title: "New Job Created",
                body: `A new stringing job has been created for your ${racquet.brand} ${racquet.model}.`,
                data: { type: "job", job_id: jobId }
              })
            });
          }
        }
      } catch (pushErr) {
        console.error("Error sending push notification:", pushErr);
      }
    }

    await batch.commit();
    
    setShowNewJob(false);
    setSelectedInventoryId("");
    setSelectedCrossInventoryId("");
    setNewJob({
      customer_name: "", customer_email: "", customer_phone: "",
      racquet_brand: "", racquet_model: "", racquet_brand_custom: "", racquet_model_custom: "", racquet_serial: "",
      racquet_head_size: 0, racquet_mains: 0, racquet_crosses: 0,
      racquet_mains_skip: "", racquet_mains_tie_off: "", racquet_crosses_start: "", racquet_crosses_tie_off: "",
      racquet_one_piece_length: "", racquet_two_piece_length: "", racquet_stringing_instructions: "",
      string_main_brand: "", string_main_model: "", string_main_gauge: "", string_main_brand_custom: "", string_main_model_custom: "",
      string_cross_brand: "", string_cross_model: "", string_cross_gauge: "", string_cross_brand_custom: "", string_cross_model_custom: "",
      string_main: "", string_cross: "", tension_main: 0, tension_cross: 0, price: 25, 
      service_type: "string_full_bed",
      custom_service_category: "string",
      additional_service_request: "",
      notes: "",
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
    (j.customer_name || "").toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.brand || "").toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.model || "").toLowerCase().includes(jobSearch.toLowerCase())
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
    (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const deductFromInventory = (batch: any, itemId: string, lengthNeeded: number = 12) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const itemRef = doc(db, "inventory", itemId);
    if (item.packaging === 'reel') {
      if (item.remaining_length >= lengthNeeded) {
        batch.update(itemRef, {
          remaining_length: item.remaining_length - lengthNeeded,
          updated_at: serverTimestamp()
        });
      } else if (item.quantity > 0) {
        // Use a new reel
        batch.update(itemRef, {
          quantity: item.quantity - 1,
          remaining_length: item.total_length - lengthNeeded,
          updated_at: serverTimestamp()
        });
      } else {
        // No reels left and not enough length on current reel
        batch.update(itemRef, {
          remaining_length: Math.max(0, item.remaining_length - lengthNeeded),
          updated_at: serverTimestamp()
        });
      }
    } else {
      // It's a set
      // If lengthNeeded is 12 (full set), deduct 1
      // If lengthNeeded is 6 (half set), deduct 0.5
      const deduction = lengthNeeded >= 12 ? 1 : 0.5;
      if (item.quantity >= deduction) {
        batch.update(itemRef, {
          quantity: item.quantity - deduction,
          updated_at: serverTimestamp()
        });
      } else {
          // Still deduct but floor at 0
          batch.update(itemRef, {
          quantity: Math.max(0, item.quantity - deduction),
          updated_at: serverTimestamp()
        });
      }
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      const racquet = racquets.find(r => r.id === job?.racquet_id);
      const customer = customers.find(c => c.id === racquet?.customer_id);

      if (!job) return;

      const batch = writeBatch(db);

      // Only deduct if status is changing TO completed and wasn't already completed
      if (status === 'completed' && job.status !== 'completed') {
        const invId = job.inventory_id;
        const crossInvId = job.cross_inventory_id;
        const serviceType = job.service_type;

        if (serviceType === 'string_hybrid') {
          // Hybrid: 6m or 0.5 set from each
          if (invId) deductFromInventory(batch, invId, 6);
          if (crossInvId) deductFromInventory(batch, crossInvId, 6);
        } else if (serviceType === 'custom') {
          if (job.custom_service_category === 'string') {
             if (invId) deductFromInventory(batch, invId, 12);
          }
        } else if (serviceType && serviceType.includes('string')) {
          // All other string services (full bed, string+grip, etc.)
          if (invId) deductFromInventory(batch, invId, 12);
        } else {
          // Fallback for old jobs or if serviceType is missing but invId exists
          if (invId && crossInvId) {
            if (invId === crossInvId) {
              deductFromInventory(batch, invId, 12);
            } else {
              deductFromInventory(batch, invId, 6);
              deductFromInventory(batch, crossInvId, 6);
            }
          } else if (invId) {
            deductFromInventory(batch, invId, 12);
          }
        }
      }

      batch.update(doc(db, "jobs", jobId), { 
        status,
        updated_at: serverTimestamp()
      });

      // Update racquet current setup if job is completed
      if (status === 'completed' && job?.racquet_id) {
        batch.update(doc(db, "racquets", job.racquet_id), {
          current_string_main: job.string_main || "Not specified",
          current_string_cross: job.string_cross || job.string_main || "Not specified",
          current_tension_main: Number(job.tension_main) || 0,
          current_tension_cross: Number(job.tension_cross || job.tension_main) || 0,
          updated_at: new Date().toISOString()
        });
      }

      await batch.commit();

      if (customer?.email) {
        const notificationId = uuidv4();
        await setDoc(doc(db, "notifications", notificationId), {
          id: notificationId,
          customer_email: customer.email,
          shop_id: user.shop_id,
          job_id: jobId,
          type: "other",
          title: `Job Status Updated: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} is now ${status}.`,
          read: false,
          created_at: serverTimestamp()
        });

        // Send Push Notification
        try {
          const customerSnap = await getDocs(query(collection(db, "users"), where("email", "==", customer.email), limit(1)));
          if (!customerSnap.empty) {
            const customerData = customerSnap.docs[0].data();
            if (customerData.fcmToken) {
              await fetch("/api/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: customerData.fcmToken,
                  title: `Job Status Updated: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                  body: `Your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} is now ${status}.`,
                  data: { type: "job", job_id: jobId }
                })
              });
            }
          }
        } catch (pushErr) {
          console.error("Error sending push notification:", pushErr);
        }
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
            type: "other",
            title: "Payment Received",
            message: `Payment for your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} has been received. Thank you!`,
            read: false,
            created_at: serverTimestamp()
          });

          // Send Push Notification
          try {
            const customerSnap = await getDocs(query(collection(db, "users"), where("email", "==", customer.email), limit(1)));
            if (!customerSnap.empty) {
              const customerData = customerSnap.docs[0].data();
              if (customerData.fcmToken) {
                await fetch("/api/send-notification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: customerData.fcmToken,
                    title: "Payment Received",
                    body: `Payment for your ${racquet?.brand || 'racquet'} ${racquet?.model || ''} has been received.`,
                    data: { type: "job", job_id: jobId }
                  })
                });
              }
            }
          } catch (pushErr) {
            console.error("Error sending push notification:", pushErr);
          }
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

  const handleDeleteConversation = async (customerId: string) => {
    try {
      const batch = writeBatch(db);
      const conversationSnap = await getDocs(query(
        collection(db, "messages"),
        where("customer_id", "==", customerId),
        where("shop_id", "==", user.shop_id)
      ));
      
      conversationSnap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
      setDeleteConfirm(null);
      setSelectedCustomerIdForChat(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `delete_conversation/${customerId}`);
    }
  };

  const handleRegenerateQR = async () => {
    if (!shop || regeneratingQR) return;
    
    // Use existing slug if available, otherwise generate from shop name
    const shopSlug = shop.slug || shop.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    setRegeneratingQR(true);
    try {
      const updateData: any = {
        qr_code: shopSlug
      };
      
      // Only add slug if it doesn't exist
      if (!shop.slug) {
        updateData.slug = shopSlug;
      }
      
      await updateDoc(doc(db, "shops", user.shop_id), updateData);
      
      // Shop will be updated automatically via the onSnapshot listener
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "regenerate_qr");
    } finally {
      setRegeneratingQR(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerIdForChat || !newMessage.trim() || !user.shop_id) return;

    setSendingMessage(true);
    try {
      const messageId = uuidv4();
      const customer = customers.find(c => c.id === selectedCustomerIdForChat);
      const isEmailChat = !customer && selectedCustomerIdForChat.includes('@');
      
      await setDoc(doc(db, "messages", messageId), {
        id: messageId,
        shop_id: user.shop_id,
        customer_id: customer ? selectedCustomerIdForChat : null,
        customer_email: customer?.email || (isEmailChat ? selectedCustomerIdForChat : ""),
        sender_id: user.uid,
        sender_name: shop?.name || "Shop",
        sender_role: 'stringer',
        content: newMessage.trim(),
        created_at: serverTimestamp(),
        read: false
      });

      // Send Push Notification to Customer
      try {
        let customerData = null;
        if (customer?.uid) {
          const customerDoc = await getDoc(doc(db, "users", customer.uid));
          if (customerDoc.exists()) {
            customerData = customerDoc.data();
          }
        }
        
        if (!customerData && customer?.email) {
          // If no UID or doc not found, try fetching by email
          const customerSnap = await getDocs(query(collection(db, "users"), where("email", "==", customer.email), limit(1)));
          if (!customerSnap.empty) {
            customerData = customerSnap.docs[0].data();
          }
        }

        if (customerData?.fcmToken) {
          await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: customerData.fcmToken,
              title: `New message from ${shop?.name || "your stringer"}`,
              body: newMessage.trim(),
              data: { type: "message", shop_id: user.shop_id }
            })
          });
        }
      } catch (pushErr) {
        console.error("Error sending push notification:", pushErr);
      }

      setNewMessage("");

      // Create in-app notification for customer
      if (customer?.email) {
        const notificationId = uuidv4();
        await setDoc(doc(db, "notifications", notificationId), {
          id: notificationId,
          customer_email: customer.email,
          shop_id: user.shop_id,
          type: "other",
          title: "New Message",
          message: `You have a new message from ${shop?.name || "your stringer"}.`,
          read: false,
          created_at: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "messages");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-1/4"></div>
      <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
    </div>
  );

  return (
    <React.Fragment>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">{shop?.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage your shop operations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center px-4 py-2 bg-white dark:bg-neutral-800 text-primary border border-primary rounded-xl font-bold hover:bg-primary/5 shadow-sm transition-all active:scale-95 text-sm sm:text-base"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scan QR
          </button>
          <button 
            onClick={() => setShowNewJob(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 mr-2 text-secondary" />
            New Job
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('jobs')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'jobs' ? 'bg-white dark:bg-neutral-900 text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Jobs
        </button>
        <button 
          onClick={() => setActiveTab('customers')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'customers' ? 'bg-white dark:bg-neutral-900 text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Customers
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-white dark:bg-neutral-900 text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Messages
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-neutral-900 text-primary shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Inventory
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border-main">
            <h3 className="text-xl font-bold text-primary mb-2">Confirm Delete</h3>
            <p className="text-text-muted mb-6 leading-relaxed">
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
                  else if (deleteConfirm.type === 'message') handleDeleteConversation(deleteConfirm.id);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-text-muted py-2 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setShowScanner(false)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Scan QR Code</h2>
              <p className="text-sm text-neutral-500 mt-1">Point your camera at a racquet or job QR code</p>
            </div>
            {showScanner && <QrScanner onScan={handleScan} />}
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setShowScanner(false)}
                className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Close Scanner
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
                      value={editingRacquet.brand || ""}
                      onChange={e => setEditingRacquet({...editingRacquet, brand: e.target.value})}
                      className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Model</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search or enter model" 
                      required
                      value={editingRacquet.model || ""}
                      onChange={e => {
                        setEditingRacquet({...editingRacquet, model: e.target.value});
                        handleSearchModels(e.target.value, true);
                      }}
                      onFocus={() => (editingRacquet.model || "").length >= 2 && setShowModelSuggestions(true)}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                    {searchingModels && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                  </div>
                  
                  {showModelSuggestions && modelSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {modelSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                          onClick={() => {
                            setEditingRacquet({...editingRacquet, model: suggestion});
                            setShowModelSuggestions(false);
                            handleFetchSpecs(editingRacquet.brand, suggestion, true);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleFetchSpecs(editingRacquet.brand, editingRacquet.model, true)}
                    disabled={!editingRacquet.brand || !editingRacquet.model || fetchingSpecs}
                    className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Search className="w-3 h-3" />
                    {fetchingSpecs ? "Searching..." : "Search Technical Specs"}
                  </button>
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
                    value={STRINGS.find(brand => editingRacquet.current_string_main?.startsWith(brand.brand))?.brand || ""}
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
                      value={(editingRacquet.current_string_main?.split(' ').slice(1, -1).join(' ') || "")}
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
                    value={editingRacquet.current_string_cross === editingRacquet.current_string_main ? "Same as Mains" : (STRINGS.find(brand => editingRacquet.current_string_cross?.startsWith(brand.brand))?.brand || "")}
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
                      value={(editingRacquet.current_string_cross?.split(' ').slice(1, -1).join(' ') || "")}
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
                        <div className="relative">
                          <label className="block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Model</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input 
                                type="text" 
                                placeholder="Search or Enter Model" 
                                required
                                value={newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (newJob.racquet_brand && newJob.racquet_brand !== "Other") {
                                    setNewJob({...newJob, racquet_model: val, racquet_model_custom: val});
                                    if (val.length >= 2) handleSearchModels(val);
                                  } else {
                                    setNewJob({...newJob, racquet_model: val, racquet_model_custom: val});
                                  }
                                }}
                                onFocus={() => {
                                  if (modelSuggestions.length > 0) setShowModelSuggestions(true);
                                }}
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                              />
                              {showModelSuggestions && modelSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {modelSuggestions.map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setNewJob({...newJob, racquet_model: suggestion, racquet_model_custom: suggestion});
                                        setShowModelSuggestions(false);
                                        handleFetchSpecs(newJob.racquet_brand, suggestion, false);
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
                          
                          {(newJob.racquet_brand && (newJob.racquet_model || newJob.racquet_model_custom)) && (
                            <button
                              type="button"
                              onClick={() => handleFetchSpecs()}
                              disabled={fetchingSpecs}
                              className="mt-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Search className="w-3 h-3" />
                              {fetchingSpecs ? "Searching..." : "Search Technical Specs"}
                            </button>
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

                      {/* Detailed Stringing Specs */}
                      <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Stringing Pattern & Specs</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Skip</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 7H, 9H, 7T, 9T" 
                              value={newJob.racquet_mains_skip}
                              onChange={e => setNewJob({...newJob, racquet_mains_skip: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Tie-off</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 8T" 
                              value={newJob.racquet_mains_tie_off}
                              onChange={e => setNewJob({...newJob, racquet_mains_tie_off: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Start</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Head" 
                              value={newJob.racquet_crosses_start}
                              onChange={e => setNewJob({...newJob, racquet_crosses_start: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Tie-off</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 5H, 11T" 
                              value={newJob.racquet_crosses_tie_off}
                              onChange={e => setNewJob({...newJob, racquet_crosses_tie_off: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">1-Piece Length (ft)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 33" 
                              value={newJob.racquet_one_piece_length}
                              onChange={e => setNewJob({...newJob, racquet_one_piece_length: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">2-Piece Length (ft)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 20/18" 
                              value={newJob.racquet_two_piece_length}
                              onChange={e => setNewJob({...newJob, racquet_two_piece_length: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 mt-4">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Detailed Stringing Instructions</label>
                        <textarea 
                          placeholder="Additional pattern notes, mounting instructions, etc..." 
                          value={newJob.racquet_stringing_instructions}
                          onChange={e => setNewJob({...newJob, racquet_stringing_instructions: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
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
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Service Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'string_full_bed', label: 'String Job Full Bed' },
                      { id: 'string_hybrid', label: 'String Job Hybrid' },
                      { id: 'string_grip', label: 'String and Grip' },
                      { id: 'string_dampener', label: 'String and Dampener' },
                      { id: 'string_grip_dampener', label: 'String with Grip and Dampener' },
                      { id: 'custom', label: 'Custom' }
                    ].map((type) => (
                      <label 
                        key={type.id}
                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                          newJob.service_type === type.id 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-primary/50'
                        }`}
                      >
                        <input 
                          type="radio"
                          name="service_type"
                          value={type.id}
                          checked={newJob.service_type === type.id}
                          onChange={e => {
                            const val = e.target.value;
                            let price = 25;
                            if (val === 'string_grip') price = 30;
                            if (val === 'string_dampener') price = 27;
                            if (val === 'string_grip_dampener') price = 32;
                            setNewJob({...newJob, service_type: val, price});
                          }}
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="ml-3 text-sm font-medium text-neutral-900 dark:text-white">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {newJob.service_type === 'custom' && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Custom Service Category:</label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { id: 'string', label: 'String' },
                          { id: 'grip', label: 'Grip' },
                          { id: 'dampener', label: 'Dampener' }
                        ].map((item) => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio"
                              name="custom_service_category"
                              value={item.id}
                              checked={newJob.custom_service_category === item.id}
                              onChange={e => setNewJob({...newJob, custom_service_category: e.target.value})}
                              className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-primary transition-colors">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Additional Service Request</label>
                      <textarea 
                        value={newJob.additional_service_request}
                        onChange={e => setNewJob({...newJob, additional_service_request: e.target.value})}
                        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none h-20 resize-none focus:ring-2 focus:ring-primary text-sm"
                        placeholder="Describe the custom service needed..."
                      />
                    </div>
                  </div>
                )}

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
                  {/* Inventory Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <div className="col-span-full">
                      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Use from Inventory</h4>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Main String</label>
                      <select 
                        value={selectedInventoryId}
                        onChange={e => {
                          const id = e.target.value;
                          setSelectedInventoryId(id);
                          const item = inventoryItems.find(i => i.id === id);
                          if (item) {
                            setNewJob({
                              ...newJob,
                              string_main_brand: item.brand,
                              string_main_model: item.name,
                              string_main_gauge: item.gauge || "",
                              string_main: `${item.brand} ${item.name} ${item.gauge || ""}`.trim()
                            });
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Manual Entry / Not in Inventory</option>
                        {inventoryItems.filter(i => i.type === 'string').map(item => (
                          <option key={item.id} value={item.id}>
                            {item.brand} {item.name} ({item.packaging === 'reel' ? `${Math.round(item.remaining_length)}m left` : `${item.quantity} sets`})
                          </option>
                        ))}
                      </select>
                      {selectedInventoryId && inventoryItems.find(i => i.id === selectedInventoryId)?.quantity <= (inventoryItems.find(i => i.id === selectedInventoryId)?.low_stock_threshold || 5) && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Low stock warning
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Cross String</label>
                      <select 
                        value={selectedCrossInventoryId}
                        onChange={e => {
                          const id = e.target.value;
                          setSelectedCrossInventoryId(id);
                          const item = inventoryItems.find(i => i.id === id);
                          if (item) {
                            setNewJob({
                              ...newJob,
                              string_cross_brand: item.brand,
                              string_cross_model: item.name,
                              string_cross_gauge: item.gauge || "",
                              string_cross: `${item.brand} ${item.name} ${item.gauge || ""}`.trim()
                            });
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Manual Entry / Same as Mains</option>
                        {inventoryItems.filter(i => i.type === 'string').map(item => (
                          <option key={item.id} value={item.id}>
                            {item.brand} {item.name} ({item.packaging === 'reel' ? `${Math.round(item.remaining_length)}m left` : `${item.quantity} sets`})
                          </option>
                        ))}
                      </select>
                      {selectedCrossInventoryId && inventoryItems.find(i => i.id === selectedCrossInventoryId)?.quantity <= (inventoryItems.find(i => i.id === selectedCrossInventoryId)?.low_stock_threshold || 5) && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Low stock warning
                        </p>
                      )}
                    </div>
                  </div>

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
                      racquet_mains_skip: "", racquet_mains_tie_off: "", racquet_crosses_start: "", racquet_crosses_tie_off: "",
                      racquet_one_piece_length: "", racquet_two_piece_length: "", racquet_stringing_instructions: "",
                      string_main_brand: "", string_main_model: "", string_main_gauge: "", string_main_brand_custom: "", string_main_model_custom: "",
                      string_cross_brand: "", string_cross_model: "", string_cross_gauge: "", string_cross_brand_custom: "", string_cross_model_custom: "",
                      string_main: "", string_cross: "", tension_main: 0, tension_cross: 0, price: 25, 
                      service_type: "string_full_bed",
                      custom_service_category: "string",
                      additional_service_request: "",
                      notes: "",
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

              <div className="bg-bg-card border border-border-main rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-border-main">
                      <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Customer / Racquet</th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-text-main">{job.customer_name}</p>
                          <p className="text-sm text-text-muted">{job.brand} {job.model}</p>
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

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-primary">Inventory Overview</h2>
                <Link to="/inventory" className="text-sm font-bold text-primary hover:underline flex items-center">
                  Manage Full Inventory <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventoryItems.filter(i => i.type === 'string').slice(0, 6).map(item => (
                  <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white">{item.brand} {item.name}</h4>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest">{item.packaging} • {item.gauge}</p>
                      </div>
                      {item.quantity <= (item.low_stock_threshold || 5) && (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="text-2xl font-bold text-primary">
                          {item.quantity} <span className="text-sm font-normal text-neutral-400">{item.packaging === 'reel' ? 'Reels' : 'Sets'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Price</p>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">${item.price}</p>
                        </div>
                      </div>
                      
                      {item.packaging === 'reel' && (
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase mb-1">
                            <span>Current Reel</span>
                            <span>{Math.round(item.remaining_length)}m / {item.total_length}m</span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${item.remaining_length < 24 ? 'bg-red-500' : 'bg-primary'}`}
                              style={{ width: `${(item.remaining_length / item.total_length) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1 italic">
                            Approx. {Math.floor(item.remaining_length / 12)} jobs left on this reel
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {inventoryItems.filter(i => i.type === 'string').length === 0 && (
                  <div className="col-span-full py-12 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                    <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    <p className="text-neutral-500">No strings in inventory yet.</p>
                    <Link to="/inventory" className="text-primary font-bold hover:underline mt-2 inline-block">Add your first item</Link>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'messages' && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
              {/* Customer List - Mobile First */}
              <div className="lg:w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-primary">Conversations</h3>
                    <button
                      onClick={() => setSelectedCustomerIdForChat(null)}
                      className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors lg:hidden"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {/* Derive unique customers from messages or use existing customers list */}
                  {customers.map(customer => {
                    const lastMsg = [...messages].filter(m => m.customer_id === customer.id).sort((a,b) => {
                      const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime();
                      const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime();
                      return timeB - timeA;
                    })[0];
                    const unread = messages.filter(m => m.customer_id === customer.id && m.sender_role !== 'stringer' && !m.read).length;
                    
                    return (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomerIdForChat(customer.id)}
                        className={`w-full text-left p-3 rounded-2xl transition-all relative ${
                          selectedCustomerIdForChat === customer.id 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{customer.name}</p>
                              <p className={`text-[10px] truncate mt-0.5 ${
                                selectedCustomerIdForChat === customer.id ? 'text-white/70' : 'text-neutral-400'
                              }`}>
                                {lastMsg?.content || lastMsg?.message || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2">
                            {unread > 0 && (
                              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                            <p className={`text-[10px] ${
                              selectedCustomerIdForChat === customer.id ? 'text-white/60' : 'text-neutral-400'
                            }`}>
                              {lastMsg ? new Date(lastMsg.created_at?.seconds * 1000 || lastMsg.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {/* Handle messages without customer_id (old anonymous inquiries) */}
                  {[...new Set(messages.filter(m => !m.customer_id && m.customer_email).map(m => m.customer_email))].map(email => {
                    const lastMsg = [...messages].filter(m => m.customer_email === email).sort((a,b) => {
                      const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime();
                      const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime();
                      return timeB - timeA;
                    })[0];
                    const unread = messages.filter(m => m.customer_email === email && m.sender_role !== 'stringer' && !m.read).length;
                    
                    return (
                      <button
                        key={email}
                        onClick={() => setSelectedCustomerIdForChat(email)}
                        className={`w-full text-left p-3 rounded-2xl transition-all relative ${
                          selectedCustomerIdForChat === email 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold flex-shrink-0">
                              {email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{email}</p>
                              <p className={`text-[10px] truncate mt-0.5 ${
                                selectedCustomerIdForChat === email ? 'text-white/70' : 'text-neutral-400'
                              }`}>
                                {lastMsg?.content || lastMsg?.message || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2">
                            {unread > 0 && (
                              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                            <p className={`text-[10px] ${
                              selectedCustomerIdForChat === email ? 'text-white/60' : 'text-neutral-400'
                            }`}>
                              {lastMsg ? new Date(lastMsg.created_at?.seconds * 1000 || lastMsg.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {customers.length === 0 && messages.filter(m => !m.customer_id).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                      <p className="text-sm text-neutral-400">No conversations yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Area - Responsive */}
              <div className={`flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-sm ${
                selectedCustomerIdForChat ? 'block' : 'hidden lg:block'
              }`}>
                {selectedCustomerIdForChat ? (
                  <>
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedCustomerIdForChat(null)}
                          className="lg:hidden p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customers.find(c => c.id === selectedCustomerIdForChat)?.name?.charAt(0) || 
                           selectedCustomerIdForChat.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-primary">
                            {customers.find(c => c.id === selectedCustomerIdForChat)?.name || selectedCustomerIdForChat}
                          </h3>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                            {customers.find(c => c.id === selectedCustomerIdForChat) ? 'Customer' : 'Inquiry'}
                          </p>
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

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/30 dark:bg-neutral-900/30">
                      {[...messages]
                        .filter(m => m.customer_id === selectedCustomerIdForChat || m.customer_email === selectedCustomerIdForChat)
                        .sort((a, b) => {
                          const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime();
                          const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime();
                          return timeA - timeB;
                        })
                        .map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_role === 'stringer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] lg:max-w-[60%] ${
                              message.sender_role === 'stringer' 
                                ? 'bg-primary text-white' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                            } rounded-2xl p-3 shadow-sm`}>
                              <p className="text-sm leading-relaxed">{message.content || message.message}</p>
                              <p className={`text-[10px] mt-1 ${
                                message.sender_role === 'stringer' ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'
                              }`}>
                                {new Date(message.created_at?.seconds * 1000 || message.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sendingMessage}
                          className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Select a conversation</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Choose a customer from the list to start messaging
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Delete {deleteConfirm.type}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (deleteConfirm.type === 'customer') {
                        handleDeleteCustomer(deleteConfirm.id);
                      } else if (deleteConfirm.type === 'job') {
                        handleDeleteJob(deleteConfirm.id);
                      } else if (deleteConfirm.type === 'racquet') {
                        handleDeleteRacquet(deleteConfirm.id);
                      } else if (deleteConfirm.type === 'message') {
                        handleDeleteConversation(deleteConfirm.id);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Shop Info & QR Code */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shop QR Code Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">Storefront QR</h3>
              <button
                onClick={handleRegenerateQR}
                disabled={regeneratingQR || !shop?.name}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${regeneratingQR ? 'animate-spin' : ''}`} />
                {regeneratingQR ? 'Updating...' : 'Regenerate'}
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Customers can scan this to register and view their jobs at your shop.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl flex justify-center">
              <QRCodeDisplay 
                value={shop?.qr_code} 
                label="Storefront QR" 
                shopName={shop?.name}
                shopPhone={shop?.phone}
              />
            </div>
            {shop?.qr_code?.includes('_') && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  <strong>Update Available:</strong> Regenerate your QR code to use the new shop landing page format.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </React.Fragment>
  );
}
