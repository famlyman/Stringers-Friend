import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { MapPin, Phone, Mail, ChevronRight, Award, ShieldCheck, Clock, X, CheckCircle2, LayoutDashboard, UserPlus, Star, Users, Wrench, Zap, TrendingUp, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface Shop {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  owner_id: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export default function PublicShop() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", content: "", register: false, password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isCustomerOfShop, setIsCustomerOfShop] = useState(false);

  const FIXED_SERVICES = [
    { id: 'string_full_bed', name: 'String Job Full Bed', price: 25, description: 'Professional full bed stringing service.' },
    { id: 'string_hybrid', name: 'String Job Hybrid', price: 25, description: 'Custom hybrid stringing for optimal performance.' },
    { id: 'string_grip', name: 'String and Grip', price: 30, description: 'Full stringing service plus a new grip installation.' },
    { id: 'string_dampener', name: 'String and Dampener', price: 27, description: 'Full stringing service plus a new dampener.' },
    { id: 'string_grip_dampener', name: 'String with Grip and Dampener', price: 32, description: 'The complete package: strings, grip, and dampener.' },
  ];

  const handleJoinShop = async () => {
    if (!user || !shop || joining) return;
    setJoining(true);
    try {
      const q = query(
        collection(db, "customers"),
        where("email", "==", user.email),
        where("shop_id", "==", shop.id)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        const customerId = uuidv4();
        await setDoc(doc(db, "customers", customerId), {
          id: customerId,
          name: profile?.name || user.email?.split('@')[0] || "New Customer",
          email: user.email,
          phone: profile?.phone || "",
          shop_id: shop.id,
          uid: user.uid,
          created_at: serverTimestamp()
        });
      } else {
        // Just update the UID if it's missing
        const docId = snap.docs[0].id;
        if (!snap.docs[0].data().uid) {
          await setDoc(doc(db, "customers", docId), { uid: user.uid }, { merge: true });
        }
      }
      setIsCustomerOfShop(true);
      navigate("/");
    } catch (err) {
      console.error("Error joining shop:", err);
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    const checkCustomerStatus = async () => {
      if (user && shop) {
        const q = query(
          collection(db, "customers"),
          where("email", "==", user.email),
          where("shop_id", "==", shop.id)
        );
        const snap = await getDocs(q);
        setIsCustomerOfShop(!snap.empty);
      }
    };
    checkCustomerStatus();
  }, [user, shop]);

  const openContactModal = (serviceName: string | null = null) => {
    setSelectedService(serviceName);
    if (serviceName) {
      setContactForm(prev => ({ ...prev, content: `I'm interested in the ${serviceName} service.` }));
    }
    setShowContactModal(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted:", contactForm);
    console.log("Shop data:", shop);
    
    if (!shop) {
      console.log("No shop data available");
      return;
    }
    
    setSubmitting(true);
    try {
      const messageId = uuidv4();
      console.log("Creating message with ID:", messageId);
      
      const messageData = {
        id: messageId,
        shop_id: shop.id,
        sender_name: contactForm.name,
        sender_role: 'anonymous',
        content: contactForm.content,
        service_requested: selectedService,
        created_at: serverTimestamp(),
        read: false,
        // Keep these for backward compatibility or extra info
        customer_email: contactForm.email,
        phone: contactForm.phone,
        title: selectedService ? `New ${selectedService} Inquiry from ${contactForm.name}` : `New Inquiry from ${contactForm.name}`
      };
      
      console.log("Message data to save:", messageData);
      
      await setDoc(doc(db, "messages", messageId), messageData);
      console.log("Message saved successfully");
      
      if (contactForm.register) {
        let currentUid = user?.uid;

        // If not logged in and password provided, create account
        if (!currentUid && contactForm.password) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, contactForm.email, contactForm.password);
            currentUid = userCredential.user.uid;

            // Create user profile
            await setDoc(doc(db, "users", currentUid), {
              uid: currentUid,
              email: contactForm.email,
              role: "customer",
              created_at: serverTimestamp()
            });
          } catch (authErr: any) {
            console.error("Error creating account during service request:", authErr);
            // If account already exists, we might want to inform them, but for now just log
          }
        }

        const q = query(
          collection(db, "customers"),
          where("email", "==", contactForm.email),
          where("shop_id", "==", shop.id)
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          const customerId = uuidv4();
          await setDoc(doc(db, "customers", customerId), {
            id: customerId,
            name: contactForm.name,
            email: contactForm.email,
            phone: contactForm.phone,
            shop_id: shop.id,
            uid: currentUid || null,
            created_at: serverTimestamp()
          });
          setIsCustomerOfShop(true);
        } else if (currentUid) {
          // Link existing customer doc to new UID if needed
          const docId = snap.docs[0].id;
          if (!snap.docs[0].data().uid) {
            await updateDoc(doc(db, "customers", docId), { uid: currentUid });
          }
        }
      }

      setSubmitted(true);
      setContactForm({ name: "", email: "", phone: "", content: "", register: false, password: "" });
      setSelectedService(null);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchShop = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        console.log("Fetching shop with slug:", slug.toLowerCase());
        const shopsRef = collection(db, "shops");
        const q = query(shopsRef, where("slug", "==", slug.toLowerCase()));
        const querySnapshot = await getDocs(q);

        console.log("Query snapshot size:", querySnapshot.size);
        console.log("Query snapshot docs:", querySnapshot.docs);

        if (querySnapshot.empty) {
          console.log("Shop not found for slug:", slug);
          
          // Fallback: try to find shop by ID (for backward compatibility)
          const idQuery = query(shopsRef, where("id", "==", slug));
          const idSnapshot = await getDocs(idQuery);
          
          if (!idSnapshot.empty) {
            const shopDoc = idSnapshot.docs[0];
            const shopData = { id: shopDoc.id, ...shopDoc.data() } as Shop;
            console.log("Shop found by ID fallback:", shopData);
            setShop(shopData);
            
            // Fetch inventory for this shop
            const inventoryRef = collection(db, "inventory");
            const inventoryQuery = query(
              inventoryRef, 
              where("shop_id", "==", shopDoc.id),
              where("type", "==", "string")
            );
            const inventorySnapshot = await getDocs(inventoryQuery);
            
            const stringServices = inventorySnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name,
              price: doc.data().price,
              description: `${doc.data().brand || ''} ${doc.data().packaging || doc.data().sub_type || ''}`.trim()
            }));
            
            setServices(stringServices);
            setLoading(false);
            return;
          }
          
          setError("Shop not found");
          setLoading(false);
          return;
        }

        const shopDoc = querySnapshot.docs[0];
        const shopData = { id: shopDoc.id, ...shopDoc.data() } as Shop;
        console.log("Shop data found:", shopData);
        setShop(shopData);

        // Fetch inventory items of type 'string' to show as services/pricing
        const inventoryRef = collection(db, "inventory");
        const inventoryQuery = query(
          inventoryRef, 
          where("shop_id", "==", shopDoc.id),
          where("type", "==", "string")
        );
        const inventorySnapshot = await getDocs(inventoryQuery);
        
        const stringServices = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          price: doc.data().price,
          description: `${doc.data().brand || ''} ${doc.data().packaging || doc.data().sub_type || ''}`.trim()
        }));
        
        setServices(stringServices);
      } catch (err) {
        console.error("Error fetching shop:", err);
        setError("Failed to load shop information");
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">404</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">{error || "Shop not found"}</p>
        <Link to="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-primary/10 dark:via-neutral-900 dark:to-secondary/10">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-6">
              <Award className="w-4 h-4 mr-2" />
              Experienced Racquet Stringing Services
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
              {shop.name}
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Experienced racquet stringing with precision, care, and quick turnaround. 
              Trusted by players of all levels for consistent quality and performance.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-10">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-neutral-900 dark:text-white">{services.length}+</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">String Options</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-neutral-900 dark:text-white">72h</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Turnaround</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-neutral-900 dark:text-white">5.0</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Customer Rating</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowContactModal(true)}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Request Stringing Service
              </button>
              <button
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold text-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-2"
              >
                View Services & Pricing
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400 mt-4">
              No account required • Quick response guaranteed
            </p>
          </div>
          
          {/* Contact Info Bar */}
          <div className="flex flex-wrap justify-center gap-8 text-neutral-600 dark:text-neutral-400">
            {shop.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">{shop.address}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">{shop.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Services & Pricing */}
          <div className="lg:col-span-2 space-y-12">
            <section id="services">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Stringing Services & Pricing
                </h2>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 mb-12">
                {FIXED_SERVICES.map((service) => (
                  <div 
                    key={service.id} 
                    className="group flex items-center justify-between p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-primary/50 transition-all hover:shadow-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
                          {service.name}
                        </h3>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 ml-11">
                        {service.description}
                      </p>
                    </div>
                    <div className="text-right ml-6">
                      <div className="text-3xl font-black text-neutral-900 dark:text-white">
                        ${service.price}
                      </div>
                      <p className="text-xs text-neutral-400 uppercase font-bold tracking-tighter mt-1">
                        Labor Included
                      </p>
                      <button
                        onClick={() => openContactModal(service.name)}
                        className="mt-3 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-all"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Customer Testimonials
                </h2>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
                    "Amazing service! My racquet feels brand new. The tension is perfect and the turnaround was incredibly fast."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Sarah J.</p>
                      <p className="text-xs text-neutral-500">Tournament Player</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
                    "Professional and reliable. I've been bringing my racquets here for years and the quality is always consistent."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Mike R.</p>
                      <p className="text-xs text-neutral-500">League Player</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Why Choose Us
                </h2>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Expert Quality</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Professional grade stringing with precision tensioning for every racquet type and playing style.</p>
                </div>
                <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Fast Turnaround</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Most jobs completed within 24-48 hours. Express service available for urgent needs.</p>
                </div>
                <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Track Progress</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Get real-time updates and notifications when your racquet is ready for pickup.</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Info & Contact */}
          <div className="space-y-8">
            <div className="p-8 bg-neutral-900 dark:bg-white rounded-3xl text-white dark:text-neutral-900 shadow-2xl">
              <h3 className="text-xl font-bold mb-6">Shop Info</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-neutral-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Location</p>
                    <p className="text-sm font-medium">{shop.address || "Contact for address"}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-neutral-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Phone</p>
                    <p className="text-sm font-medium">{shop.phone || "Contact for phone"}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-10 border-t border-white/10 dark:border-neutral-100">
                <p className="text-xs opacity-70 leading-relaxed">
                  We specialize in high-performance racquet stringing using the latest techniques and materials.
                </p>
              </div>
            </div>

            <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4">
                {user ? (isCustomerOfShop ? "Already a Customer" : "Join this Shop") : "New Customer?"}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                {user 
                  ? (isCustomerOfShop 
                      ? "You are already registered with this shop. Go to your dashboard to manage your racquets."
                      : "You have an account but aren't registered with this shop yet. Join now to start tracking your jobs here.")
                  : "Register to create your \"Bag\" of racquets and track all your stringing history in one place."}
              </p>
              {user ? (
                isCustomerOfShop ? (
                  <Link
                    to="/"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Go to Dashboard <LayoutDashboard className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    onClick={handleJoinShop}
                    disabled={joining}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {joining ? "Joining..." : "Join this Shop"} <UserPlus className="w-4 h-4" />
                  </button>
                )
              ) : (
                <Link
                  to={`/register?shopId=${shop.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-neutral-900 border border-primary/20 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all"
                >
                  Create Account <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-primary to-secondary py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-bold uppercase tracking-wider mb-6">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ready to Get Started?
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            Transform Your Game Today
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Join hundreds of satisfied players who trust us with their racquet stringing needs. 
            Experience the difference that professional stringing can make.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-8 py-4 bg-white text-primary rounded-2xl font-bold hover:bg-white/90 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Get Started Now
            </button>
            <button
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white/20 backdrop-blur text-white rounded-2xl font-bold hover:bg-white/30 transition-all border border-white/30 flex items-center justify-center gap-2"
            >
              View Our Services
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-white border-t border-neutral-800 dark:border-neutral-200 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-black text-white dark:text-neutral-900 mb-4">{shop.name}</h3>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 leading-relaxed">
                Professional racquet stringing services with precision, care, and quick turnaround. 
                Trusted by players of all levels.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider mb-4">Quick Links</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="block text-sm text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 transition-colors"
                >
                  Request Service
                </button>
                <button
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                  className="block text-sm text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 transition-colors"
                >
                  Services & Pricing
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider mb-4">Contact Info</h4>
              <div className="space-y-3">
                {shop.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">{shop.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-neutral-800 dark:border-neutral-200 text-center">
            <p className="text-sm text-neutral-400 dark:text-neutral-600">
              &copy; {new Date().getFullYear()} {shop.name}. Powered by <span className="text-primary font-bold">Stringers Friend</span>.
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in duration-300 border border-neutral-200 dark:border-neutral-800 relative overflow-hidden">
            <button 
              onClick={() => {
                setShowContactModal(false);
                setSubmitted(false);
                setSelectedService(null);
                setContactForm({ name: "", email: "", phone: "", content: "", register: false, password: "" });
              }}
              className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {submitted ? (
              <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Message Sent!</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                  {shop.name} has received your request and will get back to you soon.
                  {contactForm.register && " Your account has been created and you are now registered with this shop."}
                </p>
                <button 
                  onClick={() => {
                    setShowContactModal(false);
                    setSubmitted(false);
                    setSelectedService(null);
                    setContactForm({ name: "", email: "", phone: "", content: "", register: false, password: "" });
                  }}
                  className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Request Service</h3>
                  {selectedService ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg w-fit text-xs font-bold mb-2">
                      <Zap className="w-3 h-3" /> Selected: {selectedService}
                    </div>
                  ) : (
                    <p className="text-neutral-500 dark:text-neutral-400">Send a message to {shop.name} about your racquet.</p>
                  )}
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Your Name</label>
                      <input 
                        type="text" 
                        required
                        value={contactForm.name}
                        onChange={e => setContactForm({...contactForm, name: e.target.value})}
                        className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={contactForm.email}
                        onChange={e => setContactForm({...contactForm, email: e.target.value})}
                        className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone (Optional)</label>
                    <input 
                      type="tel" 
                      value={contactForm.phone}
                      onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                      className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Message / Racquet Details</label>
                    <textarea 
                      required
                      value={contactForm.content}
                      onChange={e => setContactForm({...contactForm, content: e.target.value})}
                      className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all h-32 resize-none"
                      placeholder="Tell us about your racquet and stringing preferences..."
                    />
                  </div>

                  {!isCustomerOfShop && (
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer group hover:bg-primary/10 transition-all">
                        <input 
                          type="checkbox"
                          checked={contactForm.register}
                          onChange={e => setContactForm({...contactForm, register: e.target.checked})}
                          className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">Register as a customer</p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Save your info and track your racquet history with this shop.</p>
                        </div>
                      </label>

                      {contactForm.register && !user && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Create Password</label>
                          <input 
                            type="password" 
                            required
                            value={contactForm.password}
                            onChange={e => setContactForm({...contactForm, password: e.target.value})}
                            className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="Minimum 6 characters"
                            minLength={6}
                          />
                          <p className="text-[10px] text-neutral-400 ml-1">This will be your password to log in later.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-4"
                  >
                    {submitting ? "Sending..." : "Send Request"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
