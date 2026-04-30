import React from "react";
import { GAUGES } from "../../constants";
import { InventoryItem } from "../../types/database";

interface InventoryFormProps {
  item: Partial<InventoryItem>;
  setItem: (item: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function InventoryForm({ item, setItem, onSubmit, onCancel, submitLabel }: InventoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="inventory-type" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Type</label>
          <select 
            id="inventory-type"
            name="type"
            value={item.type}
            onChange={e => setItem({...item, type: e.target.value, packaging: e.target.value === 'string' ? 'set' : 'set', grip_type: e.target.value === 'grip' ? 'tacky' : ''})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="string">String</option>
            <option value="grip">Grip</option>
            <option value="dampener">Dampener</option>
          </select>
        </div>

        {item.type === 'string' && (
          <div className="space-y-1">
            <label htmlFor="inventory-packaging" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Packaging</label>
            <select 
              id="inventory-packaging"
              name="packaging"
              value={item.packaging}
              onChange={e => {
                const packaging = e.target.value;
                const total_length = packaging === 'reel' ? 200 : 12;
                setItem({...item, packaging, total_length, remaining_length: total_length});
              }}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="set">Individual Set (12m)</option>
              <option value="reel">Reel (200m)</option>
            </select>
          </div>
        )}

        {item.type === 'string' && (
          <div className="space-y-1">
            <label htmlFor="inventory-gauge" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Gauge</label>
            <select 
              id="inventory-gauge"
              name="gauge"
              value={item.gauge || ""}
              onChange={e => setItem({...item, gauge: e.target.value})}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Gauge</option>
              {GAUGES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        )}

        {item.type === 'string' && item.packaging === 'reel' && (
          <div className="space-y-1">
            <label htmlFor="inventory-reel-length" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Reel Length (m)</label>
            <div className="flex gap-2">
              <select 
                id="inventory-reel-length"
                name="total_length_select"
                value={[100, 200].includes(item.total_length) ? item.total_length : 'other'}
                onChange={e => {
                  const val = e.target.value;
                  const total_length = val === 'other' ? 0 : parseInt(val);
                  setItem({...item, total_length, remaining_length: total_length});
                }}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="100">100m</option>
                <option value="200">200m</option>
                <option value="other">Other</option>
              </select>
              {![100, 200].includes(item.total_length) && (
                <input 
                  id="inventory-custom-length"
                  name="total_length"
                  type="number" 
                  placeholder="Custom m"
                  value={item.total_length || ""}
                  onChange={e => {
                    const total_length = parseInt(e.target.value) || 0;
                    setItem({...item, total_length, remaining_length: total_length});
                  }}
                  className="w-24 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          </div>
        )}

        {item.type === 'grip' && (
          <div className="space-y-1">
            <label htmlFor="inventory-grip-feel" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Grip Feel</label>
            <select 
              id="inventory-grip-feel"
              name="grip_type"
              value={item.grip_type}
              onChange={e => setItem({...item, grip_type: e.target.value})}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="tacky">Tacky</option>
              <option value="dry">Dry</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label htmlFor="inventory-brand" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Brand</label>
          <input 
            id="inventory-brand"
            name="brand"
            type="text" 
            placeholder="e.g. Wilson" 
            required
            value={item.brand}
            onChange={e => setItem({...item, brand: e.target.value})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inventory-model" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Model Name</label>
          <input 
            id="inventory-model"
            name="model"
            type="text" 
            placeholder="e.g. Sensation" 
            required
            value={item.model}
            onChange={e => setItem({...item, model: e.target.value})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inventory-quantity" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Quantity</label>
          <input 
            id="inventory-quantity"
            name="quantity"
            type="number" 
            placeholder="0" 
            required
            value={item.quantity}
            onChange={e => setItem({...item, quantity: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inventory-price" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Price ($)</label>
          <input 
            id="inventory-price"
            name="unit_price"
            type="number" 
            step="0.01"
            placeholder="0.00" 
            required
            value={item.unit_price}
            onChange={e => setItem({...item, unit_price: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inventory-threshold" className="text-xs font-semibold text-neutral-500 uppercase ml-1">Low Stock Alert at</label>
          <input 
            id="inventory-threshold"
            name="low_stock_threshold"
            type="number" 
            placeholder="5" 
            required
            value={item.low_stock_threshold}
            onChange={e => setItem({...item, low_stock_threshold: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
