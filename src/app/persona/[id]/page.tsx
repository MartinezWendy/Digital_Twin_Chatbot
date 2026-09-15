
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import { firestore } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Persona } from '@/app/chat/page';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Bot, FileText, AlertTriangle, UserLock } from 'lucide-react';
import { AppLogo } from '@/components/icons/app-logo';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AccessDenied = () => (
    <Card className="mt-10">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-destructive">
                <UserLock className="mr-3 h-6 w-6" />
                Access Denied
            </CardTitle>
            <CardDescription>
                You do not have permission to view this persona&apos;s details.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Personas can only be viewed by administrators or users who have been assigned to them.</p>
            <Button asChild className="mt-4">
                <Link href="/chat">Return to Chat</Link>
            </Button>
        </CardContent>
    </Card>
);

const PersonaNotFound = () => (
    <Card className="mt-10">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-destructive">
                <AlertTriangle className="mr-3 h-6 w-6" />
                Persona Not Found
            </CardTitle>
            <CardDescription>
                The persona you are looking for does not exist or has been deleted.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="mt-4">
                <Link href="/chat">Return to Chat</Link>
            </Button>
        </CardContent>
    </Card>
);

export default function PersonaDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { user, userProfile, loading: authLoading } = useAuth();
    
    const [persona, setPersona] = useState<Persona | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const personaId = Array.isArray(params.id) ? params.id[0] : params.id;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!userProfile || !personaId || !firestore) {
            if (!authLoading) setIsLoading(false);
            return;
        }

        const fetchPersonaDetails = async () => {
            setIsLoading(true);
            const personaDocRef = doc(firestore!, 'personas', personaId);
            const personaDoc = await getDoc(personaDocRef);

            if (!personaDoc.exists()) {
                setNotFound(true);
                setIsLoading(false);
                return;
            }

            const personaData = { id: personaDoc.id, ...personaDoc.data() } as Persona;

            // Check access rights
            const isAdmin = userProfile.role === 'admin';
            const isAssigned = userProfile.assignedPersonaIds?.includes(personaId) ?? false;
            
            if (isAdmin || isAssigned) {
                setHasAccess(true);
                setPersona(personaData);
            } else {
                setHasAccess(false);
            }
            
            setIsLoading(false);
        };

        fetchPersonaDetails();

    }, [userProfile, personaId, authLoading]);


    if (authLoading || isLoading) {
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
                    <AppLogo size="sm" />
                    <div className="w-8"></div>
                </div>
            </header>

            <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
                {!hasAccess && !notFound && <AccessDenied />}
                {notFound && <PersonaNotFound />}

                {hasAccess && persona && (
                    <div className="space-y-8">
                        <div className="flex items-start gap-6">
                            <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-lg">
                                <AvatarImage src={persona.imageUrl} alt={`Avatar for ${persona.name}`} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <Bot size={48} strokeWidth={1.5}/>
                                </AvatarFallback>
                            </Avatar>
                             <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-4xl font-bold">{persona.name}</h1>
                                    {persona.segment && <Badge variant="secondary" className="text-base">{persona.segment}</Badge>}
                                </div>
                                <p className="text-lg text-muted-foreground">{persona.shortDescription}</p>
                             </div>
                        </div>
                        
                        <Separator />
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <FileText className="h-5 w-5"/>
                                    Persona Context Document
                                </CardTitle>
                                <CardDescription>
                                    This is the detailed description and context used by the AI to form its responses. This content is read-only.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[50vh] rounded-md border bg-muted/50 p-4">
                                    <p className="text-sm whitespace-pre-wrap font-mono">
                                        {persona.fullDescription || "No detailed context has been provided for this persona."}
                                    </p>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
