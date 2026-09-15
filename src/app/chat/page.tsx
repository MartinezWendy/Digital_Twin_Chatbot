
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Loader2, Bot, Eye, X, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from '@/context/auth-provider';
import { firestore } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, getDoc, type DocumentSnapshot } from 'firebase/firestore';
import type { Conversation } from "@/components/chat/chat-client";
import type { Message } from '@/components/chat/chat-message';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Dynamically import the ChatClient component
const ChatClient = dynamic(() =>
  import('@/components/chat/chat-client').then(mod => mod.ChatClient),
  {
    loading: () => <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>,
    ssr: false // This component interacts with localStorage, so we disable SSR for it
  }
);

export interface Persona {
  id: string;
  name: string;
  segment?: string;
  shortDescription: string;
  fullDescription: string;
  surveyData?: string;
  surveyFileName?: string;
  contextFileName?: string;
  imageUrl?: string;
}

const mapDocToPersona = (doc: DocumentSnapshot): Persona => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || "Unnamed Persona",
        segment: data.segment || "",
        shortDescription: data.shortDescription || "No description provided.",
        fullDescription: data.fullDescription || "",
        surveyData: data.surveyData || "",
        surveyFileName: data.surveyFileName || "",
        contextFileName: data.contextFileName || "",
        imageUrl: data.imageUrl || "",
    };
};


const ChatEmptyState = ({ isAdmin, hasPersonas }: { isAdmin: boolean, hasPersonas: boolean }) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center bg-muted/20 h-full">
      <div className="max-w-md">
        <Bot className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold">Welcome to PersonaChat</h2>
        {isAdmin ? (
          <>
            <p className="mt-2 text-muted-foreground">
              Select a persona from the sidebar, or create a new one to get started.
            </p>
            <Button asChild className="mt-6">
              <Link href="/settings">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Persona
              </Link>
            </Button>
          </>
        ) : hasPersonas ? (
          <p className="mt-2 text-muted-foreground">
            Please select a persona from the sidebar on the left to start a conversation.
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            No personas have been assigned to you yet. Please contact an administrator.
          </p>
        )}
      </div>
    </div>
  );
};

const PERSONA_CONVOS_PREFIX = 'personaConvos_';

export default function ChatPage() {
  const { user, userProfile, loading, isPreviewing } = useAuth();
  const router = useRouter();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [conversationsByPersona, setConversationsByPersona] = useState<Map<string, Conversation[]>>(new Map());

   const loadAllConversations = useCallback(() => {
    const newConversationsByPersona = new Map<string, Conversation[]>();
    if (typeof window !== 'undefined' && personas.length > 0) {
      personas.forEach(persona => {
        const storageKey = `${PERSONA_CONVOS_PREFIX}${persona.id}`;
        try {
          const storedData = localStorage.getItem(storageKey);
          if (storedData) {
            const conversations = JSON.parse(storedData);
            if (Array.isArray(conversations)) {
              const sortedConvos = conversations.sort((a,b) => b.lastUpdated - a.lastUpdated);
              newConversationsByPersona.set(persona.id, sortedConvos);
            }
          }
        } catch (e) {
          console.error(`Failed to parse conversations for persona ${persona.id}:`, e);
        }
      });
    }
    setConversationsByPersona(newConversationsByPersona);
  }, [personas]);

  useEffect(() => {
    loadAllConversations();
    
    const handleHistoryUpdate = () => loadAllConversations();
    window.addEventListener('chatHistoryUpdated', handleHistoryUpdate);
    
    return () => {
      window.removeEventListener('chatHistoryUpdated', handleHistoryUpdate);
    };
  }, [loadAllConversations]);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const handleSelectConversation = (personaId: string, conversationId: string | null) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;

    setActivePersona(persona);
    localStorage.setItem('lastActivePersonaId', personaId);

    if (conversationId) {
        const convos = conversationsByPersona.get(personaId) || [];
        const convo = convos.find(c => c.id === conversationId);
        setActiveConversation(convo || null);
        if (convo) {
            localStorage.setItem(`lastActiveConversationId_${personaId}`, conversationId);
        } else {
            localStorage.removeItem(`lastActiveConversationId_${personaId}`);
        }
    } else {
        setActiveConversation(null);
        localStorage.removeItem(`lastActiveConversationId_${personaId}`);
    }
  };

  const handleCreateNewConversation = (personaId: string) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;

      const newConvo: Conversation = {
          id: Date.now().toString(),
          title: "New Conversation",
          messages: [],
          lastUpdated: Date.now(),
      };
      
      const storageKey = `${PERSONA_CONVOS_PREFIX}${persona.id}`;
      const allConvos = conversationsByPersona.get(personaId) || [];
      const updatedConvos = [newConvo, ...allConvos];

      localStorage.setItem(storageKey, JSON.stringify(updatedConvos));
      
      setActivePersona(persona);
      setActiveConversation(newConvo);

      window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
  };

  const handleUpdateConversation = (updatedConversation: Conversation) => {
    setActiveConversation(updatedConversation);
    if (!activePersona) return;

    const storageKey = `${PERSONA_CONVOS_PREFIX}${activePersona.id}`;
    const allConvos = conversationsByPersona.get(activePersona.id) || [];
    const convoIndex = allConvos.findIndex(c => c.id === updatedConversation.id);
    
    let updatedConvos;
    if (convoIndex > -1) {
        updatedConvos = [...allConvos];
        updatedConvos[convoIndex] = updatedConversation;
    } else {
        updatedConvos = [updatedConversation, ...allConvos];
    }
    
    const sortedConvos = updatedConvos.sort((a,b) => b.lastUpdated - a.lastUpdated);
    localStorage.setItem(storageKey, JSON.stringify(sortedConvos));
    window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
  }

  useEffect(() => {
    if (!userProfile || !firestore) {
      if (!loading) setIsLoadingPersonas(false);
      return;
    };

    setIsLoadingPersonas(true);

    let unsubscribe = () => {};

    const handlePersonasUpdate = (personasData: Persona[]) => {
        setPersonas(personasData);
        if (personasData.length > 0) {
            const lastActivePersonaId = localStorage.getItem('lastActivePersonaId');
            const targetPersona = lastActivePersonaId ? personasData.find(p => p.id === lastActivePersonaId) : null;
            
            if (targetPersona) {
              const lastActiveConvoId = localStorage.getItem(`lastActiveConversationId_${targetPersona.id}`);
              handleSelectConversation(targetPersona.id, lastActiveConvoId || null);
            } else if (activePersona && !personasData.find(p => p.id === activePersona.id)) {
                setActivePersona(null);
                setActiveConversation(null);
                localStorage.removeItem('lastActivePersonaId');
            } else if (!activePersona) {
                 setActivePersona(null);
                 setActiveConversation(null);
                 localStorage.removeItem('lastActivePersonaId');
            }
        } else {
            setPersonas([]);
            setActivePersona(null);
            setActiveConversation(null);
            localStorage.removeItem('lastActivePersonaId');
        }
        setIsLoadingPersonas(false);
    };

    if (userProfile?.role === 'admin') {
      const q = query(collection(firestore, "personas"));
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const personasData = querySnapshot.docs.map(mapDocToPersona);
        handlePersonasUpdate(personasData);
      }, (error) => {
        console.error("Error fetching personas:", error);
        setIsLoadingPersonas(false);
      });
    } else if (userProfile?.role === 'client') {
      const assignedIds = userProfile.assignedPersonaIds;
      if (assignedIds && assignedIds.length > 0) {
        const personaPromises = assignedIds.map(id => getDoc(doc(firestore!, 'personas', id)));
        Promise.all(personaPromises)
          .then(docs => {
              const personasData = docs.filter(docSnap => docSnap.exists()).map(mapDocToPersona);
              handlePersonasUpdate(personasData);
          }).catch(error => {
              console.error("Error fetching assigned personas: ", error);
              setIsLoadingPersonas(false);
          });
      } else {
        handlePersonasUpdate([]);
      }
    } else {
        setIsLoadingPersonas(false);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, loading]);

  const isAdmin = userProfile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground">
        <ChatSidebar 
          personas={personas}
          activePersonaId={activePersona?.id || null}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onCreateNewConversation={handleCreateNewConversation}
          conversationsByPersona={conversationsByPersona}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="flex h-20 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <SidebarTrigger /> 
               <div className="flex items-center gap-3 px-2 -ml-2 sm:ml-0">
                  {activePersona ? (
                     <Link href={`/persona/${activePersona.id}`} passHref>
                        <Avatar className="h-14 w-14 border border-primary/30">
                            <AvatarImage src={activePersona.imageUrl} alt={`Avatar for ${activePersona.name}`} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                                <Bot size={28} />
                            </AvatarFallback>
                        </Avatar>
                     </Link>
                  ) : (
                    <Bot className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex flex-col items-start gap-0 overflow-hidden">
                      {activePersona ? (
                        <>
                          <Link href={`/persona/${activePersona.id}`} className="text-lg font-bold font-headline text-foreground truncate hover:underline">
                            {activePersona.name}
                          </Link>
                           {activePersona?.segment && (
                            <span className="text-xs text-muted-foreground font-medium truncate">{activePersona.segment}</span>
                          )}
                        </>
                      ) : (
                          <span className="text-lg font-bold font-headline text-foreground truncate">Select Persona</span>
                      )}
                  </div>
               </div>
            </div>
          </header>

          {isPreviewing && (
            <div className="flex items-center justify-between gap-4 bg-accent/20 text-foreground px-4 py-2 text-sm border-b border-accent/30">
                <div className="flex items-center gap-2 font-semibold">
                    <Eye className="h-4 w-4 text-foreground" />
                    You are in Preview Mode
                </div>
                <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 text-foreground hover:bg-accent/30 hover:text-foreground">
                    <Link href="/chat">
                        <X className="mr-2 h-4 w-4" />
                        Exit Preview
                    </Link>
                </Button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col overflow-hidden">
             {isLoadingPersonas ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
             ) : activePersona && activeConversation ? (
               <ChatClient 
                  key={`${activePersona.id}-${activeConversation.id}`}
                  persona={activePersona} 
                  conversation={activeConversation}
                  onUpdateConversation={handleUpdateConversation}
               />
             ) : (
               <ChatEmptyState isAdmin={isAdmin} hasPersonas={personas.length > 0} />
             )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
