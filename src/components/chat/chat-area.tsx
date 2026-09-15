
"use client";

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, type Message } from './chat-message';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { Persona } from '@/app/chat/page';

interface ChatAreaProps {
  messages: Message[];
  persona?: Persona | null;
  isLoading?: boolean;
}

const FALLBACK_PERSONA_NAME = "Persona";

export function ChatArea({ 
  messages, 
  persona, 
  isLoading = false 
}: ChatAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const personaName = persona?.name || FALLBACK_PERSONA_NAME;
  
  const initialPersonaMessageText = `Hi there! I'm ${personaName}. How can I help you today?`;
  
  // Construct the initial message without a dynamic timestamp
  const currentInitialMessage: Message = {
    id: 'initial-persona-message',
    sender: 'persona',
    text: initialPersonaMessageText,
    fullTimestamp: 0,
  };

  const finalDisplayedMessages = [currentInitialMessage, ...messages];

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [finalDisplayedMessages, isLoading]);

  return (
    <ScrollArea className="flex-1 bg-muted/30" viewportRef={viewportRef}>
      <div className="p-4 sm:p-6 space-y-2">
        {finalDisplayedMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} personaImageUrl={persona?.imageUrl} />
        ))}
        {isLoading && messages.length > 0 && (
           <ChatMessage key="typing" message={{id: 'typing', sender: 'persona', text: PersonaTypingIndicator({personaName}), fullTimestamp: Date.now()}} personaImageUrl={persona?.imageUrl} />
        )}
         {messages.length === 0 && !isLoading && (
            <Alert className="mt-4 border-primary/50 bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-semibold text-[#000000] dark:text-foreground">Ready to Chat!</AlertTitle>
              <AlertDescription className="text-foreground">
                Type your first question below to start a conversation with {personaName}.
              </AlertDescription>
            </Alert>
          )}
      </div>
    </ScrollArea>
  );
}

function PersonaTypingIndicator({personaName = FALLBACK_PERSONA_NAME}: {personaName?: string}) {
  return (
    <div className="flex items-center space-x-1 p-1">
      <span className="text-xs text-muted-foreground">{personaName} is typing</span>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"></div>
    </div>
  );
}
