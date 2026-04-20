import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QrCode, User, Info, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";

export default function ScanResult() {
  const { qrCode, racquetId } = useParams();
  const codeParam = qrCode || racquetId;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoinShop = async () => {
    if (!user || !result || result.type !== 'shop' || joining) return;
    
    setJoining(true);
    try {
      // Check if customer already exists for this shop
      const { data: existingCustomers, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .eq('shop_id', result.data.id);

      if (searchError) throw searchError;
      
      if (!existingCustomers || existingCustomers.length === 0) {
        // Create new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            first_name: profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || "New",
            last_name: profile?.full_name?.split(' ').slice(1).join(' ') || "Customer",
            email: user.email,
            phone: profile?.phone || "",
            shop_id: result.data.id,
            profile_id: user.id,
          });

        if (insertError) throw insertError;
      }
      
      setJoined(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error("Error joining shop:", err);
      setError("Failed to join shop. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    const fetchScan = async () => {
      if (!codeParam) return;
      setLoading(true);
      setError("");

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.log('ScanResult - timeout reached, forcing loading false');
        setLoading(false);
        setError("Scan timed out. Please try again.");
      }, 5000);

      try {
        let cleanCode = qrCode.trim();
        
        // Handle case where full URL might be passed
        if (cleanCode.includes("/scan/")) {
          cleanCode = cleanCode.split("/scan/").pop() || cleanCode;
        }

        // Remove trailing slash
        if (cleanCode.endsWith("/")) {
          cleanCode = cleanCode.slice(0, -1);
        }

        console.log("Scanning code:", cleanCode);

        // Check for plain UUID (racquet ID) first - matches IDs like "iad1::st5dz-..." with colons
        if (cleanCode.match(/^[0-9a-f:-]+$/) && cleanCode.includes('-')) {
          const rId = cleanCode;
          let racquetData = null;
          try {
            const { data } = await supabase
              .from('racquets')
              .select('*, customers(*)')
              .eq('id', rId)
              .single();
            if (data) racquetData = data;
          } catch (e) {
            // Not found - continue to other checks
          }
          
          if (racquetData) {
            const { data: jobs } = await supabase
              .from('stringing_jobs')
              .select('*')
              .eq('racquet_id', racquetData.id)
              .order('created_at', { ascending: false })
              .limit(10);
            
            setResult({
              type: "racquet",
              data: {
                ...racquetData,
                customer_name: racquetData.customers ? `${racquetData.customers.first_name} ${racquetData.customers.last_name}` : 'Unknown',
                customer_email: racquetData.customers?.email || 'Unknown'
              },
              jobs: jobs || []
            });
            setLoading(false);
            return;
          }
        }

        if (cleanCode.startsWith("shop_")) {
          const shopId = cleanCode.replace("shop_", "");
          
          // Try to find shop by ID
          const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();
          
          if (shop) {
            setResult({
              type: "shop",
              data: shop
            });
          } else {
            // Try finding by QR code
            const { data: shops, error: shopsError } = await supabase
              .from('shops')
              .select('*')
              .eq('qr_code', cleanCode);
            
            if (!shops || shops.length === 0) {
              setError("Shop not found");
            } else {
              setResult({
                type: "shop",
                data: shops[0]
              });
            }
          }
        } else if (cleanCode.startsWith("SF|racket|") || cleanCode.startsWith("SF|r|")) {
          const parts = cleanCode.split('|');
          const isShort = cleanCode.startsWith("SF|r|");
          
          // Short format: SF|r|id|Brand Model (no strings - lookup from DB)
          // Long format: SF|racket|id|brand|model|string|cross|tension
          if (parts.length < 3) {
            setError("Invalid QR code format");
            return;
          }
          
          const rId = parts[2];
          let rBrand = '', rModel = '';
          
          // Parse brand and model from remaining parts
          if (isShort) {
            // Short: parts[3] is "Brand Model"
            const bm = (parts[3] || '').split(' ');
            rBrand = bm[0] || '';
            rModel = bm.slice(1).join(' ') || '';
          } else {
            // Long: parts[3] is brand, parts[4] is model
            rBrand = parts[3] || '';
            rModel = parts[4] || '';
          }
          
          const embeddedData = {
            id: rId,
            brand: rBrand,
            model: rModel,
            isEmbedded: true
          };
            
            // Try to find full racquet data from DB if online
            let racquetData = null;
            try {
              const { data } = await supabase
                .from('racquets')
                .select('*, customers(*)')
                .eq('id', rId)
                .single();
              if (data) racquetData = data;
            } catch (e) {
              // DB fetch failed, use embedded data
            }
            
            const displayData = racquetData ? {
              ...racquetData,
              customer_name: racquetData.customers ? `${racquetData.customers.first_name} ${racquetData.customers.last_name}` : 'Unknown',
              customer_email: racquetData.customers?.email || 'Unknown'
            } : {
              ...embeddedData,
              customer_name: embeddedData.brand ? 'Offline Data' : 'Unknown',
              customer_email: ''
            };
            
            setResult({
              type: "racquet",
              data: displayData,
              jobs: []
            });
        } else if (cleanCode.startsWith("racquet_")) {
          const racquetId = cleanCode.replace("racquet_", "");
          
          // Try to find racquet by ID
          let { data: racquetData, error: racquetError } = await supabase
            .from('racquets')
            .select('*, customers(*)')
            .eq('id', racquetId)
            .single();
          
          if (!racquetData) {
            // Try finding by QR code
            const { data: racquets } = await supabase
              .from('racquets')
              .select('*, customers(*)')
              .eq('qr_code', cleanCode);
            
            if (racquets && racquets.length > 0) {
              racquetData = racquets[0];
            }
          }

          if (racquetData) {
            // Get jobs for this racquet
            const { data: jobs } = await supabase
              .from('stringing_jobs')
              .select('*')
              .eq('racquet_id', racquetData.id)
              .order('created_at', { ascending: false })
              .limit(10);

            setResult({
              type: "racquet",
              data: { 
                ...racquetData, 
                customer_name: racquetData.customers ? `${racquetData.customers.first_name} ${racquetData.customers.last_name}` : 'Unknown',
                customer_email: racquetData.customers?.email || 'Unknown'
              },
              jobs: jobs || []
            });
          } else {
            setError("Racquet not found");
          }
        } else if (cleanCode.startsWith("inventory_")) {
          const itemId = cleanCode.replace("inventory_", "");
          
          // Try to find inventory by ID
          const { data: itemData, error: itemError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', itemId)
            .single();
          
          if (itemData) {
            setResult({
              type: "inventory",
              data: itemData
            });
          } else {
            // Try finding by QR code
            const { data: items } = await supabase
              .from('inventory')
              .select('*')
              .eq('qr_code', cleanCode);
            
            if (items && items.length > 0) {
              setResult({
                type: "inventory",
                data: items[0]
              });
            } else {
              setError("Inventory item not found");
            }
          }
        } else {
          // Last resort: try to find by ID or slug in all collections if no prefix
          // Try shops by ID first
          const { data: shopData } = await supabase
            .from('shops')
            .select('*')
            .eq('id', cleanCode)
            .single();
          
          if (shopData) {
            setResult({ type: "shop", data: shopData });
            return;
          }

          // Try shops by slug/qr_code (for shop QR codes)
          const { data: shopsBySlug } = await supabase
            .from('shops')
            .select('*')
            .eq('slug', cleanCode)
            .limit(1);
          
          if (shopsBySlug && shopsBySlug.length > 0) {
            setResult({ type: "shop", data: shopsBySlug[0] });
            return;
          }

          // Try shops by qr_code field
          const { data: shopsByQr } = await supabase
            .from('shops')
            .select('*')
            .eq('qr_code', cleanCode)
            .limit(1);
          
          if (shopsByQr && shopsByQr.length > 0) {
            setResult({ type: "shop", data: shopsByQr[0] });
            return;
          }

          // Try racquets
          const { data: racquetData } = await supabase
            .from('racquets')
            .select('*, customers(*)')
            .eq('id', cleanCode)
            .single();
          
          if (racquetData) {
            const { data: jobs } = await supabase
              .from('stringing_jobs')
              .select('*')
              .eq('racquet_id', racquetData.id)
              .order('created_at', { ascending: false })
              .limit(10);
            
            setResult({ 
              type: "racquet", 
              data: { 
                ...racquetData, 
                customer_name: racquetData.customers ? `${racquetData.customers.first_name} ${racquetData.customers.last_name}` : 'Unknown',
                customer_email: racquetData.customers?.email || 'Unknown'
              }, 
              jobs: jobs || []
            });
            return;
          }

          setError("Unknown QR code");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data from Firestore");
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    fetchScan();
  }, [qrCode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (error) return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center max-w-sm shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">Invalid QR Code</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-2">{error}</p>
        <div className="mb-6 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-[10px] font-mono text-neutral-400 break-all">
          Detected Code: {qrCode}
        </div>
        <Link to="/" className="inline-block bg-primary text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]">Go Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">
        {result.type === "shop" ? (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">{result.data.name}</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-2">Welcome to our shop storefront</p>
            </div>

            <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-700 pt-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Address</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{result.data.address}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Info className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Phone</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{result.data.phone}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-700">
              {user ? (
                profile?.role === 'customer' ? (
                  <button 
                    onClick={handleJoinShop}
                    disabled={joining || joined}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      joined 
                        ? "bg-green-500 text-white" 
                        : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.98]"
                    }`}
                  >
                    {joined ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Joined Successfully!
                      </>
                    ) : joining ? (
                      "Joining Shop..."
                    ) : (
                      "Join this Shop"
                    )}
                  </button>
                ) : (
                  <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 italic">
                    Logged in as a Stringer. Switch to a customer account to join this shop.
                  </p>
                )
              ) : (
                <div className="space-y-4">
                  <Link to={`/register?shopId=${result.data.id}`} className="block w-full bg-primary text-white text-center py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    Register as Customer
                  </Link>
                  <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Already have an account?{" "}
                    <Link to={`/login?shopId=${result.data.id}`} className="text-primary font-bold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : result.type === "inventory" ? (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-primary">{result.data.brand} {result.data.name}</h1>
                <p className="text-neutral-500 dark:text-neutral-400">Inventory Item</p>
              </div>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Type</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{result.data.type} ({result.data.packaging || result.data.sub_type || ''})</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Price</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">${result.data.unit_price}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Stock Level</p>
                <p className={`text-sm font-medium ${result.data.quantity <= (result.data.low_stock_threshold || 0) ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                  {result.data.quantity} in stock
                </p>
              </div>
              {result.data.gauge && (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Gauge</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{result.data.gauge}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-primary">{result.data.brand} {result.data.model}</h1>
                  <p className="text-neutral-500 dark:text-neutral-400">Owner: {result.data.customer_name}</p>
                </div>
                <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Serial Number</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{result.data.serial_number || 'N/A'}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Head Size</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{result.data.head_size ? `${result.data.head_size} sq in` : 'N/A'}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">String Pattern</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{result.data.string_pattern_mains ? `${result.data.string_pattern_mains}x${result.data.string_pattern_crosses}` : 'N/A'}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">Customer Email</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{result.data.customer_email}</p>
                </div>
              </div>

              {result.data.current_string_main && (
                <div className="mt-6 p-6 bg-primary text-white rounded-2xl shadow-lg border border-primary/20">
                  <div className="flex items-center mb-4">
                    <Info className="w-5 h-5 mr-2 text-secondary" />
                    <h2 className="text-lg font-bold">Current Stringing</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-1">Mains</p>
                      <p className="text-sm font-bold">{result.data.current_string_main}</p>
                      <p className="text-2xl font-black text-secondary mt-1">{result.data.current_tension_main} lbs</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-1">Crosses</p>
                      <p className="text-sm font-bold">{result.data.current_string_cross}</p>
                      <p className="text-2xl font-black text-secondary mt-1">{result.data.current_tension_cross} lbs</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 shadow-sm">
              <div className="flex items-center mb-6">
                <History className="w-5 h-5 text-primary mr-2" />
                <h2 className="text-lg font-bold text-primary">Stringing History</h2>
              </div>

              <div className="space-y-4">
                {result.jobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                    <div>
                      <p className="text-sm font-bold text-primary">{job.string_main} / {job.string_cross}</p>
                      <p className="text-base font-black text-neutral-900 dark:text-white">{job.tension_main} / {job.tension_cross} lbs</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">{safeFormatDate(job.created_at, 'MMM d, yyyy')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      job.status === 'completed' ? 'bg-accent/20 text-green-700 dark:text-green-400' : 'bg-secondary/20 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
                {result.jobs.length === 0 && (
                  <p className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-sm">No job history found for this racquet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
