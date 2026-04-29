import React from "react";
import { Zap } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface ServicesSectionProps {
  services: Service[];
  openContactModal: (serviceName: string) => void;
}

export function ServicesSection({ services, openContactModal }: ServicesSectionProps) {
  const FIXED_SERVICES = [
    { id: 'string_full_bed', name: 'String Job Full Bed', price: 25, description: 'Professional full bed stringing service.' },
    { id: 'string_hybrid', name: 'String Job Hybrid', price: 25, description: 'Custom hybrid stringing for optimal performance.' },
    { id: 'string_grip', name: 'String and Grip', price: 30, description: 'Full stringing service plus a new grip installation.' },
    { id: 'string_dampener', name: 'String and Dampener', price: 27, description: 'Full stringing service plus a new dampener.' },
    { id: 'string_grip_dampener', name: 'String with Grip and Dampener', price: 32, description: 'The complete package: strings, grip, and dampener.' },
  ];

  return (
    <section id="services">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
          Stringing Services & Pricing
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-12">
        {FIXED_SERVICES.map((service) => (
          <div 
            key={service.id} 
            className="group flex items-center justify-between p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-primary/50 transition-all hover:shadow-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">
                  {service.name}
                </h3>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 ml-11">
                {service.description}
              </p>
            </div>
            <div className="text-right ml-6">
              <div className="text-3xl font-black text-neutral-900 dark:text-white">
                ${service.price}
              </div>
              <p className="text-xs text-neutral-400 uppercase font-bold tracking-tighter mt-1">
                Labor Included
              </p>
              <button
                onClick={() => openContactModal(service.name)}
                className="mt-3 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-all"
              >
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
