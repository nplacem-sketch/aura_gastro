'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export interface InlineEditorProps {
  text: string;
  table: string;
  id: string;
  field: string;
  dbName?: 'identity' | 'academy' | 'lab' | 'marketing' | 'realtime' | 'botfarm' | 'recipes';
  as?: any;
  className?: string;
  onSave?: (newText: string) => void;
}

export default function InlineEditor({
  text,
  table,
  id,
  field,
  dbName = 'identity',
  as: Component = 'span',
  className = '',
  onSave
}: InlineEditorProps) {
  const { role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(text || '');
  const [isSaving, setIsSaving] = useState(false);
  const elRef = useRef<HTMLElement>(null);

  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN';

  useEffect(() => {
    setContent(text || '');
  }, [text]);

  if (!isAdmin) {
    return <Component className={className}>{content}</Component>;
  }

  const handleBlur = async () => {
    setIsEditing(false);
    const newText = elRef.current?.innerText.trim() || '';
    
    if (newText !== text) {
      setIsSaving(true);
      
      try {
        const { data: sessionData } = await supabase().auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch('/api/admin/inline-edit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            targetDb: dbName,
            targetTable: table,
            targetId: id,
            targetField: field,
            newValue: newText
          })
        });

        if (!res.ok) {
          throw new Error('Error al guardar el contenido');
        }

        setContent(newText);
        if (onSave) onSave(newText);
      } catch (err) {
        console.error('Error saving inline edit:', err);
        setContent(text); // reset on error
        if (elRef.current) elRef.current.innerText = text;
      } finally {
        setIsSaving(false);
      }
    } else {
      setContent(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      elRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (elRef.current) elRef.current.innerText = text;
      setContent(text);
      elRef.current?.blur();
    }
  };

  return (
    <Component
      ref={elRef}
      contentEditable={isAdmin}
      suppressContentEditableWarning={true}
      className={`
        ${className} 
        ${isAdmin ? 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-secondary/50 cursor-text transition-all rounded-sm' : ''} 
        ${isSaving ? 'opacity-50 animate-pulse pointer-events-none' : ''}
        ${isEditing ? 'outline outline-1 outline-secondary bg-secondary/5 focus:outline-secondary' : ''}
      `.trim()}
      onFocus={() => {
        setIsEditing(true);
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => {
        // Prevent parent links/cards from triggering when editing
        if (isAdmin) {
          e.stopPropagation();
        }
      }}
    >
      {content}
    </Component>
  );
}
