
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Download, Trash2, ArchiveIcon, Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/icons/app-logo';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-provider';

interface ArchivedConversation {
  id: string;
  title: string;
  date: string;
  excerpt: string;
}

// This is now mock data. A real implementation would fetch from Firestore.
const mockArchivedConversations: ArchivedConversation[] = [
  // { id: "c1", title: "Discussing Sedan Options", date: "July 28, 2024", excerpt: "User: What do you think about the new Camry? Alan: It's a solid choice, very reliable..." },
];

export default function ArchivePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ArchivedConversation[]>(mockArchivedConversations);
  const [conversationToDelete, setConversationToDelete] = useState<ArchivedConversation | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleDownload = (conversationId: string) => {
    // Placeholder for download logic
    console.log(`Downloading conversation ${conversationId}`);
    // In a real app, you would trigger a file download here.
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id));
      console.log(`Deleted conversation ${conversationToDelete.id}`);
      setConversationToDelete(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
          <Link href="/chat" passHref>
            <Button variant="ghost" size="icon" aria-label="Back to Chat">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ArchiveIcon className="h-5 w-5 text-primary" />
            <span className="text-xl font-semibold text-foreground">Archived Conversations</span>
          </div>
          <div className="w-8"> {/* Placeholder for balance */}</div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <main className="container max-w-4xl mx-auto py-8 px-4">
          {conversations.length === 0 ? (
            <div className="text-center py-10">
              <ArchiveIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground">No Archived Conversations</h2>
              <p className="text-muted-foreground mt-2">This feature is under construction. Archived chats will appear here in the future.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conversations.map((conv) => (
                <div key={conv.id} className="p-5 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                    <h3 className="text-lg font-semibold text-primary mb-1 sm:mb-0">{conv.title}</h3>
                    <p className="text-xs text-muted-foreground">{conv.date}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 truncate">{conv.excerpt}</p>
                  <Separator className="my-3" />
                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(conv.id)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setConversationToDelete(conv)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the chat titled &quot;{conv.title}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteConfirm}>
                            Yes, delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </ScrollArea>

      <footer className="py-6 md:px-8 md:py-8 border-t border-border/40 bg-background mt-auto">
        <div className="container flex flex-col items-center justify-center gap-4">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} PersonaChat Archives. Manage your past conversations.
          </p>
        </div>
      </footer>
    </div>
  );
}
