import React from "react";
import { X, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { Shop } from "../../types/database";

interface ContactModalProps {
  shop: Shop;
  showContactModal: boolean;
  setShowContactModal: (show: boolean) => void;
  selectedService: string | null;
  contactForm: any;
  setContactForm: (form: any) => void;
  submitting: boolean;
  submitted: boolean;
  submitError: string | null;
  isCustomerOfShop: boolean;
  handleContactSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
}

export function ContactModal({
  shop,
  setShowContactModal,
  selectedService,
  contactForm,
  setContactForm,
  submitting,
  submitted,
  submitError,
  isCustomerOfShop,
  handleContactSubmit,
  resetForm
}: ContactModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in duration-300 border border-neutral-200 dark:border-neutral-800 relative overflow-hidden">
        <button 
          onClick={resetForm}
          className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {submitted ? (
          <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Message Sent!</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              {shop.name} has received your request and will get back to you soon.
              {contactForm.register && " Your account has been created and you are now registered with this shop."}
            </p>
            <button 
              onClick={resetForm}
              className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              {selectedService ? (
                <>
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">{selectedService}</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg w-fit text-xs font-bold">
                    <Zap className="w-3 h-3" /> Service Request
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Request Service</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">Send a message to {shop.name} about your racquet.</p>
                </>
              )}
            </div>

            {submitError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in shake duration-300">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="font-medium">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="contact-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Your Name</label>
                  <input 
                    id="contact-name"
                    name="name"
                    type="text" 
                    required
                    value={contactForm.name}
                    onChange={e => setContactForm({...contactForm, name: e.target.value})}
                    className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="contact-email" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    id="contact-email"
                    name="email"
                    type="email" 
                    required
                    value={contactForm.email}
                    onChange={e => setContactForm({...contactForm, email: e.target.value})}
                    className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="john@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="contact-phone" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone (Optional)</label>
                <input 
                  id="contact-phone"
                  name="phone"
                  type="tel" 
                  value={contactForm.phone}
                  onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                  className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="(555) 000-0000"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="contact-content" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Message / Racquet Details</label>
                <textarea 
                  id="contact-content"
                  name="content"
                  required
                  value={contactForm.content}
                  onChange={e => setContactForm({...contactForm, content: e.target.value})}
                  className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all h-32 resize-none"
                  placeholder="Tell us about your racquet and stringing preferences..."
                />
              </div>

              {!isCustomerOfShop && (
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer group hover:bg-primary/10 transition-all">
                    <input 
                      id="contact-register"
                      name="register"
                      type="checkbox"
                      checked={contactForm.register}
                      onChange={e => setContactForm({...contactForm, register: e.target.checked})}
                      className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">Register as a customer</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Save your info and track your racquet history with this shop.</p>
                    </div>
                  </label>

                  {contactForm.register && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <label htmlFor="contact-password" title="Create Password" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Create Password</label>
                      <input 
                        id="contact-password"
                        name="password"
                        type="password" 
                        required
                        value={contactForm.password}
                        onChange={e => setContactForm({...contactForm, password: e.target.value})}
                        className="w-full px-5 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <p className="text-[10px] text-neutral-400 ml-1">This will be your password to log in later.</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-4"
              >
                {submitting ? "Sending..." : "Send Request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
