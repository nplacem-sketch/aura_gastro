'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import AppIcon from './AppIcon';

export default function MagicEditorOverlay() {
  const { isAdmin } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [editingNode, setEditingNode] = useState<{ element: HTMLElement, text: string } | null>(null);
  const [newText, setNewText] = useState('');
  const [status, setStatus] = useState<'' | 'saving' | 'success' | 'error'>('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) return;

    const handleMouseOver = (e: MouseEvent) => {
      if (!isActive || editingNode) return;
      const el = e.target as HTMLElement;
      if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.closest('#magic-editor-ui')) return;
      
      // Temporarily outline the element
      const origOutline = el.style.outline;
      el.style.outline = '2px dashed #e9c176';
      
      const handleMouseOut = () => {
        el.style.outline = origOutline;
        el.removeEventListener('mouseout', handleMouseOut);
      };
      el.addEventListener('mouseout', handleMouseOut);
    };

    const handleClick = (e: MouseEvent) => {
      if (!isActive) return;
      const el = e.target as HTMLElement;
      if (el.closest('#magic-editor-ui')) return;

      e.preventDefault();
      e.stopPropagation();

      // Get exact text without nested children if possible, but innerText is closest to what user sees.
      // We'll use childNodes to get exact text of the node under cursor if it has text nodes
      let exactText = '';
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
           exactText = node.textContent;
           break;
        }
      }
      
      // Fallback a innerText o textContent
      if (!exactText) exactText = el.innerText || el.textContent || '';
      
      const trimmed = exactText.trim();
      if (trimmed) {
        setEditingNode({ element: el, text: trimmed });
        setNewText(trimmed);
      }
    };

    if (isActive) {
      document.body.addEventListener('mouseover', handleMouseOver, true);
      document.body.addEventListener('click', handleClick, true);
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.body.removeEventListener('mouseover', handleMouseOver, true);
      document.body.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
    };
  }, [isAdmin, isActive, editingNode]);

  if (!isAdmin) return null;

  const handleSave = async () => {
    if (!editingNode || newText === editingNode.text) {
      setEditingNode(null);
      return;
    }

    setStatus('saving');
    try {
      const { data: sessionData } = await supabase().auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/admin/magic-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          originalText: editingNode.text,
          newText: newText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al compilar el código.');
      }

      setStatus('success');
      setStatusMsg(`Actualizado en ${data.replacedFiles.length} archivo(s) React.`);
      
      // Update DOM temporarily to simulate hot-reload, though Next.js hot reload will kick in!
      if (editingNode.element) {
         for (const node of Array.from(editingNode.element.childNodes)) {
           if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(editingNode.text)) {
             node.textContent = node.textContent.replace(editingNode.text, newText);
           }
         }
      }

      setTimeout(() => {
        setEditingNode(null);
        setStatus('');
      }, 3000);

    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  return (
    <>
      <div id="magic-editor-ui" className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
        {editingNode && (
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in origin-bottom-right">
            <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
              <AppIcon name="edit" size={14} />
              Reescribir Código Fuente
            </h4>
            
            <p className="text-xs text-on-surface-variant font-light mb-2">Original estático:</p>
            <div className="bg-surface p-3 rounded-lg text-xs font-mono text-outline line-clamp-3 mb-4 select-all">
              {editingNode.text}
            </div>

            <p className="text-xs text-on-surface-variant font-light mb-2">Nuevo texto compilado:</p>
            <textarea
              className="w-full bg-surface border border-outline-variant/10 rounded-lg p-3 text-sm text-on-surface focus:border-secondary mb-4 font-mono h-24"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />

            {status === 'saving' && <p className="text-secondary text-xs uppercase animate-pulse mb-4 tracking-widest">Inyectando al servidor...</p>}
            {status === 'success' && <p className="text-primary text-xs mb-4">{statusMsg}</p>}
            {status === 'error' && <p className="text-error text-xs mb-4">{statusMsg}</p>}

            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => { setNewText(''); if (newText === '') { handleSave(); } }}
                className="px-4 py-3 bg-error text-on-error rounded-xl font-label text-[10px] uppercase tracking-widest font-bold opacity-30 hover:opacity-100 transition-opacity"
                title="Eliminar este fragmento de texto del código"
              >
                <AppIcon name="delete" size={14} />
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-3 border border-outline-variant/20 text-on-surface rounded-xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest whitespace-nowrap"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={status === 'saving'}
                  className="px-6 py-3 bg-secondary text-on-secondary rounded-xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-secondary/10"
                >
                  Inyectar
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => { setIsActive(!isActive); setEditingNode(null); }}
          className={`h-14 px-6 rounded-full flex items-center gap-3 font-label text-[10px] uppercase tracking-widest font-bold transition-all shadow-xl
            ${isActive 
              ? 'bg-secondary text-on-secondary' 
              : 'bg-surface-container-high text-secondary border border-secondary/20 hover:border-secondary'
            }`}
        >
          <AppIcon name={isActive ? 'close' : 'edit'} size={18} />
          {isActive ? 'Cerrar Modo Estático' : 'Editor de Código en Vivo'}
        </button>
      </div>
    </>
  );
}
