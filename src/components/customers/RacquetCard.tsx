import React from "react";
import { ChevronRight } from "lucide-react";
import { Racquet } from "../../types/database";

interface RacquetCardProps {
  racquet: Racquet;
  expandedRacquetId: string | null;
  setExpandedRacquetId: (id: string | null) => void;
  setEditingRacquet: (racquet: Racquet) => void;
  setShowRacquetQR: (racquet: Racquet) => void;
  setDeleteConfirm: (confirm: { type: 'racquet', id: string, name: string }) => void;
  customerName: string;
}

export function RacquetCard({ 
  racquet, 
  expandedRacquetId, 
  setExpandedRacquetId, 
  setEditingRacquet, 
  setShowRacquetQR, 
  setDeleteConfirm,
  customerName
}: RacquetCardProps) {
  const isExpanded = expandedRacquetId === racquet.id;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden">
      <div 
        onClick={() => setExpandedRacquetId(isExpanded ? null : racquet.id)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-neutral-900 dark:text-white truncate">
            {racquet.brand} {racquet.model}
          </h4>
          {racquet.serial_number && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded font-mono">
              S/N: {racquet.serial_number}
            </span>
          )}
        </div>
        <span className="text-xs text-primary font-medium flex items-center gap-1 whitespace-nowrap">
          {isExpanded ? 'Collapse' : 'Expand'} 
          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </span>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-700 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {racquet.head_size > 0 && (
              <div>
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Head Size</span>
                <p className="text-neutral-700 dark:text-neutral-300">{racquet.head_size} sq in</p>
              </div>
            )}
            {racquet.string_pattern_mains > 0 && (
              <div>
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Pattern</span>
                <p className="text-neutral-700 dark:text-neutral-300">{racquet.string_pattern || `${racquet.string_pattern_mains}x${racquet.string_pattern_crosses}`}</p>
              </div>
            )}
            {racquet.tension_range && (
              <div>
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Tension Range</span>
                <p className="text-neutral-700 dark:text-neutral-300">{racquet.tension_range}</p>
              </div>
            )}
            {racquet.recommended_tension && (
              <div>
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Recommended</span>
                <p className="text-neutral-700 dark:text-neutral-300">{racquet.recommended_tension}</p>
              </div>
            )}
            {(racquet.one_piece_length || racquet.two_piece_length) && (
              <div>
                <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">String Length</span>
                <p className="text-neutral-700 dark:text-neutral-300">{racquet.two_piece_length || racquet.one_piece_length} ft</p>
              </div>
            )}
            <div>
              <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Current Strings</span>
              <p className="text-neutral-700 dark:text-neutral-300 truncate">
                {racquet.current_string_main ? `${racquet.current_string_main} / ${racquet.current_string_cross || 'Same'}` : 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingRacquet(racquet); }}
              className="flex-1 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Edit Details
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowRacquetQR(racquet); }}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              QR Code
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'racquet', id: racquet.id, name: `${racquet.brand} ${racquet.model}` }); }}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
