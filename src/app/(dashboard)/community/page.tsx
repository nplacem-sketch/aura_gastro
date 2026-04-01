'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { chatDb } from '@/lib/supabase';
import AppIcon from '@/components/AppIcon';
import Image from 'next/image';

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  media_urls?: string[];
  media_type?: 'text' | 'image' | 'video';
  parent_id?: string | null;
}

const MAX_CHARS = 300;
const MAX_IMAGES = 4;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export default function CommunityPage() {
  const { user, role } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const { data, error } = await chatDb()
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    const channel = chatDb().channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const newPost = payload.new as Post;
        setPosts(prev => [newPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, payload => {
        const updated = payload.new as Post;
        setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      })
      .subscribe();

    return () => {
      chatDb().removeChannel(channel);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const isVideo = files[0].type.startsWith('video/');
    
    if (isVideo) {
      if (files[0].size > MAX_VIDEO_SIZE) {
        alert('El video supera los 50MB permitidos.');
        return;
      }
      setMediaFiles([files[0]]);
      setMediaType('video');
    } else {
      const images = files.filter(f => f.type.startsWith('image/')).slice(0, MAX_IMAGES);
      if (images.length === 0) return;
      setMediaFiles(images);
      setMediaType('image');
    }
  };

  const uploadMedia = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const path = `${user?.id}/${Date.now()}-${file.name}`;
      const { data, error } = await chatDb().storage.from('community_media').upload(path, file);
      if (data) {
        const { data: { publicUrl } } = chatDb().storage.from('community_media').getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handlePost = async () => {
    if ((!newContent.trim() && mediaFiles.length === 0) || !user) return;
    if (newContent.length > MAX_CHARS) return;

    setIsUploading(true);
    const authorName = user.user_metadata?.name || user.email?.split('@')[0] || 'Chef';
    
    let uploadedUrls: string[] = [];
    if (mediaFiles.length > 0) {
      uploadedUrls = await uploadMedia();
    }

    const postData = {
      author_id: user.id,
      author_name: authorName,
      author_role: role,
      content: newContent.trim(),
      media_urls: uploadedUrls,
      media_type: mediaType,
      parent_id: replyingTo?.id || null
    };

    const { error } = await chatDb().from('posts').insert(postData);
    
    setIsUploading(false);
    if (!error) {
      setNewContent('');
      setMediaFiles([]);
      setMediaType('text');
      setReplyingTo(null);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user) return;
    const response = await fetch('/api/community/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id })
    });
    if (response.ok) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/community/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post de ${post.author_name} en Aura`,
          text: post.content.substring(0, 100),
          url
        });
      } catch (e) {
        navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  };

  const mainPosts = posts.filter(p => !p.parent_id);
  const getReplies = (postId: string) => posts.filter(p => p.parent_id === postId).reverse();

  return (
    <div className="flex h-screen bg-[#121413] text-on-surface overflow-hidden">
      <div className="flex-1 flex justify-center overflow-y-auto px-4 py-8">
        <div className="w-full flex flex-col lg:flex-row gap-8 max-w-6xl justify-center">
          
          {/* Main Feed Column */}
          <div className="flex-1 max-w-2xl space-y-6">
            <header className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
              <div>
                <h1 className="text-2xl font-headline tracking-wide uppercase">Comunidad</h1>
                <p className="text-[10px] text-secondary tracking-widest uppercase mt-1">Conecta con el mundo gastronómico</p>
              </div>
              <AppIcon name="forum" className="text-secondary" />
            </header>

            {/* Create Input Area */}
            <div className="glass-panel p-6 rounded-[32px] border border-secondary/10 relative overflow-hidden">
              {replyingTo && (
                <div className="mb-4 p-3 bg-surface-container-high rounded-xl border border-secondary/20 flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant italic">Respondiendo a: <b>{replyingTo.author_name}</b></span>
                  <button onClick={() => setReplyingTo(null)} className="text-error opacity-70 hover:opacity-100 transition-opacity"><AppIcon name="close" size={14}/></button>
                </div>
              )}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest border border-secondary/20 flex items-center justify-center font-bold text-secondary uppercase shrink-0">
                  {user?.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-base placeholder:text-on-surface-variant font-light min-h-[80px]"
                    placeholder={replyingTo ? "Añade un comentario..." : "¿Qué estás creando hoy, Chef?"}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value.slice(0, MAX_CHARS))}
                  />
                  
                  {mediaFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {mediaFiles.map((f, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-secondary/20 group">
                          {f.type.startsWith('video/') ? (
                            <div className="flex items-center justify-center h-full"><AppIcon name="videocam" size={40} className="text-secondary opacity-50"/></div>
                          ) : (
                            <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover"/>
                          )}
                          <button 
                            onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-error transition-colors"
                          >
                            <AppIcon name="close" size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/5">
                    <div className="flex gap-1">
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*,video/*"/>
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-secondary/60 hover:text-secondary hover:bg-secondary/5 rounded-full transition-all">
                        <AppIcon name="attach_file" size={18} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-mono tracking-tighter ${newContent.length >= MAX_CHARS ? 'text-error' : 'text-on-surface-variant'}`}>
                        {newContent.length} / {MAX_CHARS}
                      </span>
                      <button
                        onClick={handlePost}
                        disabled={(!newContent.trim() && mediaFiles.length === 0) || isUploading}
                        className="bg-secondary text-on-secondary px-8 py-2.5 rounded-full font-bold uppercase text-[10px] tracking-widest disabled:opacity-30 transition-all active:scale-95 flex items-center gap-2"
                      >
                        {isUploading ? <div className="w-3 h-3 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div> : (replyingTo ? 'Comentar' : 'Publicar')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center py-20 animate-pulse text-secondary text-xs uppercase tracking-widest font-headline">Sincronizando universo culinario...</div>
              ) : (
                mainPosts.map(post => (
                  <div key={post.id} className="space-y-3">
                    {/* MAIN POST */}
                    <div className="glass-panel p-6 rounded-[32px] border border-secondary/5 flex gap-4 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center justify-center font-bold text-on-surface-variant uppercase shrink-0">
                        {post.author_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-bold text-on-surface truncate max-w-[120px]">{post.author_name}</span>
                            {post.author_role === 'ADMIN' && <AppIcon name="workspace_premium" size={12} className="text-secondary shrink-0" />}
                            <span className="text-[10px] font-mono text-on-surface-variant opacity-40 shrink-0">
                              {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-on-surface-variant font-light text-[15px] leading-relaxed whitespace-pre-wrap mb-4">
                          {post.content}
                        </p>

                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className={`grid gap-2 mb-4 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {post.media_urls.map((url, i) => (
                              <div key={i} className="relative rounded-2xl overflow-hidden bg-black/20 border border-outline-variant/10 aspect-video">
                                {post.media_type === 'video' ? (
                                  <video src={url} className="w-full h-full object-cover" controls/>
                                ) : (
                                  <img src={url} alt="content" className="w-full h-full object-cover"/>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-secondary/10 group transition-all">
                            <AppIcon name="thumb_up" size={14} className="text-on-surface-variant group-hover:text-secondary"/>
                            <span className="text-[11px] font-mono text-on-surface-variant group-hover:text-secondary">{post.likes_count}</span>
                          </button>
                          <button onClick={() => setReplyingTo(post)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-primary/10 group transition-all">
                            <AppIcon name="forum" size={14} className="text-on-surface-variant group-hover:text-primary"/>
                            <span className="text-[11px] font-mono text-on-surface-variant group-hover:text-primary">{getReplies(post.id).length}</span>
                          </button>
                          <button onClick={() => sharePost(post)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-container-high group transition-all ml-auto">
                            <AppIcon name="arrow_forward" size={14} className="text-on-surface-variant"/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* REPLIES LOOP */}
                    {getReplies(post.id).map(reply => (
                      <div key={reply.id} className="ml-12 glass-panel p-4 rounded-[24px] border-l-2 border-secondary/20 flex gap-3 bg-surface-container-low/40">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-[10px] text-on-surface-variant uppercase shrink-0">
                          {reply.author_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-bold text-[13px] text-on-surface truncate">{reply.author_name}</span>
                            <span className="text-[9px] font-mono text-on-surface-variant opacity-40">
                              {new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className="text-on-surface-variant font-light text-[13px] leading-relaxed mb-3">
                            {reply.content}
                          </p>

                          {reply.media_urls && reply.media_urls.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                              {reply.media_urls.map((url, i) => (
                                <div key={i} className="relative rounded-xl overflow-hidden bg-black/20 aspect-video">
                                  {reply.media_type === 'video' ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} className="w-full h-full object-cover" />}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <button onClick={() => handleLike(reply)} className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 hover:text-secondary group">
                              <AppIcon name="thumb_up" size={12}/>
                              <span className="font-mono">{reply.likes_count}</span>
                            </button>
                            <button onClick={() => sharePost(reply)} className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 hover:text-on-surface group">
                              <AppIcon name="arrow_forward" size={12}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar (Ads Space) */}
          <aside className="hidden lg:block w-[300px] space-y-6">
            <div className="glass-panel p-8 rounded-[38px] border border-secondary/10 flex flex-col items-center justify-center min-h-[400px] text-center sticky top-8">
               <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                 <AppIcon name="auto_awesome" className="text-secondary" size={32} />
               </div>
               <h3 className="font-headline text-lg tracking-widest uppercase mb-2">Publicidad</h3>
               <p className="text-xs text-on-surface-variant font-light leading-relaxed max-w-[200px]">
                 Este es un espacio reservado para futuras promociones y contenido exclusivo de patrocinadores de Aura Gastronomy.
               </p>
               <div className="mt-8 pt-8 border-t border-outline-variant/10 w-full flex flex-col gap-3">
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden opacity-30">
                    <div className="h-full w-2/3 bg-secondary animate-pulse" />
                  </div>
                  <div className="h-2 w-1/2 bg-surface-container-high rounded-full overflow-hidden opacity-30" />
               </div>
            </div>
            
            <div className="glass-panel p-6 rounded-[28px] border border-secondary/5 text-[10px] text-on-surface-variant/50 font-mono tracking-tighter text-center uppercase">
              Aura Gastronomy © 2026<br/>
              Network Experience
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
