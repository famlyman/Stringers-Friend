import React from "react";
import { QrCode, Edit2, Trash2, AlertCircle } from "lucide-react";
import { InventoryItem } from "../../types/database";

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  setShowQRCodeModal: (data: { value: string, label: string }) => void;
  setEditingItem: (item: InventoryItem) => void;
  handleDelete: (id: string) => void;
}

export function InventoryTable({ items, loading, setShowQRCodeModal, setEditingItem, handleDelete }: InventoryTableProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto shadow-sm">
      <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
        <thead>
          <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Item</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Details</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stock</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-medium text-neutral-900 dark:text-white">{item.model}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.brand}</p>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="capitalize text-sm text-neutral-600 dark:text-neutral-300 font-medium">{item.category}</span>
                  <span className="text-xs text-neutral-400">
                    {item.category === 'string' && (
                      item.packaging === 'reel' ? `Reel (${item.total_length}${item.length_unit || 'm'})` :
                      item.packaging === 'mini-reel' ? `Mini Reel (${item.total_length}${item.length_unit || 'm'})` :
                      'Individual Set'
                    )}
                    {item.category === 'grip' && `Grip`}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    {(item.packaging === 'reel' || item.packaging === 'mini-reel') ? (
                      <>
                        <span className={`text-sm font-medium ${(item.remaining_length || 0) <= (item.low_stock_threshold || 20) ? 'text-red-600' : 'text-neutral-900 dark:text-white'}`}>
                          {item.quantity} {item.quantity === 1 ? 'Reel' : 'Reels'}
                        </span>
                        {(item.remaining_length || 0) <= (item.low_stock_threshold || 20) && <AlertCircle className="w-4 h-4 ml-2 text-red-500" />}
                      </>
                    ) : (
                      <>
                        <span className={`text-sm font-medium ${item.quantity <= (item.low_stock_threshold || 5) ? 'text-red-600' : 'text-neutral-900 dark:text-white'}`}>
                          {item.quantity} {item.packaging === 'set' ? 'Sets' : 'Units'}
                        </span>
                        {item.quantity <= (item.low_stock_threshold || 5) && <AlertCircle className="w-4 h-4 ml-2 text-red-500" />}
                      </>
                    )}
                  </div>
                  {(item.packaging === 'reel' || item.packaging === 'mini-reel') && (
                    <div className="mt-1 w-32">
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span>{Math.round(item.remaining_length || 0)}{item.length_unit || 'm'} left</span>
                        <span>{Math.floor((item.remaining_length || 0) / (item.length_unit === 'ft' ? 40 : 12))} jobs</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1">
                        <div 
                          className="bg-primary h-1 rounded-full" 
                          style={{ width: `${((item.remaining_length || 0) / (item.total_length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">${(item.unit_price ?? 0).toFixed(2)}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={() => setShowQRCodeModal({ value: item.qr_code || `inventory_${item.id}`, label: `${item.brand} ${item.model}` })}
                  className="p-2 text-neutral-400 hover:text-primary transition-colors"
                  title="Show QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setEditingItem(item)}
                  className="p-2 text-neutral-400 hover:text-primary transition-colors ml-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-neutral-400 hover:text-red-600 transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                Your inventory is empty. Add your first item to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
