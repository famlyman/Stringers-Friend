import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";

export default function RacquetSpecsAdmin({ user }: { user: any }) {
  const { fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingRacquets, setExistingRacquets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    brand: "",
    model: "",
    head_size: "",
    string_pattern: "",
    tension_range: "",
    recommended_tension: "",
    stringing_instructions: ""
  });

  useEffect(() => {
    const fetchRacquets = async () => {
      const { data, error } = await supabase
        .from('racquet_specs_cache')
        .select('*')
        .order('brand', { ascending: true })
        .limit(100);

      if (!error && data) {
        setExistingRacquets(data);
      }
    };
    fetchRacquets();
  }, []);

  const filteredRacquets = existingRacquets.filter(r => 
    r.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('racquet_specs_cache')
        .insert({
          brand: form.brand,
          model: form.model,
          head_size: form.head_size || null,
          string_pattern: form.string_pattern || null,
          tension_range: form.tension_range || null,
          recommended_tension: form.recommended_tension || null,
          stringing_instructions: form.stringing_instructions || null
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({
          brand: "",
          model: "",
          head_size: "",
          string_pattern: "",
          tension_range: "",
          recommended_tension: "",
          stringing_instructions: ""
        });
      }, 2000);
    } catch (err: any) {
      console.error("Error adding racquet:", err);
      alert(err.message || "Failed to add racquet");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this racquet?")) return;

    const { error } = await supabase
      .from('racquet_specs_cache')
      .delete()
      .eq('id', id);

    if (!error) {
      setExistingRacquets(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Racquet Specs Admin
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Add New Racquet
            </h2>

            {success && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                Racquet added successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brand *
                </label>
                <input
                  type="text"
                  required
                  value={form.brand}
                  onChange={e => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g., Wilson"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  value={form.model}
                  onChange={e => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g., Pro Staff RF97 v13"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Head Size
                </label>
                <input
                  type="text"
                  value={form.head_size}
                  onChange={e => setForm({ ...form, head_size: e.target.value })}
                  placeholder="e.g., 97 sq in"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  String Pattern
                </label>
                <input
                  type="text"
                  value={form.string_pattern}
                  onChange={e => setForm({ ...form, string_pattern: e.target.value })}
                  placeholder="e.g., 16x19"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tension Range
                </label>
                <input
                  type="text"
                  value={form.tension_range}
                  onChange={e => setForm({ ...form, tension_range: e.target.value })}
                  placeholder="e.g., 50-60 lbs"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recommended Tension
                </label>
                <input
                  type="text"
                  value={form.recommended_tension}
                  onChange={e => setForm({ ...form, recommended_tension: e.target.value })}
                  placeholder="e.g., 55 lbs"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Stringing Instructions
                </label>
                <textarea
                  value={form.stringing_instructions}
                  onChange={e => setForm({ ...form, stringing_instructions: e.target.value })}
                  placeholder="e.g., Start C: 2, Tie Off C: 2..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Racquet"}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Existing Racquets ({existingRacquets.length})
            </h2>

            <input
              type="text"
              placeholder="Search racquets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredRacquets.map(racquet => (
                <div
                  key={racquet.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {racquet.brand} {racquet.model}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {racquet.head_size} • {racquet.string_pattern} • {racquet.tension_range}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(racquet.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}