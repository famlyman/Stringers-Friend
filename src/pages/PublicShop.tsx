import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";
import { usePublicShopData } from "../hooks/usePublicShopData";
import { PublicShopHero } from "../components/public-shop/PublicShopHero";
import { ServicesSection } from "../components/public-shop/ServicesSection";
import { TestimonialsSection } from "../components/public-shop/TestimonialsSection";
import { WhyChooseUsSection } from "../components/public-shop/WhyChooseUsSection";
import { ShopInfoSidebar } from "../components/public-shop/ShopInfoSidebar";
import { CustomerCTA } from "../components/public-shop/CustomerCTA";
import { FinalCTA } from "../components/public-shop/FinalCTA";
import { PublicShopFooter } from "../components/public-shop/PublicShopFooter";
import { ContactModal } from "../components/public-shop/ContactModal";

export default function PublicShop() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const { shop, loading, error, services, isCustomerOfShop, setIsCustomerOfShop } = usePublicShopData(slug, user);

  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", content: "", register: false, password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openContactModal = (serviceName: string | null = null, register: boolean = false) => {
    setSelectedService(serviceName);
    setContactForm(prev => ({ 
      ...prev, 
      content: serviceName ? `I'm interested in the ${serviceName} service.` : prev.content,
      register: register || prev.register,
      name: profile?.full_name || prev.name,
      email: user?.email || prev.email,
      phone: profile?.phone || prev.phone
    }));
    setShowContactModal(true);
  };

  const resetContactForm = () => {
    setShowContactModal(false);
    setSubmitted(false);
    setSelectedService(null);
    setSubmitError(null);
    setContactForm({ name: "", email: "", phone: "", content: "", register: false, password: "" });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      let currentUserId = user?.id;
      
      // 1. Handle Account Creation
      if (contactForm.register && !currentUserId && contactForm.password) {
        const { data } = await supabase.auth.signUp({
          email: contactForm.email,
          password: contactForm.password
        });
        if (data.user) {
          currentUserId = data.user.id;
          await supabase.from('profiles').insert({
            id: currentUserId,
            email: contactForm.email,
            role: 'customer'
          });
        }
      }

      // 2. Find or Create Customer
      let customerId = "";
      const { data: existing } = await supabase
        .from('customers')
        .select('id, profile_id')
        .eq('email', contactForm.email)
        .eq('shop_id', shop.id);
      
      if (!existing || existing.length === 0) {
        const nameParts = contactForm.name.split(' ');
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            email: contactForm.email,
            phone: contactForm.phone,
            shop_id: shop.id,
            profile_id: currentUserId || null
          })
          .select('id')
          .single();
        
        if (custErr) throw custErr;
        customerId = newCust.id;
      } else {
        customerId = existing[0].id;
        if (currentUserId && !existing[0].profile_id) {
          await supabase.from('customers').update({ profile_id: currentUserId }).eq('id', customerId);
        }
      }

      // 3. Create Message
      const { error: msgErr } = await supabase.from('messages').insert({
        shop_id: shop.id,
        customer_id: customerId,
        sender_type: 'customer',
        content: selectedService ? `Service: ${selectedService}\n\n${contactForm.content}` : contactForm.content
      });
      
      if (msgErr) throw msgErr;
      
      setSubmitted(true);
      setIsCustomerOfShop(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">404</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">{error || "Shop not found"}</p>
        <Link to="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <PublicShopHero 
        shop={shop} 
        servicesCount={services.length} 
        openContactModal={() => openContactModal()} 
      />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <ServicesSection 
              services={services} 
              openContactModal={openContactModal} 
            />
            <TestimonialsSection />
            <WhyChooseUsSection />
          </div>

          <div className="space-y-8">
            <ShopInfoSidebar shop={shop} />
            <CustomerCTA 
              user={user} 
              shop={shop} 
              isCustomerOfShop={isCustomerOfShop} 
              profile={profile}
              openContactModal={openContactModal}
            />
          </div>
        </div>
      </div>

      <FinalCTA openContactModal={() => openContactModal()} />
      
      <PublicShopFooter 
        shop={shop} 
        openContactModal={() => openContactModal()} 
      />

      {showContactModal && (
        <ContactModal 
          shop={shop}
          showContactModal={showContactModal}
          setShowContactModal={setShowContactModal}
          selectedService={selectedService}
          contactForm={contactForm}
          setContactForm={setContactForm}
          submitting={submitting}
          submitted={submitted}
          submitError={submitError}
          isCustomerOfShop={isCustomerOfShop}
          handleContactSubmit={handleContactSubmit}
          resetForm={resetContactForm}
        />
      )}
    </div>
  );
}
