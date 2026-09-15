
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, type UserProfile, type ClientBrand } from '@/context/auth-provider';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, query } from 'firebase/firestore';
import type { Persona } from '@/app/chat/page';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, ArrowLeft, AlertTriangle } from 'lucide-react';
import { AppLogo } from '@/components/icons/app-logo';

interface ClientUser extends UserProfile {
  id: string;
}

const AccessDenied = () => (
    <Card className="mt-10">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-destructive">
                <AlertTriangle className="mr-3 h-6 w-6" />
                Access Denied
            </CardTitle>
            <CardDescription>
                You do not have permission to view this page. This section is for administrators only.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>If you believe you should have access, please contact your system administrator.</p>
            <Button asChild className="mt-4">
                <Link href="/chat">Return to Chat</Link>
            </Button>
        </CardContent>
    </Card>
);

function ManageUserDialog({ user, onClose }: { user: ClientUser | null; onClose: () => void; }) {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [clients, setClients] = useState<ClientBrand[]>([]);
  
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && firestore) {
      setIsLoading(true);
      setSelectedPersonaIds(new Set(user.assignedPersonaIds || []));
      setSelectedClientId(user.clientId);
      
      const fetchDialogData = async () => {
        try {
          const personasQuery = query(collection(firestore!, 'personas'));
          const clientsQuery = query(collection(firestore!, 'clients'));

          const [personasSnapshot, clientsSnapshot] = await Promise.all([
            getDocs(personasQuery),
            getDocs(clientsQuery)
          ]);

          const allPersonas = personasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Persona));
          setPersonas(allPersonas);

          const allClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientBrand));
          setClients(allClients);

        } catch (error) {
          console.error("Error fetching data for dialog:", error);
          toast({ title: "Error", description: "Could not load required data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchDialogData();
    }
  }, [user, toast]);

  const handleCheckboxChange = (personaId: string, checked: boolean) => {
    setSelectedPersonaIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(personaId);
      } else {
        newSet.delete(personaId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.id);
      await updateDoc(userDocRef, {
        assignedPersonaIds: Array.from(selectedPersonaIds),
        clientId: selectedClientId || null
      });
      toast({ title: "Success", description: `Assignments updated for ${user.email}.` });
      onClose();
    } catch (error) {
      console.error("Error updating assignments:", error);
      toast({ title: "Error", description: "Could not save assignments.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage Assignments</DialogTitle>
          <DialogDescription>Assign personas and branding for {user.email}.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6 py-4">
              <div>
                  <Label className="font-semibold">Client Branding</Label>
                  <p className="text-sm text-muted-foreground mb-2">Assign this user to a client brand profile.</p>
                   <Select value={selectedClientId || 'none'} onValueChange={(value) => setSelectedClientId(value === 'none' ? undefined : value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a client brand..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Branding (Default)</SelectItem>
                        {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No client brands have been created yet. <Link href="/admin/clients" className="text-primary underline">Create one first</Link>.</p>
                  )}
              </div>
              <div>
                <Label className="font-semibold">Available Personas</Label>
                <p className="text-sm text-muted-foreground mb-2">Select the personas this user can interact with.</p>
                <ScrollArea className="h-[25vh] pr-4 border rounded-md p-4">
                    <div className="space-y-4">
                    {personas.length > 0 ? personas.map(p => (
                        <div key={p.id} className="flex items-center space-x-3">
                        <Checkbox
                            id={`persona-${p.id}`}
                            checked={selectedPersonaIds.has(p.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(p.id, !!checked)}
                        />
                        <Label htmlFor={`persona-${p.id}`} className="font-normal cursor-pointer flex-1">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.shortDescription}</p>
                        </Label>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center">No personas have been created yet. <Link href="/settings" className="text-primary underline">Create one first</Link>.</p>
                    )}
                    </div>
                </ScrollArea>
              </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function UserManagementPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [clientDetails, setClientDetails] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // This effect now depends on `user` as well.
    // If `user` is null, it means we are logged out, and the effect will re-run,
    // hitting the return statement which calls the cleanup function for the listeners.
    if (!user || !userProfile || userProfile.role !== 'admin') {
        if (!authLoading) setIsLoading(false);
        return;
    }
    
    if (!firestore) {
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);

    const usersQuery = query(collection(firestore, 'users'));
    const brandsQuery = query(collection(firestore!, 'clients'));
    const personasQuery = query(collection(firestore!, 'personas'));

    // Fetch brand details once
    getDocs(brandsQuery).then(snapshot => {
        const brandMap = new Map<string, string>();
        snapshot.docs.forEach(doc => brandMap.set(doc.id, doc.data().name));
        setClientDetails(brandMap);
    });
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as UserProfile) }));
        const clientUsers = allUsers.filter(u => u.role === 'client') as ClientUser[];
        setUsers(clientUsers);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching users with onSnapshot:", error);
        setIsLoading(false);
    });

    const unsubscribePersonas = onSnapshot(personasQuery, (snapshot) => {
        const personasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Persona));
        setAllPersonas(personasData);
    }, (error) => {
        console.error("Error fetching personas with onSnapshot:", error);
    });

    // This cleanup function will be called when the component unmounts
    // or when any dependency in the array changes (e.g., user logs out).
    return () => {
        unsubscribeUsers();
        unsubscribePersonas();
    };
  }, [user, userProfile, authLoading]);

  const allPersonaIds = useMemo(() => new Set(allPersonas.map(p => p.id)), [allPersonas]);


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
                <Link href="/chat" passHref><Button variant="ghost" size="icon" aria-label="Back to Chat"><ArrowLeft className="h-5 w-5" /></Button></Link>
                <AppLogo size="sm" />
                <div className="w-8"></div>
              </div>
          </header>
          <main className="container max-w-3xl mx-auto py-8 px-4">
              <AccessDenied />
          </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
          <Link href="/chat" passHref><Button variant="ghost" size="icon" aria-label="Back to Chat"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <AppLogo size="sm" />
          <div className="w-8"></div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2 text-center flex items-center justify-center gap-3"><Users /> Client Management</h1>
        <p className="text-muted-foreground text-center mb-8">Assign personas and branding to client accounts.</p>

        <Card>
            <CardHeader>
                <CardTitle>Client Accounts</CardTitle>
                <CardDescription>A list of all registered client users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No client accounts found.</p>
              ) : (
                <div className="space-y-4">
                  {users.map(clientUser => (
                    <div key={clientUser.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div>
                        <p className="font-semibold">{clientUser.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned Brand: <span className="font-medium text-foreground">{clientUser.clientId ? clientDetails.get(clientUser.clientId) || 'N/A' : 'Default'}</span>
                          <span className="mx-2 text-border">|</span>
                          {(clientUser.assignedPersonaIds || []).filter(id => allPersonaIds.has(id)).length} personas assigned
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(clientUser)}>
                        Manage Assignments
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>
      </main>

      <ManageUserDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />

    </div>
  );
}
