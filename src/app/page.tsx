
"use client"; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Bot, Settings, LogIn } from 'lucide-react';
import { AppLogo } from '@/components/icons/app-logo';
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/auth-provider';

// These defaults are now less critical but good as a fallback.
const DEFAULT_PERSONA_NAME = "PersonaChat";
const DEFAULT_PERSONA_BIO = "An advanced, conversational AI. Sign in to start a conversation.";

function LandingPageContent() {
  const { user, loading } = useAuth();
  const [displayPersonaName, setDisplayPersonaName] = useState(DEFAULT_PERSONA_NAME);
  const [displayPersonaBio, setDisplayPersonaBio] = useState(DEFAULT_PERSONA_BIO);

  useEffect(() => {
    // For now, the landing page will show a generic message.
    // A future improvement could be to fetch the list of personas and feature one.
    setDisplayPersonaName(DEFAULT_PERSONA_NAME);
    setDisplayPersonaBio("Gain deeper customer insights — sign in to choose a persona and get started.");
  }, []);
  
  const getButtonProps = () => {
    if (loading) {
      return { text: "Loading...", href: "#", icon: <Bot className="mr-3 h-6 w-6 animate-spin" /> };
    }
    if (user) {
      return { text: "Go to Chat", href: "/chat", icon: <MessageCircle className="mr-3 h-6 w-6" /> };
    }
    return { text: "Get Started", href: "/login", icon: <LogIn className="mr-3 h-6 w-6" /> };
  };

  const { text, href, icon } = getButtonProps();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
          <AppLogo size="md" />
          {user && (
            <Link href="/chat" passHref>
                <Button variant="ghost" size="sm">
                Go to App
                </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="w-full md:w-3/4 mx-auto">
          <section className="container grid items-center gap-6 pb-8 pt-10 md:py-16 text-center">
            <div className="mx-auto mt-8 mb-8">
              <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-lg mx-auto">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot size={64} strokeWidth={1.5} />
                </AvatarFallback>
              </Avatar>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              {displayPersonaName}
            </h1>
            
            <p className="max-w-[700px] mx-auto text-lg text-muted-foreground sm:text-xl font-body whitespace-pre-line mt-2">
              {displayPersonaBio}
            </p>

            <div className="flex flex-col items-center gap-4 mt-6">
              <Button asChild size="lg" className="font-headline text-lg px-10 py-7 rounded-lg shadow-md hover:shadow-lg transition-shadow" disabled={loading}>
                <Link href={href}>
                  {icon}
                  {text}
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t border-border/40 bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} PersonaChat. Explore real-life experiences.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-xl">Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
