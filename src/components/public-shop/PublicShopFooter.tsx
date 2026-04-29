import React from "react";
import { MapPin, Phone } from "lucide-react";

interface PublicShopFooterProps {
  shop: any;
  openContactModal: () => void;
}

export function PublicShopFooter({ shop, openContactModal }: PublicShopFooterProps) {
  return (
    <footer className="bg-neutral-900 dark:bg-white border-t border-neutral-800 dark:border-neutral-200 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-black text-white dark:text-neutral-900 mb-4">{shop.name}</h3>
            <p className="text-sm text-neutral-400 dark:text-neutral-600 leading-relaxed">
              Professional racquet stringing services with precision, care, and quick turnaround. 
              Trusted by players of all levels.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider mb-4">Quick Links</h4>
            <div className="space-y-2">
              <button
                onClick={openContactModal}
                className="block text-sm text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 transition-colors"
              >
                Request Service
              </button>
              <button
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                className="block text-sm text-neutral-400 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 transition-colors"
              >
                Services & Pricing
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider mb-4">Contact Info</h4>
            <div className="space-y-3">
              {shop.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm text-neutral-400 dark:text-neutral-600">{shop.address}</span>
                </div>
              )}
              {shop.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm text-neutral-400 dark:text-neutral-600">{shop.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-neutral-800 dark:border-neutral-200 text-center">
          <p className="text-sm text-neutral-400 dark:text-neutral-600">
            &copy; {new Date().getFullYear()} {shop.name}. Powered by <span className="text-primary font-bold">Stringers Friend</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
