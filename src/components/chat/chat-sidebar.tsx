
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuItemLabel,
  SidebarToggle,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, UserCog, Building, PlusCircle, MessageSquare, Trash2, Users, UserCircle, User, Settings, LogOut, Info } from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/icons/app-logo";
import { useAuth } from '@/context/auth-provider';
import type { Persona } from '@/app/chat/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


const PERSONA_CONVOS_PREFIX = 'personaConvos_';

interface Conversation {
  id: string;
  title: string;
  lastUpdated: number;
}

interface ChatSidebarProps {
    personas: Persona[];
    activePersonaId: string | null;
    activeConversationId: string | null;
    onSelectConversation: (personaId: string, conversationId: string | null) => void;
    onCreateNewConversation: (personaId: string) => void;
    conversationsByPersona: Map<string, Conversation[]>;
}


export function ChatSidebar({ 
    personas, 
    activePersonaId, 
    activeConversationId, 
    onSelectConversation,
    onCreateNewConversation,
    conversationsByPersona 
}: ChatSidebarProps) {
  const router = useRouter();
  const { user, userProfile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const [expandedPersona, setExpandedPersona] = useState<string | undefined>(activePersonaId || undefined);
  const [conversationToDelete, setConversationToDelete] = useState<{ personaId: string, convoId: string } | null>(null);

  // When active persona changes, make sure its accordion item is open
  useEffect(() => {
    if (activePersonaId) {
      setExpandedPersona(activePersonaId);
    }
  }, [activePersonaId]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleDeleteConversation = () => {
    if (!conversationToDelete) return;
    const { personaId, convoId } = conversationToDelete;
    
    const storageKey = `${PERSONA_CONVOS_PREFIX}${personaId}`;
    const storedData = localStorage.getItem(storageKey);
    if (!storedData) return;

    let allConvos: Conversation[] = JSON.parse(storedData);
    const updatedConvos = allConvos.filter(c => c.id !== convoId);
    
    localStorage.setItem(storageKey, JSON.stringify(updatedConvos));
    
    if (activeConversationId === convoId && activePersonaId === personaId) {
        onSelectConversation(personaId, null);
    }

    window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
    setConversationToDelete(null); 
  };
  
  const isAdmin = userProfile?.role === 'admin';

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex w-full items-center justify-between gap-2">
            <AppLogo size="lg" textClassName={cn("text-lg", isCollapsed && "hidden")} />
            <SidebarToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
          <ScrollArea>
            {isAdmin && (
              <div className="p-2 space-y-1">
                <span className={cn("px-2 text-xs font-semibold text-muted-foreground/70", isCollapsed && "hidden")}>Admin Tools</span>
                <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Persona Settings">
                         <Link href="/settings">
                            <UserCog />
                            <SidebarMenuItemLabel>Persona Settings</SidebarMenuItemLabel>
                         </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Client Branding">
                         <Link href="/admin/clients">
                            <Building />
                            <SidebarMenuItemLabel>Client Branding</SidebarMenuItemLabel>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Client Management">
                        <Link href="/admin/users">
                            <Users />
                            <SidebarMenuItemLabel>Client Management</SidebarMenuItemLabel>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
             <div className="p-2 space-y-1">
                <span className={cn("px-2 text-xs font-semibold text-muted-foreground/70", isCollapsed && "hidden")}>Personas</span>
                  {personas.length > 0 ? (
                      <Accordion 
                          type="single" 
                          collapsible 
                          value={isCollapsed ? undefined : expandedPersona}
                          onValueChange={setExpandedPersona}
                          className="w-full mt-1"
                      >
                      {personas.map(persona => {
                          const personaConversations = conversationsByPersona.get(persona.id) || [];
                          
                          const trigger = (
                            <AccordionTrigger
                                className={cn(
                                    "group/persona flex w-full items-center rounded-md p-2 text-left text-sm h-auto font-semibold hover:no-underline",
                                    "hover:bg-sidebar-accent",
                                    isCollapsed ? "justify-center" : "justify-between",
                                    activePersonaId === persona.id && !isCollapsed && "bg-sidebar-accent/70"
                                )}
                                // When collapsed, clicking the persona icon starts a new chat
                                onClick={() => { if(isCollapsed) onCreateNewConversation(persona.id) }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="h-7 w-7 shrink-0 border border-primary/30">
                                        <AvatarImage src={persona.imageUrl} alt={`Avatar for ${persona.name}`} />
                                        <AvatarFallback className="bg-primary/20 text-primary">
                                            <Bot size={16} />
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn("truncate", isCollapsed && "hidden")}>{persona.name}</span>
                                </div>
                            </AccordionTrigger>
                          );
                          
                          return (
                          <AccordionItem key={persona.id} value={persona.id} className="border-b-0">
                              {isCollapsed ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {trigger}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center">
                                        <p>{persona.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                              ) : (
                                trigger
                              )}

                              <AccordionContent className={cn("pt-1 pb-0", isCollapsed && "hidden")}>
                                  <div className="border-l border-sidebar-border ml-[1.3rem] pl-3 space-y-1">
                                      <Button
                                          variant="ghost"
                                          size="sm"
                                          className={cn(
                                              "w-full justify-start font-normal text-xs h-auto py-1",
                                              activePersonaId === persona.id && activeConversationId === null && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                                          )}
                                          onClick={() => onCreateNewConversation(persona.id)}
                                      >
                                          <PlusCircle className="mr-2 h-3 w-3" />
                                          New Chat
                                      </Button>
                                      {personaConversations.map(convo => (
                                      <div key={convo.id} className="group/item flex items-center justify-between rounded-md hover:bg-sidebar-accent/50">
                                          <Button
                                              variant="ghost"
                                              size="sm"
                                              className={cn(
                                                  "w-full flex-1 justify-start font-normal text-xs h-auto py-1 min-w-0",
                                                  activeConversationId === convo.id && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                                              )}
                                              onClick={() => onSelectConversation(persona.id, convo.id)}
                                              title={convo.title || 'New Chat'}
                                          >
                                              <MessageSquare className="mr-2 h-3 w-3 flex-shrink-0" />
                                              <span className="truncate">{convo.title || 'New Chat'}</span>
                                          </Button>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setConversationToDelete({ personaId: persona.id, convoId: convo.id });
                                              }}
                                          >
                                              <Trash2 className="h-3 w-3" />
                                          </Button>
                                      </div>
                                      ))}
                                  </div>
                              </AccordionContent>
                          </AccordionItem>
                          );
                      })}
                      </Accordion>
                  ) : (
                      null
                  )}
              </div>
          </ScrollArea>
           <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this conversation.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarContent>
      <SidebarFooter>
         <div className={cn(isCollapsed && 'w-full flex justify-center')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("w-full justify-start p-2", isCollapsed && "w-auto justify-center")}>
                    <UserCircle className={cn("mr-2 h-5 w-5", isCollapsed && "mr-0")} />
                    <SidebarMenuItemLabel className={cn(isCollapsed && "hidden")}>My Account</SidebarMenuItemLabel>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span className="truncate">{user?.email}</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                  <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Persona Settings</span>
                    </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/admin/clients" className="cursor-pointer">
                            <Building className="mr-2 h-4 w-4" />
                            <span>Client Branding</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Client Management</span>
                    </Link>
                    </DropdownMenuItem>
                  </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
      </SidebarFooter>
    </Sidebar>
  );
}
