
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, UserCog, Loader2, Save, Trash2, Edit, AlertTriangle, FileText, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { AppLogo } from '@/components/icons/app-logo';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-provider';
import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from "@/components/ui/switch";
import { processTranscript } from '@/ai/flows/process-transcript';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';


interface Persona {
  id: string;
  name: string;
  segment?: string;
  shortDescription: string;
  fullDescription: string;
  surveyFileUrl?: string;
  contextFileUrl?: string;
  surveyData?: string;
  surveyFileName?: string;
  contextFileName?: string;
  imageUrl?: string;
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

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [personaName, setPersonaName] = useState("");
  const [personaSegment, setPersonaSegment] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  
  // New state for file uploads
  const [surveyFile, setSurveyFile] = useState<File | null>(null);
  const [contextFile, setContextFile] = useState<File | null>(null);
  const [isPreprocessEnabled, setIsPreprocessEnabled] = useState(false);

  // State for image handling as Base64 Data URI
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // State for delete confirmation dialog
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);
  
  // Refs for file inputs to reset them
  const surveyFileRef = useRef<HTMLInputElement>(null);
  const contextFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userProfile?.role !== 'admin' || !firestore) {
        setIsLoadingPersonas(false);
        return;
    };
    
    const q = query(collection(firestore, "personas"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const personasData: Persona[] = [];
      querySnapshot.forEach((doc) => {
        personasData.push({ id: doc.id, ...doc.data() } as Persona);
      });
      setPersonas(personasData);
      setIsLoadingPersonas(false);
    }, (error) => {
        console.error("Error fetching personas:", error);
        toast({ title: "Error", description: "Could not fetch personas.", variant: "destructive" });
        setIsLoadingPersonas(false);
    });

    return () => unsubscribe();
  }, [userProfile, toast]);

  
  const handleSavePersona = async () => {
    if (!user || !firestore || !storage) {
      toast({ title: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (editingPersonaId) {
        // EDIT MODE
        if (!personaName.trim() || !shortDescription.trim()) {
            toast({ title: "Persona Name and Short Description are required.", variant: "destructive" });
            setIsSaving(false);
            return;
        }
        
        const personaDocRef = doc(firestore, "personas", editingPersonaId);
        const updates: any = {
            name: personaName,
            segment: personaSegment,
            shortDescription,
            lastUpdated: serverTimestamp(),
            imageUrl: imageBase64, // Save Base64 string
        };
        
        if (contextFile) {
            const rawText = await contextFile.text();
            toast({ title: "Processing Transcript...", description: "The AI is analyzing the uploaded file. This may take a moment." });
            const processedOutput = await processTranscript({ rawTranscript: rawText, preprocess_toggle: isPreprocessEnabled });
            updates.fullDescription = processedOutput.cleaned_transcript;
            updates.contextFileName = contextFile.name;
        }

        if (surveyFile) {
            updates.surveyData = await surveyFile.text();
            updates.surveyFileName = surveyFile.name;
        }

        await updateDoc(personaDocRef, updates);
        toast({ title: "Persona Updated!", description: `"${personaName}" has been saved.` });

      } else {
        // CREATE MODE
        if (!personaName.trim() || !shortDescription.trim() || !contextFile) {
            toast({ title: "Persona Name, Short Description, and a Context file (.txt) are required.", variant: "destructive" });
            setIsSaving(false);
            return;
        }
        
        const surveyDataText = surveyFile ? await surveyFile.text() : "";
        const rawText = await contextFile.text();
        toast({ title: "Processing Transcript...", description: "The AI is analyzing the uploaded file. This may take a moment." });
        const processedOutput = await processTranscript({ rawTranscript: rawText, preprocess_toggle: isPreprocessEnabled });
        
        const personaData: any = {
            name: personaName,
            segment: personaSegment,
            shortDescription,
            fullDescription: processedOutput.cleaned_transcript,
            surveyData: surveyDataText,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            surveyFileName: surveyFile?.name || '',
            contextFileName: contextFile?.name || '',
            imageUrl: imageBase64 || '', // Save Base64 string
        };
        
        await addDoc(collection(firestore, "personas"), personaData);

        toast({ title: "Persona Created!", description: `"${personaName}" has been added.` });
      }

      resetForm();
    } catch (error) {
      console.error("Error saving persona:", error);
      toast({ title: "Save Failed", description: "Could not save persona. Check console for details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleEdit = (persona: Persona) => {
    setEditingPersonaId(persona.id);
    setPersonaName(persona.name);
    setPersonaSegment(persona.segment || '');
    setShortDescription(persona.shortDescription);
    setFullDescription(persona.fullDescription);
    
    // Reset file inputs
    setSurveyFile(null);
    setContextFile(null);
    if(surveyFileRef.current) surveyFileRef.current.value = "";
    if(contextFileRef.current) contextFileRef.current.value = "";
    if(imageFileRef.current) imageFileRef.current.value = "";
    
    // Set image
    setImageBase64(persona.imageUrl || null);
    
    setIsPreprocessEnabled(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteConfirm = async () => {
      if (!firestore || !personaToDelete) return;

      try {
        // Since images are in Firestore, we only need to delete the Firestore doc.
        // If other files were in storage, their deletion logic would go here.
        if (storage) {
          const personaStorageRootRef = ref(storage, `personas/${personaToDelete.id}`);
          const folderContents = await listAll(personaStorageRootRef);
          const deletePromises = folderContents.items.map(itemRef => deleteObject(itemRef));
          await Promise.all(deletePromises);
        }
        
        await deleteDoc(doc(firestore, "personas", personaToDelete.id));

        toast({ title: "Persona Deleted", description: `"${personaToDelete.name}" and all its data have been permanently removed.` });

      } catch (error) {
        console.error("Error deleting persona and its files:", error);
        toast({ title: "Delete Failed", description: "Could not delete the persona or its files.", variant: "destructive" });
      } finally {
        setPersonaToDelete(null);
      }
  };

  const resetForm = () => {
    setEditingPersonaId(null);
    setPersonaName("");
    setPersonaSegment("");
    setShortDescription("");
    setFullDescription("");
    setSurveyFile(null);
    setContextFile(null);
    setImageBase64(null);
    setIsPreprocessEnabled(false);
    if(surveyFileRef.current) surveyFileRef.current.value = "";
    if(contextFileRef.current) contextFileRef.current.value = "";
    if(imageFileRef.current) imageFileRef.current.value = "";
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({ title: "File too large", description: "Image must be under 2MB.", variant: "destructive" });
            return;
        }
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            toast({ title: "Invalid file type", description: "Please upload a PNG or JPG image.", variant: "destructive" });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
  };


  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
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

      <main className="container max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin Settings</h1>

        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><UserCog className="mr-3 h-6 w-6 text-primary" />{editingPersonaId ? "Edit Persona" : "Create New Persona"}</CardTitle>
            <CardDescription>Define your chatbot's personas. Clients will be able to select from this list to chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
                <Label htmlFor="persona-name">Persona Name</Label>
                <Input id="persona-name" value={personaName} onChange={(e) => setPersonaName(e.target.value)} placeholder="e.g., Alan the Auto Expert" />
            </div>
            
            <div className="space-y-2">
              <Label>Persona Image</Label>
              <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-dashed">
                      <AvatarImage src={imageBase64 ?? undefined} alt="Persona preview" />
                      <AvatarFallback className="bg-muted">
                          <Bot className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Button asChild variant="outline" size="sm">
                        <label htmlFor="image-file" className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            {imageBase64 ? 'Replace' : 'Upload'}
                        </label>
                    </Button>
                    <Input id="image-file" type="file" accept="image/png, image/jpeg" ref={imageFileRef} onChange={handleImageFileChange} className="hidden"/>
                    {imageBase64 && <Button variant="destructive" size="sm" onClick={() => {setImageBase64(null);}}><X className="mr-2 h-4 w-4" />Remove</Button>}
                    <p className="text-xs text-muted-foreground">PNG/JPG, max 2MB.</p>
                  </div>
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="persona-segment">Segment</Label>
                <Input id="persona-segment" value={personaSegment} onChange={(e) => setPersonaSegment(e.target.value)} placeholder="e.g., First-Time Buyers" />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="short-description">Short Description</Label>
                <Textarea id="short-description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A brief, one-line summary of the persona." rows={2} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="survey-file">Upload Survey File (.csv) (Optional)</Label>
                <p className="text-sm text-muted-foreground">Upload a survey file related to the persona.</p>
                <Input 
                    id="survey-file" 
                    type="file" 
                    accept=".csv"
                    ref={surveyFileRef}
                    onChange={(e) => setSurveyFile(e.target.files ? e.target.files[0] : null)}
                    className="file:text-foreground"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="context-file">Upload Context File (.txt)</Label>
                <p className="text-sm text-muted-foreground">{editingPersonaId ? "Upload a new .txt file to replace the existing detailed description." : "Upload a text file containing the detailed description, transcript, or any other content."}</p>
                <Input 
                    id="context-file" 
                    type="file" 
                    accept=".txt"
                    ref={contextFileRef}
                    onChange={(e) => setContextFile(e.target.files ? e.target.files[0] : null)}
                    className="file:text-foreground"
                />
            </div>

            <div className="flex items-center space-x-3 rounded-md border p-4">
                <Switch
                    id="preprocess-toggle"
                    checked={isPreprocessEnabled}
                    onCheckedChange={setIsPreprocessEnabled}
                />
                <div className="space-y-0.5">
                    <Label htmlFor="preprocess-toggle">
                        Pre-process transcript
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to run the full AI cleaning and structuring pipeline on the context file.
                    </p>
                </div>
            </div>


            {editingPersonaId && (
              <div className="space-y-2">
                  <Label htmlFor="full-description">Detailed Description (Read-only)</Label>
                  <p className="text-sm text-muted-foreground">This content comes from the uploaded .txt file. To change it, upload a new file above.</p>
                  <Textarea id="full-description" value={fullDescription} readOnly placeholder="The detailed context for the persona." rows={8}/>
              </div>
            )}
            
            <Separator />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleSavePersona} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingPersonaId ? "Save Changes" : "Create Persona"}
              </Button>
              {editingPersonaId && (
                  <Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancel Edit</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-10" />

        <AlertDialog open={!!personaToDelete} onOpenChange={(open) => !open && setPersonaToDelete(null)}>
            <Card>
                <CardHeader>
                    <CardTitle>Existing Personas</CardTitle>
                    <CardDescription>Manage the personas available to clients.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPersonas ? (
                        <div className="flex items-center justify-center p-8 space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-muted-foreground">Loading personas...</span>
                        </div>
                    ) : personas.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No personas created yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {personas.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={p.imageUrl} alt={`Avatar for ${p.name}`} />
                                            <AvatarFallback>
                                                <Bot className="h-5 w-5 text-muted-foreground" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                            <p className="font-semibold truncate">{p.name}</p>
                                            {p.segment && <Badge variant="secondary" className="hidden sm:inline-flex">{p.segment}</Badge>}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 truncate">{p.shortDescription}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setPersonaToDelete(p)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        </AlertDialogTrigger>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the persona &quot;{personaToDelete?.name}&quot; and all associated files from storage.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPersonaToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                    Yes, delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>

      <footer className="py-6 md:px-8 md:py-8 border-t border-border/40 bg-background mt-12">
        <div className="container flex flex-col items-center justify-center gap-4 "><p className="text-balance text-center text-sm leading-loose text-muted-foreground">&copy; {new Date().getFullYear()} PersonaChat Admin. Manage your application.</p></div>
      </footer>
    </div>
  );
}
