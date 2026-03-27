'use client';

import { useState, useRef, useEffect } from 'react';
import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

export default function ChatPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Chef, bienvenido al espacio de consulta técnica. Soy su Especialista Sommelier. ¿En qué perfil organoléptico trabajamos hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, data]);
    } catch (err) {
      console.error('Chat failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <header className="mb-8 p-6 glass-panel rounded-2xl border-l-4 border-secondary flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-3xl font-headline text-on-surface">Maestro <span className="italic text-secondary">Sommelier</span></h1>
          <p className="font-label text-[10px] text-[#afcdc3]/40 uppercase tracking-[0.3em] mt-1">Soporte Estratégico de Alta Gastronomía</p>
        </div>
        <div className="flex gap-4">
          <button className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center justify-center text-[#afcdc3] hover:text-secondary hover:border-secondary/40 transition-all group">
            <AppIcon name="history" size={16} aria-label="Historial" />
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center justify-center text-[#afcdc3] hover:text-secondary hover:border-secondary/40 transition-all">
            <AppIcon name="settings_voice" size={16} aria-label="Voz" />
          </button>
        </div>
      </header>

      <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col border border-outline-variant/10 shadow-2xl relative">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(233,193,118,0.05),_transparent_70%)] pointer-events-none"></div>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide relative z-10">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-7 rounded-3xl relative animate-up-fade ${
                msg.role === 'user' 
                  ? 'bg-primary text-on-primary rounded-tr-none shadow-xl shadow-primary/10' 
                  : 'bg-surface-container-highest/80 text-on-surface rounded-tl-none border-l-2 border-secondary shadow-lg backdrop-blur-md'
              }`}>
                {msg.role === 'ai' && (
                  <div className="absolute -top-7 left-0 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(233,193,118,0.8)]"></span>
                    <span className="font-label text-[9px] uppercase tracking-widest text-secondary font-bold">Respuesta Técnica</span>
                  </div>
                )}
                <div className="text-sm font-light leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline-variant/5">
                   <span className="text-[8px] font-label text-on-surface-variant/40 uppercase tracking-widest">
                     Referencia: {msg.role === 'ai' ? 'Consultoría' : 'Chef'} • PRIVADO
                   </span>
                    {msg.role === 'ai' && (
                      <div className="flex gap-4 opacity-40 hover:opacity-100 transition-opacity">
                         <button aria-label="Copiar" className="hover:text-secondary">
                           <AppIcon name="content_copy" size={16} />
                         </button>
                         <button aria-label="Me gusta" className="hover:text-secondary">
                           <AppIcon name="thumb_up" size={16} />
                         </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
               <div className="bg-surface-container-highest/50 p-6 rounded-3xl border-l-2 border-secondary/30 animate-pulse">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-[#121413] border-t border-outline-variant/10 relative z-20">
          <div className="flex gap-4 items-center bg-[#1a1c1b] p-3 pl-8 pr-3 rounded-2xl border border-outline-variant/10 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/20 transition-all duration-300">
            <button aria-label="Adjuntar" className="text-outline-variant hover:text-secondary transition-colors">
              <AppIcon name="attach_file" size={16} />
            </button>
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant/40 text-sm font-light h-12"
              placeholder="Inicia la consulta técnica..."
              type="text"
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              className={`w-12 h-12 bg-secondary text-on-secondary rounded-xl flex items-center justify-center shadow-lg shadow-secondary/10 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale`}
              onClick={sendMessage}
              disabled={loading}
            >
              <AppIcon name="arrow_upward" size={18} aria-label="Enviar" />
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-8">
             <span className="font-label text-[8px] uppercase tracking-widest text-[#afcdc3]/20 hover:text-primary transition-all cursor-crosshair">Protocolo: Seguridad de Datos</span>
             <span className="font-label text-[8px] uppercase tracking-widest text-[#afcdc3]/20 hover:text-secondary transition-all cursor-crosshair">Status: Sincronizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
