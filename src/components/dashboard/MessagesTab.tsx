import React from "react";
import { MessageSquare } from "lucide-react";

export function MessagesTab() {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="font-bold text-text-main mb-1">No messages yet</h3>
      <p className="text-sm text-text-muted">Messages from customers will appear here</p>
    </div>
  );
}
