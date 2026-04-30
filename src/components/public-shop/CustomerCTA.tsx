import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, UserPlus, ChevronRight } from "lucide-react";
import { Shop, Profile } from "../../types/database";

interface CustomerCTAProps {
  user: any;
  shop: Shop;
  isCustomerOfShop: boolean;
  profile: Profile | null;
  openContactModal: (serviceName?: string, register?: boolean) => void;
}

export function CustomerCTA({ user, shop, isCustomerOfShop, openContactModal }: CustomerCTAProps) {
  return (
    <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10">
      <h3 className="font-bold text-neutral-900 dark:text-white mb-4">
        {user ? (isCustomerOfShop ? "Already a Customer" : "Join this Shop") : "New Customer?"}
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        {user 
          ? (isCustomerOfShop 
              ? "You are already registered with this shop. Go to your dashboard to manage your racquets."
              : "You have an account but aren't registered with this shop yet. Join now to start tracking your jobs here.")
          : "Register to create your \"Bag\" of racquets and track all your stringing history in one place."}
      </p>
      {user ? (isCustomerOfShop ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-bold">
              <CheckCircle2 className="w-5 h-5" /> Already a Customer
            </div>
            <p className="text-xs text-neutral-500 mt-2">You can manage your racquets in the dashboard.</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => openContactModal(undefined, true)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Join this Shop <UserPlus className="w-4 h-4" />
            </button>
            <p className="text-xs text-neutral-500 mt-2">Register to track your racquets and jobs.</p>
          </>
        )
      ) : (
        <Link
          to={`/register?shopId=${shop.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-neutral-900 border border-primary/20 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all"
        >
          Create Account <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
