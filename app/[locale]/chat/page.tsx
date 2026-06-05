"use client";

import DashboardShell from "@/components/DashboardShell";
import ChatClient from "@/components/chat/ChatClient";

export default function ChatPage() {
  return (
    <DashboardShell>
      <div className="p-4">
        <ChatClient />
      </div>
    </DashboardShell>
  );
}
