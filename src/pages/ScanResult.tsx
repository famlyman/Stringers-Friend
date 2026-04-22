import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QrCode, User, Info, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";

// Simple UUID validator - must be exactly 36 chars with hyphens
function isValidUuid(str: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(str);
}

export default function ScanResult() {
  const { qrCode } = useParams();
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
      const { data: existingCustomers, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .eq('shop_id', result.data.id);

      if (searchError) throw searchError;
      
      if (!existingCustomers || existingCustomers.length === 0) {
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
    async function scan() {
      if (!qrCode) return;
      setLoading(true);
      setError("");

      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Scan timed out");
      }, 10000);

      try {
        // Clean the input - remove URL parts, trailing slashes
        let code = qrCode.trim();
        
        // Handle /scan/ prefix
        if (code.includes('/scan/')) {
          code = code.split('/scan/').pop() || code;
        }
        if (code.endsWith('/')) {
          code = code.slice(0, -1);
        }

        // LOGIC: Shop QR codes use SLUG (not UUID). Racquet QR codes use UUID.
        // If it's NOT a valid UUID format, assume it's a shop slug
        
        if (!isValidUuid(code)) {
          // It's a shop slug! Query by slug field
          const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('slug', code)
            .maybeSingle();

          if (shop) {
            setResult({ type: "shop", data: shop });
            clearTimeout(timeoutId);
            setLoading(false);
            return;
          }
        }

        // If we get here, it might be a UUID - try as racquet
        if (isValidUuid(code)) {
          const { data: racquet, error: racquetError } = await supabase
            .from('racquets')
            .select('*, customers(*)')
            .eq('id', code)
            .maybeSingle();

          if (racquet) {
            const { data: jobs } = await supabase
              .from('jobs')
              .select('*')
              .eq('racquet_id', racquet.id)
              .order('created_at', { ascending: false })
              .limit(10);

            setResult({
              type: "racquet",
              data: {
                ...racquet,
                customer_name: racquet.customers ? `${racquet.customers.first_name} ${racquet.customers.last_name}` : 'Unknown',
                customer_email: racquet.customers?.email || 'Unknown'
              },
              jobs: jobs || []
            });
            clearTimeout(timeoutId);
            setLoading(false);
            return;
          }
        }

        // Nothing found
        setError("Not found");
      } catch (err) {
        console.error("Scan error:", err);
        setError("Failed to scan");
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    scan();
  }, [qrCode]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center max-w-sm shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2 text-neutral-900 dark:text-white">Invalid QR Code</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-2">{error}</p>
        <div className="mb-6 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-[10px] font-mono text-neutral-400 break-all">
          Scanned: {qrCode}
        </div>
        <Link to="/" className="inline-block bg-primary text-white px-6 py-2 rounded-xl font-bold">Go Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {result.type === "shop" ? (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">{result.data.name}</h1>
              <p className="text-neutral-500 mt-2">Welcome to our shop storefront</p>
            </div>

            <div className="space-y-4 border-t border-neutral-100 pt-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-neutral-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-neutral-500">{result.data.address}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Info className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-neutral-500">{result.data.phone}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-100">
              {user ? (
                profile?.role === 'customer' ? (
                  <button 
                    onClick={handleJoinShop}
                    disabled={joining || joined}
                    className={`w-full py-3 rounded-xl font-bold ${
                      joined ? "bg-green-500 text-white" : "bg-primary text-white"
                    }`}
                  >
                    {joined ? "Joined!" : joining ? "Joining..." : "Join this Shop"}
                  </button>
                ) : (
                  <p className="text-center text-sm text-neutral-500">Logged in as Stringer</p>
                )
              ) : (
                <div className="space-y-4">
                  <Link to={`/register?shopId=${result.data.id}`} className="block w-full bg-primary text-white text-center py-3 rounded-xl font-bold">
                    Register as Customer
                  </Link>
                  <p className="text-center text-sm text-neutral-500">
                    Already have an account? <Link to={`/login?shopId=${result.data.id}`} className="text-primary font-bold">Sign in</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-primary">{result.data.brand} {result.data.model}</h1>
                  <p className="text-neutral-500">Owner: {result.data.customer_name}</p>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-xl">
                  <p className="text-xs text-neutral-400 uppercase">Serial</p>
                  <p className="text-sm font-medium">{result.data.serial_number || 'N/A'}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl">
                  <p className="text-xs text-neutral-400 uppercase">Head Size</p>
                  <p className="text-sm font-medium">{result.data.head_size || 'N/A'}</p>
                </div>
              </div>

              {result.data.current_string_main && (
                <div className="mt-6 p-6 bg-primary text-white rounded-2xl">
                  <h2 className="text-lg font-bold mb-4">Current Stringing</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-white/60 uppercase">Mains</p>
                      <p className="text-sm font-bold">{result.data.current_string_main}</p>
                      <p className="text-2xl font-black">{result.data.current_tension_main} lbs</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 uppercase">Crosses</p>
                      <p className="text-sm font-bold">{result.data.current_string_cross}</p>
                      <p className="text-2xl font-black">{result.data.current_tension_cross} lbs</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 p-8">
              <h2 className="text-lg font-bold text-primary mb-6">Stringing History</h2>
              <div className="space-y-4">
                {result.jobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">{job.string_main} / {job.string_cross}</p>
                      <p className="text-base font-black">{job.tension_main} / {job.tension_cross} lbs</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-neutral-100'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}