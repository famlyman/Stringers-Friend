import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Send, Search, User, MessageSquare, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

interface Message {
  id: string;
  shop_id: string;
  customer_id: string;
  sender_type: "shop" | "customer";
  content: string;
  is_read: boolean;
  created_at: string;
  customers: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lastMessage?: Message;
  unreadCount: number;
}

export default function Messages({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get("customerId");

  useEffect(() => {
    fetchConversations();

    const messagesSubscription = supabase
      .channel(`messages:${user.shop_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchConversations())
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user.shop_id]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer.id);
      markAsRead(selectedCustomer.id);

      const conversationSubscription = supabase
        .channel(`conversation:${selectedCustomer.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${selectedCustomer.id}` },
          () => fetchMessages(selectedCustomer.id))
        .subscribe();

      return () => {
        conversationSubscription.unsubscribe();
      };
    }
  }, [selectedCustomer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialCustomerId) {
      const customer = conversations.find(c => c.id === initialCustomerId);
      if (customer) setSelectedCustomer(customer);
    }
  }, [initialCustomerId, conversations]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*, customers!inner(id, first_name, last_name, email, phone)")
        .eq("shop_id", user.shop_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const customerMap = new Map<string, Customer>();
      data?.forEach((msg: Message) => {
        const cust = msg.customers;
        if (!cust) return;
        
        if (!customerMap.has(cust.id)) {
          customerMap.set(cust.id, {
            id: cust.id,
            first_name: cust.first_name,
            last_name: cust.last_name,
            email: cust.email,
            phone: cust.phone,
            unreadCount: 0,
            lastMessage: msg
          });
        }
        const customer = customerMap.get(cust.id)!;
        if (!msg.is_read && msg.sender_type === "customer") {
          customer.unreadCount++;
        }
      });

      setConversations(Array.from(customerMap.values()));
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("shop_id", user.shop_id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const markAsRead = async (customerId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("shop_id", user.shop_id)
        .eq("customer_id", customerId)
        .eq("is_read", false);
      
      setConversations(prev => prev.map(c => 
        c.id === customerId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCustomer || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          shop_id: user.shop_id,
          customer_id: selectedCustomer.id,
          sender_type: "shop",
          content: newMessage.trim(),
          is_read: false
        });

      if (error) throw error;
      setNewMessage("");
      fetchMessages(selectedCustomer.id);
      fetchConversations();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {selectedCustomer ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-border-main">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-bold text-text-main">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </h2>
              <p className="text-sm text-text-muted">{selectedCustomer.email}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "shop" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender_type === "shop"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-bg-elevated text-text-main rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_type === "shop" ? "text-white/70" : "text-text-muted"
                  }`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
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
      ) : (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-bg-elevated border border-border-main rounded-lg focus:outline-none focus:border-primary text-text-main"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="font-bold text-text-main mb-1">No messages yet</h3>
                <p className="text-sm text-text-muted">Conversations with customers will appear here</p>
              </div>
            ) : (
              filteredConversations.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-bg-elevated/50 transition-colors text-left border-b border-border-main"
                >
                  <div className="w-12 h-12 bg-bg-elevated rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-text-main truncate">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <span className="text-xs text-text-muted">
                        {customer.lastMessage && formatTime(customer.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {customer.lastMessage?.content || "No messages"}
                    </p>
                  </div>
                  {customer.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{customer.unreadCount}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}