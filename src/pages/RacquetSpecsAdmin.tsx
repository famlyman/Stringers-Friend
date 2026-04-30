import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";
import { Profile } from "../types/database";

export default function RacquetSpecsAdmin({ user }: { user: Profile }) {
  const { fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [stringSuccess, setStringSuccess] = useState(false);
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

  const [stringForm, setStringForm] = useState({
    brand: "",
    model: "",
    category: "string",
    gauge: "",
    color: "",
    description: ""
  });

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

  const handleStringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('string_catalog')
        .insert({
          brand: stringForm.brand,
          model: stringForm.model,
          category: stringForm.category,
          gauge: stringForm.gauge || null,
          color: stringForm.color || null,
          description: stringForm.description || null
        });

      if (error) throw error;

      setStringSuccess(true);
      setTimeout(() => {
        setStringSuccess(false);
        setStringForm({
          brand: "",
          model: "",
          category: "string",
          gauge: "",
          color: "",
          description: ""
        });
      }, 2000);
    } catch (err: any) {
      console.error("Error adding string:", err);
      alert(err.message || "Failed to add string");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin
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
              Add Racquet Spec
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
              Add String to Catalog
            </h2>

            {stringSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                String added successfully!
              </div>
            )}

            <form onSubmit={handleStringSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brand *
                </label>
                <input
                  type="text"
                  required
                  value={stringForm.brand}
                  onChange={e => setStringForm({ ...stringForm, brand: e.target.value })}
                  placeholder="e.g., HEAD"
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
                  value={stringForm.model}
                  onChange={e => setStringForm({ ...stringForm, model: e.target.value })}
                  placeholder="e.g., Lynx Tour"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  value={stringForm.category}
                  onChange={e => setStringForm({ ...stringForm, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="string">String</option>
                  <option value="grip">Grip</option>
                  <option value="dampener">Dampener</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gauge
                </label>
                <input
                  type="text"
                  value={stringForm.gauge}
                  onChange={e => setStringForm({ ...stringForm, gauge: e.target.value })}
                  placeholder="e.g., 17"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color
                </label>
                <input
                  type="text"
                  value={stringForm.color}
                  onChange={e => setStringForm({ ...stringForm, color: e.target.value })}
                  placeholder="e.g., Black"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={stringForm.description}
                  onChange={e => setStringForm({ ...stringForm, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add String"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}