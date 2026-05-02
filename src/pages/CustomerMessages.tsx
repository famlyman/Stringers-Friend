import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Send, MessageSquare, ArrowLeft, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { sendNotification } from "../lib/notifications";
import { Profile, Message } from "../types/database";

export default function CustomerMessages({ user }: { user: Profile | null }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopId, setShopId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    async function init() {
      await fetchCustomerShop();
    }
    init();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let subscription: any = null;
    
    const setupSubscription = async () => {
      if (!customerId || !shopId) return;
      
      // Clean up any existing subscription
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      
      subscription = supabase
        .channel(`customer-messages:${customerId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${customerId}` },
          () => fetchMessages())
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [customerId, shopId]);

  const fetchCustomerShop = async () => {
    if (!user) return;
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, shop_id, shops!inner(name)")
        .eq("profile_id", user.id)
        .single();

      if (customerError) throw customerError;
      if (!customerData) {
        setLoading(false);
        return;
      }

      setShopId(customerData.shop_id);
      setCustomerId(customerData.id);
      const shopData = customerData?.shops as unknown as { name: string }[] | null;
      setShopName(shopData?.[0]?.name || "Shop");

      await fetchMessages(customerData.shop_id, customerData.id);
    } catch (err) {
      console.error("Error fetching customer shop:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sid?: string, cid?: string) => {
    const shopIdToUse = sid || shopId;
    const customerIdToUse = cid || customerId;
    if (!shopIdToUse || !customerIdToUse) return;

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("shop_id", shopIdToUse)
      .eq("customer_id", customerIdToUse)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return;
    }
    setMessages(messagesData || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !shopId || sending || !user) return;

    setSending(true);
    try {
      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!customerData) return;

      const { error } = await supabase
        .from("messages")
        .insert({
          shop_id: shopId,
          customer_id: customerData.id,
          sender_type: "customer",
          content: newMessage.trim(),
          is_read: false
        });

      if (error) throw error;
      setNewMessage("");
      fetchMessages();

      // Send push notification to shop owner
      const { data: shop } = await supabase
        .from('shops')
        .select('owner_id, name')
        .eq('id', shopId)
        .single();

      if (shop?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('id', shop.owner_id)
          .single();

        if (ownerProfile?.onesignal_player_id) {
          await sendNotification(
            ownerProfile.onesignal_player_id,
            'New Message',
            `New message from ${user.profile?.full_name || 'a customer'}: ${newMessage.trim().substring(0, 50)}...`,
            { type: 'message', shop_id: shopId }
          );
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (!user) {
    return (
      <div className="p-12 text-center">
        <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="font-bold text-text-main mb-1">Please log in</h3>
        <p className="text-sm text-text-muted">You need to be logged in to view messages</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="p-12 text-center">
        <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="font-bold text-text-main mb-1">No shop connected</h3>
        <p className="text-sm text-text-muted mb-4">Visit a shop to start messaging</p>
        <Link to="/" className="text-primary hover:underline">Browse Shops</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 p-4 border-b border-border-main">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-text-main">{shopName}</h2>
          <p className="text-sm text-text-muted">Chat with the shop</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">Start a conversation with {shopName}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.sender_type === "customer"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-bg-elevated text-text-main rounded-bl-sm"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_type === "customer" ? "text-white/70" : "text-text-muted"
                }`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t border-border-main">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-bg-elevated border border-border-main rounded-lg focus:outline-none focus:border-primary text-text-main"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}