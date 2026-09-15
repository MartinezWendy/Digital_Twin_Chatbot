
"use client";

import React, { useState, useEffect } from 'react';
import { ChatArea } from './chat-area';
import { ChatInput } from './chat-input';
import type { Message } from './chat-message';
import { generatePersonaResponse, type GeneratePersonaResponseInput } from '@/ai/flows/generate-persona-response';
import { summarizeConversationTitle } from '@/ai/flows/summarize-conversation-title';
import { useToast } from "@/hooks/use-toast";
import type { Persona } from '@/app/chat/page';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

interface ChatClientProps {
  persona: Persona;
  conversation: Conversation;
  onUpdateConversation: (updatedConversation: Conversation) => void;
}

const isFollowUpQuestion = (text: string): boolean => {
    const followUpPatterns = [
        /^why\??$/,
        /^how so\??$/,
        /^can you explain\??$/,
        /^tell me more\??$/,
        /^what do you mean\??$/
    ];
    const normalizedText = text.trim().toLowerCase();
    return followUpPatterns.some(pattern => pattern.test(normalizedText));
}


export function ChatClient({ persona, conversation, onUpdateConversation }: ChatClientProps) {
  const [activeConversation, setActiveConversation] = useState(conversation);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const shouldGenerateTitle = activeConversation.messages.length >= 2 && activeConversation.title === "New Conversation" && !isLoadingResponse;

    if (shouldGenerateTitle) {
      const historyText = activeConversation.messages
        .slice(0, 2)
        .map(m => `${m.sender === 'user' ? 'User' : persona.name}: ${typeof m.text === 'string' ? m.text : '[response]'}`)
        .join('\n');
      
      summarizeConversationTitle({ conversationHistory: historyText })
        .then(output => {
            if (output?.title) {
                const updatedConvo = { ...activeConversation, title: output.title };
                setActiveConversation(updatedConvo);
                onUpdateConversation(updatedConvo);
            }
        })
        .catch(err => {
            console.error("Failed to generate chat title:", err);
            const updatedConvo = { ...activeConversation, title: "Chat" };
            setActiveConversation(updatedConvo);
            onUpdateConversation(updatedConvo);
        });
    }
  }, [activeConversation, isLoadingResponse, persona.name, onUpdateConversation]);

  const handleSendMessage = async (userInput: string) => {
    setIsLoadingResponse(true);

    const newUserMessage: Message = { id: Date.now().toString(), sender: 'user', text: userInput, fullTimestamp: Date.now() };

    // Optimistically update UI with user's message
    const convoWithUserMessage: Conversation = {
        ...activeConversation,
        messages: [...activeConversation.messages, newUserMessage],
        lastUpdated: Date.now()
    };
    setActiveConversation(convoWithUserMessage);
    // Persist user message immediately
    onUpdateConversation(convoWithUserMessage);

    try {
      const lastUserMessage = convoWithUserMessage.messages
            .filter(m => m.sender === 'user')
            .slice(-2, -1)[0]?.text;
      
      let contextQuestion = null;
      if (isFollowUpQuestion(userInput) && lastUserMessage && typeof lastUserMessage === 'string') {
          contextQuestion = lastUserMessage;
      }

      const aiInput: GeneratePersonaResponseInput = {
        personaName: persona.name,
        personaDescription: persona.fullDescription,
        userInput,
        surveyData: persona.surveyData,
        lastUserQuestion: contextQuestion,
      };
      
      const aiOutput = await generatePersonaResponse(aiInput);
      
      const personaMessage: Message = {
        id: (Date.now() + 1).toString(), 
        sender: 'persona',
        text: aiOutput.response,
        fullTimestamp: Date.now(),
      };
      
      const finalConversation: Conversation = {
          ...convoWithUserMessage,
          messages: [...convoWithUserMessage.messages, personaMessage],
          lastUpdated: Date.now(),
      };

      setActiveConversation(finalConversation);
      onUpdateConversation(finalConversation);

    } catch (error) {
      console.error("Error generating persona response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'persona',
        text: "Sorry, I encountered an issue trying to respond. Please try again.",
        fullTimestamp: Date.now(),
      };
      
      const finalConversation: Conversation = {
          ...convoWithUserMessage,
          messages: [...convoWithUserMessage.messages, errorMessage],
          lastUpdated: Date.now(),
      };

      setActiveConversation(finalConversation);
      onUpdateConversation(finalConversation);
      
      toast({
        title: "Error",
        description: "Could not get response from AI. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatArea 
        messages={activeConversation.messages} 
        persona={persona} 
        isLoading={isLoadingResponse} 
      />
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoadingResponse} 
      />
    </div>
  );
}

    