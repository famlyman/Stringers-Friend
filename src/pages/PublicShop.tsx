import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { MapPin, Phone, Mail, ChevronRight, Award, ShieldCheck, Clock, X, CheckCircle2, LayoutDashboard, UserPlus } from "lucide-react";
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
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isCustomerOfShop, setIsCustomerOfShop] = useState(false);

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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setSubmitting(true);
    try {
      const messageId = uuidv4();
      await setDoc(doc(db, "messages", messageId), {
        id: messageId,
        shop_id: shop.id,
        sender_name: contactForm.name,
        sender_role: 'anonymous',
        content: contactForm.content,
        created_at: new Date().toISOString(),
        read: false,
        // Keep these for backward compatibility or extra info
        customer_email: contactForm.email,
        phone: contactForm.phone,
        title: `New Inquiry from ${contactForm.name}`
      });
      setSubmitted(true);
      setContactForm({ name: "", email: "", phone: "", content: "" });
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
        const shopsRef = collection(db, "shops");
        const q = query(shopsRef, where("slug", "==", slug.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Shop not found");
          setLoading(false);
          return;
        }

        const shopDoc = querySnapshot.docs[0];
        const shopData = { id: shopDoc.id, ...shopDoc.data() } as Shop;
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
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                Verified Stringer
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4">
                {shop.name}
              </h1>
              <div className="flex flex-wrap gap-6 text-neutral-600 dark:text-neutral-400">
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
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowContactModal(true)}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Request Stringing
              </button>
              <p className="text-[10px] text-center text-neutral-400 uppercase tracking-widest font-bold">
                No account needed to inquire
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Services & Pricing */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Stringing Services
                </h2>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
              </div>
              
              {services.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {services.map((service) => (
                    <div 
                      key={service.id} 
                      className="group flex items-center justify-between p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-primary/50 transition-all"
                    >
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-neutral-900 dark:text-white">
                          ${service.price}
                        </span>
                        <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-tighter">
                          Labor Included
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Contact shop for current pricing and availability.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Why Choose Us
                </h2>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Award className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Expert Quality</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Professional grade stringing with precision tensioning for every racquet.</p>
                </div>
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Clock className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Fast Turnaround</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Most jobs completed within 24-48 hours. Express service available.</p>
                </div>
                <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <ShieldCheck className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Track Progress</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Get real-time updates and notifications when your racquet is ready.</p>
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

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} {shop.name}. Powered by Stringers Friend.
          </p>
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
                </p>
                <button 
                  onClick={() => {
                    setShowContactModal(false);
                    setSubmitted(false);
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
                  <p className="text-neutral-500 dark:text-neutral-400">Send a message to {shop.name} about your racquet.</p>
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
