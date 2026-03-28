import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { QrCode, User, Info, History, AlertCircle } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  doc,
  getDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export default function ScanResult() {
  const { qrCode } = useParams();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchScan = async () => {
      if (!qrCode) return;
      setLoading(true);
      setError("");

      try {
        if (qrCode.startsWith("shop_")) {
          const q = query(collection(db, "shops"), where("qr_code", "==", qrCode));
          const snap = await getDocs(q);
          if (snap.empty) {
            setError("Shop not found");
          } else {
            const shopDoc = snap.docs[0];
            setResult({
              type: "shop",
              data: { id: shopDoc.id, ...shopDoc.data() }
            });
          }
        } else if (qrCode.startsWith("racquet_")) {
          const q = query(collection(db, "racquets"), where("qr_code", "==", qrCode));
          const snap = await getDocs(q);
          if (snap.empty) {
            setError("Racquet not found");
          } else {
            const racquetDoc = snap.docs[0];
            const racquetData = { id: racquetDoc.id, ...racquetDoc.data() } as any;
            
            // Fetch customer info
            const customerDoc = await getDoc(doc(db, "customers", racquetData.customer_id));
            const customerData = customerDoc.exists() ? customerDoc.data() : { name: "Unknown", email: "Unknown" };

            // Fetch job history
            const jobsQ = query(
              collection(db, "jobs"), 
              where("racquet_id", "==", racquetData.id),
              orderBy("created_at", "desc"),
              limit(10)
            );
            const jobsSnap = await getDocs(jobsQ);
            const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setResult({
              type: "racquet",
              data: { 
                ...racquetData, 
                customer_name: customerData.name,
                customer_email: customerData.email
              },
              jobs
            });
          }
        } else {
          setError("Invalid QR code format");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data from Firestore");
      } finally {
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
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
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
              <Link to="/register" className="block w-full bg-primary text-white text-center py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                Register as Customer
              </Link>
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
