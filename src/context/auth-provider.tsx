
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface UserProfile {
  email: string;
  role: 'admin' | 'client';
  assignedPersonaIds?: string[];
  clientId?: string;
}

export interface ClientBrand {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  logoSizeClass?: string;
  hideLogoText?: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  clientBrand: ClientBrand | null;
  loading: boolean;
  isPreviewing: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FirebaseNotConfigured = () => (
  <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
    <Alert variant="destructive" className="max-w-2xl">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Firebase Not Configured</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Your application cannot connect to Firebase because the required environment variables are missing or incorrect.</p>
        <p>Please check your <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">.env</code> file and ensure all <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">NEXT_PUBLIC_FIREBASE_*</code> variables are filled in correctly.</p>
      </AlertDescription>
    </Alert>
  </div>
);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [clientBrand, setClientBrand] = useState<ClientBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [clientIdToFetch, setClientIdToFetch] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const searchParams = useSearchParams();
  
  // Effect for auth state and user profile
  useEffect(() => {
    if (!auth || !firestore) {
      setFirebaseConfigured(false);
      setLoading(false);
      return;
    }

    setFirebaseConfigured(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(firestore!, 'users', user.uid);
        const unsubProfile = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            const newProfileData: UserProfile = { email: user.email!, role: 'client' };
            await setDoc(userDocRef, { ...newProfileData, createdAt: serverTimestamp() });
            setUserProfile(newProfileData);
          }
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setClientBrand(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to determine which client ID to use and fetch branding
  useEffect(() => {
    const previewClientId = searchParams.get('previewClientId');

    let finalClientId: string | null = null;
    let previewing = false;

    if (userProfile) {
        if (userProfile.role === 'admin' && previewClientId) {
            finalClientId = previewClientId;
            previewing = true;
        } else {
            finalClientId = userProfile.clientId || null;
            previewing = false;
        }
    }
    
    setIsPreviewing(previewing);
    setClientIdToFetch(finalClientId);

  }, [userProfile, searchParams]);

  // Effect to fetch brand data when the determined client ID changes
  useEffect(() => {
    const fetchBrand = async (id: string) => {
      if (!firestore) return;
      try {
        const clientDocRef = doc(firestore, 'clients', id);
        const clientDoc = await getDoc(clientDocRef);
        if (clientDoc.exists()) {
          setClientBrand({ id: clientDoc.id, ...clientDoc.data() } as ClientBrand);
        } else {
          console.warn(`Branding not found for client ID: ${id}`);
          setClientBrand(null);
        }
      } catch (e) {
        console.error("Error fetching client brand:", e);
        setClientBrand(null);
      }
    };

    if (clientIdToFetch && clientIdToFetch !== 'none') {
      fetchBrand(clientIdToFetch);
    } else {
      setClientBrand(null);
    }
  }, [clientIdToFetch]);
  
  if (!firebaseConfigured && !loading) {
    return <FirebaseNotConfigured />;
  }

  const signIn = (email: string, pass: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized."));
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = (email: string, pass: string) => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized."));
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOut = () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized."));
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    userProfile,
    clientBrand,
    loading,
    isPreviewing,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
