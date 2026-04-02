'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import AppIcon from './AppIcon';

type EditingMode = 'text' | 'block' | 'select';

export default function MagicEditorOverlay() {
  const { isAdmin } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{ element: HTMLElement, text: string, outerHTML: string } | null>(null);
  const [mode, setMode] = useState<EditingMode>('select');
  const [newText, setNewText] = useState('');
  const [status, setStatus] = useState<'' | 'saving' | 'success' | 'error'>('');
  const [statusMsg, setStatusMsg] = useState('');
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const handleMouseOver = (e: MouseEvent) => {
      if (!isActive || selectedElement) return;
      const el = e.target as HTMLElement;
      if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.closest('#magic-editor-ui')) return;

      setHoveredElement(el);

      // Temporarily outline the element
      const origOutline = el.style.outline;
      el.style.outline = '2px dashed #e9c176';

      const handleMouseOut = () => {
        el.style.outline = origOutline;
        el.removeEventListener('mouseout', handleMouseOut);
        setHoveredElement(null);
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
      const outerHTML = el.outerHTML;

      // Guardar el elemento seleccionado con toda la información
      setSelectedElement({ element: el, text: trimmed, outerHTML });
      setNewText(trimmed);
      setMode('select'); // Mostrar pantalla de selección de modo
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
  }, [isAdmin, isActive, selectedElement]);

  if (!isAdmin) return null;

  const handleSave = async (action: 'edit' | 'delete') => {
    if (!selectedElement) {
      setSelectedElement(null);
      setMode('select');
      return;
    }

    // Modo eliminar: eliminar elemento completo
    if (action === 'delete') {
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
            originalText: selectedElement.outerHTML,
            newText: '',
            deleteBlock: true
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al eliminar el bloque.');
        }

        setStatus('success');
        setStatusMsg(`Bloque eliminado de ${data.replacedFiles.length} archivo(s) React.`);

        // Eliminar del DOM temporalmente
        if (selectedElement.element) {
          selectedElement.element.remove();
        }

        setTimeout(() => {
          setSelectedElement(null);
          setMode('select');
          setStatus('');
        }, 3000);

      } catch (err: any) {
        setStatus('error');
        setStatusMsg(err.message);
        setTimeout(() => setStatus(''), 4000);
      }
      return;
    }

    // Modo editar: comportamiento original
    if (newText === selectedElement.text) {
      setSelectedElement(null);
      setMode('select');
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
          originalText: selectedElement.text,
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
      if (selectedElement.element) {
        for (const node of Array.from(selectedElement.element.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(selectedElement.text)) {
            node.textContent = node.textContent.replace(selectedElement.text, newText);
          }
        }
      }

      setTimeout(() => {
        setSelectedElement(null);
        setMode('select');
        setStatus('');
      }, 3000);

    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  const resetSelection = () => {
    setSelectedElement(null);
    setMode('select');
  };

  return (
    <>
      <div id="magic-editor-ui" className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
        {selectedElement && mode === 'select' && (
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in origin-bottom-right">
            <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
              <AppIcon name="auto_awesome" size={14} />
              Selecciona una acción
            </h4>

            <p className="text-xs text-on-surface-variant font-light mb-2">Elemento seleccionado:</p>
            <div className="bg-surface p-3 rounded-lg text-xs font-mono text-outline line-clamp-3 mb-4 select-all">
              {selectedElement.text || `[${selectedElement.element.tagName.toLowerCase()} - sin texto]`}
            </div>

            <p className="text-xs text-on-surface-variant font-light mb-4">
              ¿Qué quieres hacer con este elemento?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMode('text')}
                className="px-4 py-3 bg-secondary text-on-secondary rounded-xl font-label text-[10px] uppercase tracking-widest font-bold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
              >
                <AppIcon name="edit" size={14} />
                Editar texto
              </button>

              <button
                onClick={() => setMode('block')}
                className="px-4 py-3 bg-error/20 text-error rounded-xl font-label text-[10px] uppercase tracking-widest font-bold hover:bg-error/30 transition-colors flex items-center justify-center gap-2"
              >
                <AppIcon name="block" size={14} />
                Eliminar elemento completo
              </button>

              <button
                onClick={resetSelection}
                className="px-4 py-3 border border-outline-variant/20 text-on-surface rounded-xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedElement && mode === 'text' && (
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in origin-bottom-right">
            <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
              <AppIcon name="edit" size={14} />
              Reescribir Código Fuente
            </h4>

            <p className="text-xs text-on-surface-variant font-light mb-2">Original estático:</p>
            <div className="bg-surface p-3 rounded-lg text-xs font-mono text-outline line-clamp-3 mb-4 select-all">
              {selectedElement.text}
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
                onClick={() => setMode('select')}
                className="px-4 py-3 border border-outline-variant/20 text-on-surface rounded-xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest whitespace-nowrap"
              >
                Volver
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => { setNewText(''); handleSave('edit'); }}
                  className="px-4 py-3 bg-error/20 text-error rounded-xl font-label text-[10px] uppercase tracking-widest font-bold hover:bg-error/30 transition-colors whitespace-nowrap"
                  title="Vaciar el texto"
                >
                  Vaciar
                </button>

                <button
                  onClick={() => handleSave('edit')}
                  disabled={status === 'saving'}
                  className="px-6 py-3 bg-secondary text-on-secondary rounded-xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-secondary/10"
                >
                  Inyectar
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedElement && mode === 'block' && (
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in origin-bottom-right">
            <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
              <AppIcon name="block" size={14} />
              Eliminar Bloque Completo
            </h4>

            <p className="text-xs text-on-surface-variant font-light mb-2">Bloque a eliminar:</p>
            <div className="bg-surface p-3 rounded-lg text-xs font-mono text-outline line-clamp-4 mb-4 select-all overflow-auto max-h-40">
              {selectedElement.outerHTML}
            </div>
            <p className="text-xs text-error/80 font-light mb-4">
              ⚠️ Esta acción eliminará permanentemente este elemento del código fuente.
            </p>

            {status === 'saving' && <p className="text-secondary text-xs uppercase animate-pulse mb-4 tracking-widest">Eliminando...</p>}
            {status === 'success' && <p className="text-primary text-xs mb-4">{statusMsg}</p>}
            {status === 'error' && <p className="text-error text-xs mb-4">{statusMsg}</p>}

            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => setMode('select')}
                className="px-4 py-3 border border-outline-variant/20 text-on-surface rounded-xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest whitespace-nowrap"
              >
                Volver
              </button>

              <button
                onClick={() => handleSave('delete')}
                disabled={status === 'saving'}
                className="px-6 py-3 bg-error text-on-error rounded-xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-error/10 hover:bg-error/90 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => { setIsActive(!isActive); resetSelection(); }}
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
