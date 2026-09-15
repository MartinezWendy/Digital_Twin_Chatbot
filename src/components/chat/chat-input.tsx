
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };
  
  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);


  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 left-0 right-0 flex items-start gap-2 border-t bg-background p-4"
    >
      <Textarea
        ref={textareaRef}
        placeholder="What’s on your mind?"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-1 resize-none rounded-2xl border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-hidden"
        disabled={isLoading}
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 w-12 flex-shrink-0 self-end"
        disabled={isLoading || !inputValue.trim()}
        aria-label="Send message"
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary-foreground border-t-transparent"></div>
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}
