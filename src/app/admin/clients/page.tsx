
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import { firestore, storage } from '@/lib/firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ClientBrand } from '@/context/auth-provider';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertTriangle, Building, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { AppLogo } from '@/components/icons/app-logo';


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

function EditClientDialog({ client, onClose }: { client: ClientBrand | DocumentData | null; onClose: () => void; }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', logoUrl: '', primaryColor: '', accentColor: '', lightBackgroundColor: '', darkBackgroundColor: '', logoSizeClass: '', hideLogoText: false });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        logoUrl: client.logoUrl || '',
        primaryColor: client.primaryColor || '#89B4FA',
        accentColor: client.accentColor || '#FAD289',
        lightBackgroundColor: client.lightBackgroundColor || '#F0F2F5',
        darkBackgroundColor: client.darkBackgroundColor || '#21212B',
        logoSizeClass: client.logoSizeClass || '',
        hideLogoText: client.hideLogoText || false,
      });
      setLogoPreview(client.logoUrl || null);
      setLogoFile(null); // Reset file input on new client
    }
  }, [client]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Client Name is required.", variant: "destructive" });
      return;
    }
     if (!firestore || !storage) {
        toast({ title: "Error", description: "Firebase is not configured correctly.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const firestoreData:any = {
        name: formData.name,
        primaryColor: formData.primaryColor,
        accentColor: formData.accentColor,
        lightBackgroundColor: formData.lightBackgroundColor,
        darkBackgroundColor: formData.darkBackgroundColor,
        logoSizeClass: formData.logoSizeClass || null,
        hideLogoText: formData.hideLogoText,
    };

    try {
      if (client && 'id' in client) { // Editing existing client
        let finalLogoUrl = client.logoUrl;
        if (logoFile) {
          const storageRef = ref(storage, `client-logos/${client.id}/${logoFile.name}`);
          const uploadTask = await uploadBytes(storageRef, logoFile);
          finalLogoUrl = await getDownloadURL(uploadTask.ref);
        }

        const clientDocRef = doc(firestore, 'clients', client.id);
        await updateDoc(clientDocRef, { ...firestoreData, logoUrl: finalLogoUrl, lastUpdated: serverTimestamp() });
        toast({ title: "Success", description: `${formData.name} branding updated.` });

      } else { // Creating new client
        const docRef = await addDoc(collection(firestore, 'clients'), { ...firestoreData, createdAt: serverTimestamp() });
        
        let finalLogoUrl = '';
        if (logoFile) {
          const storageRef = ref(storage, `client-logos/${docRef.id}/${logoFile.name}`);
          const uploadTask = await uploadBytes(storageRef, logoFile);
          finalLogoUrl = await getDownloadURL(uploadTask.ref);
          await updateDoc(docRef, { logoUrl: finalLogoUrl });
        }
        
        toast({ title: "Success", description: `${formData.name} has been created.` });
      }
      onClose();
    } catch (error) {
      console.error("Error saving client:", error);
      toast({ title: "Error", description: "Could not save client branding.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async () => {
     if (!client || !('id' in client)) return;

     setIsSaving(true);
     try {
        if (!firestore) throw new Error("Firestore not available");
        await deleteDoc(doc(firestore, 'clients', client.id));
        toast({ title: "Client Deleted", description: `${client.name} has been removed.` });
        onClose();
     } catch (error) {
        console.error("Error deleting client:", error);
        toast({ title: "Error", description: "Could not delete client.", variant: "destructive" });
     } finally {
        setIsSaving(false);
     }
  };

  if (!client) return null;
  const isEditing = 'id' in client;

  return (
    <Dialog open={!!client} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${client.name}` : "Create New Client"}</DialogTitle>
          <DialogDescription>Manage the branding assets for this client.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="col-span-3" placeholder="Client Company Name" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4 pt-2">
            <Label htmlFor="logo" className="text-right pt-2">Logo</Label>
            <div className="col-span-3 space-y-2">
                <Input id="logo" type="file" onChange={handleFileChange} accept="image/png, image/jpeg, image/svg+xml, image/webp" className="file:text-foreground" />
                {logoPreview && (
                    <div className="p-2 border rounded-md bg-muted/50 w-fit">
                        <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 object-contain" />
                    </div>
                )}
                <p className="text-xs text-muted-foreground">Upload a PNG, JPG, or SVG file.</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4 pt-2">
              <Label htmlFor="logoSizeClass" className="text-right pt-2">Logo Size</Label>
              <div className="col-span-3">
                  <Input
                      id="logoSizeClass"
                      value={formData.logoSizeClass}
                      onChange={e => setFormData(f => ({ ...f, logoSizeClass: e.target.value }))}
                      placeholder="e.g. h-16 w-16"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optional. Enter logo size, e.g. h-10 w-20.</p>
              </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4 pt-2">
            <Label htmlFor="hideLogoText" className="text-right">Hide Text</Label>
            <div className="col-span-3 flex items-center space-x-2">
                <Checkbox 
                    id="hideLogoText" 
                    checked={formData.hideLogoText} 
                    onCheckedChange={checked => setFormData(f => ({ ...f, hideLogoText: !!checked }))}
                />
                <Label htmlFor="hideLogoText" className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Only show the logo image.
                </Label>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="primaryColor" className="text-right">Primary Color</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input type="color" value={formData.primaryColor} onChange={e => setFormData(f => ({...f, primaryColor: e.target.value}))} className="p-1 h-8 w-10"/>
              <Input value={formData.primaryColor} onChange={e => setFormData(f => ({...f, primaryColor: e.target.value}))} className="flex-1" />
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accentColor" className="text-right">Accent Color</Label>
             <div className="col-span-3 flex items-center gap-2">
              <Input type="color" value={formData.accentColor} onChange={e => setFormData(f => ({...f, accentColor: e.target.value}))} className="p-1 h-8 w-10"/>
              <Input value={formData.accentColor} onChange={e => setFormData(f => ({...f, accentColor: e.target.value}))} className="flex-1" />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lightBg" className="text-right">Light BG</Label>
             <div className="col-span-3 flex items-center gap-2">
              <Input type="color" value={formData.lightBackgroundColor} onChange={e => setFormData(f => ({...f, lightBackgroundColor: e.target.value}))} className="p-1 h-8 w-10"/>
              <Input value={formData.lightBackgroundColor} onChange={e => setFormData(f => ({...f, lightBackgroundColor: e.target.value}))} className="flex-1" />
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="darkBg" className="text-right">Dark BG</Label>
             <div className="col-span-3 flex items-center gap-2">
              <Input type="color" value={formData.darkBackgroundColor} onChange={e => setFormData(f => ({...f, darkBackgroundColor: e.target.value}))} className="p-1 h-8 w-10"/>
              <Input value={formData.darkBackgroundColor} onChange={e => setFormData(f => ({...f, darkBackgroundColor: e.target.value}))} className="flex-1" />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
            {isEditing ? (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isSaving}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           Delete
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the brand &quot;{client.name}&quot; and all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Yes, delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
            ) : <div></div>}
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function ClientBrandingPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<ClientBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientBrand | DocumentData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // This effect now depends on `user` as well.
    // If `user` is null, it means we are logged out, and the effect will re-run,
    // hitting the return statement which calls the cleanup function `unsubscribe`.
    if (!user || !userProfile || userProfile.role !== 'admin') {
      if (!authLoading) setIsLoading(false);
      // If we are logged out or not an admin, we don't set up the listener.
      // If a listener from a previous render was active, the return function below handles cleanup.
      return;
    }

    if (!firestore) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const clientsQuery = collection(firestore, 'clients');
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
        const allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientBrand));
        setClients(allClients);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching clients:", error);
        setIsLoading(false);
    });

    // This cleanup function will be called when the component unmounts
    // or when any dependency in the array changes (e.g., user logs out).
    return () => unsubscribe();
  }, [user, userProfile, authLoading]);


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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="mb-4 sm:mb-0">
                <h1 className="text-3xl font-bold flex items-center gap-3"><Building /> Client Branding</h1>
                <p className="text-muted-foreground">Manage logos and brand colors for your clients.</p>
            </div>
            <Button onClick={() => setSelectedClient({})}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Client
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Client List</CardTitle>
                <CardDescription>A list of all clients with custom branding.</CardDescription>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No clients configured yet. Click 'Add New Client' to start.</p>
              ) : (
                <div className="space-y-4">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <img src={client.logoUrl || `https://placehold.co/40x40/EAEFF2/787878?text=${client.name.charAt(0)}`} alt={`${client.name} logo`} className="h-10 w-10 rounded-md object-contain bg-white p-1" />
                        <div>
                            <p className="font-semibold">{client.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: client.primaryColor }}></div>
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: client.accentColor }}></div>
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: client.lightBackgroundColor }}></div>
                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: client.darkBackgroundColor }}></div>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/chat?previewClientId=${client.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedClient(client)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>
      </main>

      <EditClientDialog
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />

    </div>
  );
}
