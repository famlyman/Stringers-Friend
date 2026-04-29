import React from "react";
import { TrendingUp, MessageSquare, ChevronRight } from "lucide-react";

interface FinalCTAProps {
  openContactModal: () => void;
}

export function FinalCTA({ openContactModal }: FinalCTAProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary py-20">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-bold uppercase tracking-wider mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Ready to Get Started?
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
          Transform Your Game Today
        </h2>
        <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
          Join hundreds of satisfied players who trust us with their racquet stringing needs. 
          Experience the difference that professional stringing can make.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={openContactModal}
            className="px-8 py-4 bg-white text-primary rounded-2xl font-bold hover:bg-white/90 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Get Started Now
          </button>
          <button
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/20 backdrop-blur text-white rounded-2xl font-bold hover:bg-white/30 transition-all border border-white/30 flex items-center justify-center gap-2"
          >
            View Our Services
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
