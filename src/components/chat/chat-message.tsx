
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

export interface Message {
  id: string;
  sender: "user" | "persona";
  text: string | React.ReactNode;
  fullTimestamp: number; // Unix milliseconds for sorting/grouping
}

interface ChatMessageProps {
  message: Message;
  personaImageUrl?: string;
}

export function ChatMessage({ message, personaImageUrl }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 my-4 animate-in fade-in duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-primary/30">
          <AvatarImage src={personaImageUrl} alt="Persona" />
          <AvatarFallback className="bg-primary/20 text-primary">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-xl px-4 py-3 shadow-md",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground border border-border rounded-bl-none"
        )}
      >
        {typeof message.text === 'string' ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        ) : (
          message.text
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-muted">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
