import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Loader2, Package } from "lucide-react";

function isValidUuid(str: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(str);
}

export default function RacquetPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [racquet, setRacquet] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setError("No ID provided");
      setLoading(false);
      return;
    }

    async function fetchRacquet() {
      // If it's not a valid UUID, it's probably a shop slug - redirect or show error
      if (!isValidUuid(id)) {
        // Try as shop slug instead
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('slug', id)
          .maybeSingle();

        if (shop) {
          // Redirect to public shop page
          window.location.href = `/${id}`;
          return;
        }
        
        setError("Invalid QR code format");
        setLoading(false);
        return;
      }

      // Valid UUID - query as racquet
      const { data, error: err } = await supabase
        .from('racquets')
        .select('*, customers(*)')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        setRacquet(data);
      } else if (err) {
        setError(err.message);
      } else {
        setError("Racquet not found");
      }
      setLoading(false);
    }

    fetchRacquet();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-sm">
          <Package className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-neutral-500 mb-4">{error}</p>
          <Link to="/" className="text-primary hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-6">
          <h1 className="text-2xl font-bold text-white">{racquet?.brand} {racquet?.model}</h1>
          <p className="text-white/80">S/N: {racquet?.serial_number || 'N/A'}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Current Stringing</p>

          {/* Mains */}
          <div className="bg-neutral-100 p-4 rounded-xl">
            <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Mains</p>
            <p className="font-medium text-lg text-neutral-900">{racquet?.current_string_main || 'Not set'}</p>
          </div>

          {/* Crosses */}
          <div className="bg-neutral-100 p-4 rounded-xl">
            <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Crosses</p>
            <p className="font-medium text-lg text-neutral-900">{racquet?.current_string_cross || 'Not set'}</p>
          </div>

          {/* Tension */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-100 p-4 rounded-xl">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Mains Tension</p>
              <p className="font-bold text-xl text-neutral-900">{racquet?.current_tension_main || '?'}<span className="text-sm font-normal text-neutral-600"> lbs</span></p>
            </div>
            <div className="bg-neutral-100 p-4 rounded-xl">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Crosses Tension</p>
              <p className="font-bold text-xl text-neutral-900">{racquet?.current_tension_cross || '?'}<span className="text-sm font-normal text-neutral-600"> lbs</span></p>
            </div>
          </div>

          {/* Owner */}
          <div className="bg-neutral-100 p-4 rounded-xl">
            <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Owner</p>
            <p className="font-medium text-neutral-900">
              {racquet?.customers 
                ? `${racquet.customers.first_name} ${racquet.customers.last_name}`
                : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-neutral-50">
          <Link 
            to="/" 
            className="block w-full text-center py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90"
          >
            Open in Stringers Friend
          </Link>
        </div>
      </div>
    </div>
  );
}