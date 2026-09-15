
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
            <UserCircle className="h-5 w-5 text-primary" />
            <span className="text-xl font-semibold text-foreground">My Profile</span>
          </div>
          <div className="w-8"> {/* Placeholder for balance */}</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-2xl mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Account Information</CardTitle>
              <CardDescription>Your user account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                {userProfile ? (
                    <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'} className="capitalize w-fit">
                        {userProfile.role}
                    </Badge>
                ) : (
                    <p className="font-semibold">Loading role...</p>
                )}
              </div>
               <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-muted-foreground">{user.uid}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-6 md:px-8 md:py-8 border-t border-border/40 bg-background mt-auto">
        <div className="container flex flex-col items-center justify-center gap-4">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} PersonaChat. Your personal space.
          </p>
        </div>
      </footer>
    </div>
  );
}
