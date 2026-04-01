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
    if (user.id === post.author_id) {
      alert('¡Chef! No puedes darte Like a ti mismo.');
      return;
    }

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
  const getReplies = (postId: string) => posts.filter(p => p.parent_id === postId).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex h-screen bg-[#121413] text-on-surface overflow-hidden selection:bg-secondary/30">
      <div className="flex-1 flex justify-center overflow-y-auto px-4 py-8">
        <div className="w-full flex flex-col lg:flex-row gap-12 max-w-7xl justify-center">
          
          {/* Main Feed Column */}
          <div className="flex-1 max-w-2xl space-y-10">
            <header className="flex items-end justify-between pb-6 border-b border-outline-variant/10">
              <div>
                <h1 className="text-3xl font-headline tracking-widest uppercase text-[#e2e3e0]">Comunidad</h1>
                <p className="text-[9px] text-secondary/60 tracking-[0.4em] uppercase mt-2 font-medium">The Global Chef Network</p>
              </div>
              <div className="p-2 border border-secondary/10 rounded-full animate-float">
                <AppIcon name="forum" className="text-secondary" size={24} />
              </div>
            </header>

            {/* Create Input Area - Ultra Minimalist */}
            <div className="bg-surface-container-low/20 rounded-[40px] border border-white/5 p-8 relative overflow-hidden backdrop-blur-xl group hover:border-secondary/10 transition-colors">
              {replyingTo && (
                <div className="mb-6 px-4 py-2 bg-secondary/5 rounded-full border border-secondary/10 flex justify-between items-center text-[10px] tracking-widest uppercase">
                  <span className="text-secondary/70">Respondiendo a <b className="text-secondary">{replyingTo.author_name}</b></span>
                  <button onClick={() => setReplyingTo(null)} className="hover:text-error transition-colors"><AppIcon name="close" size={14}/></button>
                </div>
              )}
              <div className="flex gap-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-lowest border border-white/5 flex items-center justify-center font-bold text-secondary/80 uppercase shrink-0 shadow-inner">
                  {user?.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-[17px] placeholder:text-on-surface-variant/40 font-light min-h-[100px] leading-relaxed"
                    placeholder={replyingTo ? "Comparte tu opinión técnica..." : "¿Qué hay en tu mesa de trabajo?"}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value.slice(0, MAX_CHARS))}
                  />
                  
                  {mediaFiles.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {mediaFiles.map((f, i) => (
                        <div key={i} className="relative aspect-video rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5 group shadow-2xl">
                          {f.type.startsWith('video/') ? (
                            <div className="flex items-center justify-center h-full"><AppIcon name="videocam" size={32} className="text-secondary opacity-30"/></div>
                          ) : (
                            <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"/>
                          )}
                          <button 
                            onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-3 right-3 p-2 bg-black/80 rounded-full hover:bg-error transition-all scale-75 group-hover:scale-100"
                          >
                            <AppIcon name="close" size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
                    <div className="flex gap-2">
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*,video/*"/>
                      <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-secondary/40 hover:text-secondary hover:bg-secondary/5 rounded-full transition-all border border-transparent hover:border-secondary/10">
                        <AppIcon name="attach_file" size={20} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <span className={`text-[11px] font-mono tracking-widest ${newContent.length >= MAX_CHARS ? 'text-error' : 'text-on-surface-variant/30'}`}>
                        {newContent.length} / {MAX_CHARS}
                      </span>
                      <button
                        onClick={handlePost}
                        disabled={(!newContent.trim() && mediaFiles.length === 0) || isUploading}
                        className="bg-secondary text-on-secondary px-10 py-3 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] disabled:opacity-20 transition-all hover:scale-105 shadow-lg shadow-secondary/10 flex items-center justify-center min-w-[140px]"
                      >
                        {isUploading ? <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div> : (replyingTo ? 'Comentar' : 'Publicar')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-12 h-12 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
                  <div className="text-secondary/40 text-[10px] uppercase tracking-[0.3em] font-medium animate-pulse">Sincronizando hilos culinarios...</div>
                </div>
              ) : (
                mainPosts.map(post => (
                  <div key={post.id} className="relative group">
                    {/* MAIN POST CARD */}
                    <div className="relative z-10 glass-panel p-8 rounded-[40px] border border-white/5 flex gap-6 hover:bg-surface-container-low/30 transition-all duration-500 mb-2">
                      <div className="relative group/avatar shrink-0">
                        <div className="w-12 h-12 rounded-full border border-secondary/20 overflow-hidden bg-surface-container-high transition-transform group-hover/avatar:scale-110 duration-500">
                           <div className="w-full h-full flex items-center justify-center font-bold text-secondary uppercase text-sm">
                             {post.author_name.charAt(0)}
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="font-bold text-[#f0f0f0] truncate text-[15px]">{post.author_name}</span>
                            {post.author_role === 'ADMIN' && <AppIcon name="workspace_premium" size={13} className="text-secondary shrink-0" />}
                            <span className="text-[10px] font-mono text-on-surface-variant/40 tracking-tighter">
                              {new Date(post.created_at).toLocaleDateString([], {day:'2-digit', month:'short'})} · {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-on-surface-variant font-light text-[16px] leading-[1.65] whitespace-pre-wrap mb-6 max-w-[95%]">
                          {post.content}
                        </p>

                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className={`grid gap-3 mb-6 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {post.media_urls.map((url, i) => (
                              <div key={i} className="relative rounded-[32px] overflow-hidden bg-black/40 border border-white/5 aspect-[4/3] group/media">
                                {post.media_type === 'video' ? (
                                  <video src={url} className="w-full h-full object-cover" controls/>
                                ) : (
                                  <img src={url} alt="content" className="w-full h-full object-cover transition-transform duration-[2s] group-hover/media:scale-110"/>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-8 border-t border-white/5 pt-6">
                          <button onClick={() => handleLike(post)} className="flex items-center gap-2 group/btn">
                             <div className="p-2.5 rounded-full group-hover/btn:bg-secondary/10 transition-colors">
                               <AppIcon name="thumb_up" size={16} className="text-on-surface-variant/40 group-hover/btn:text-secondary transition-colors"/>
                             </div>
                             <span className="text-[12px] font-mono text-on-surface-variant/40 group-hover/btn:text-secondary">{post.likes_count}</span>
                          </button>
                          
                          <button onClick={() => setReplyingTo(post)} className="flex items-center gap-2 group/btn">
                             <div className="p-2.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                               <AppIcon name="forum" size={16} className="text-on-surface-variant/40 group-hover/btn:text-primary transition-colors"/>
                             </div>
                             <span className="text-[12px] font-mono text-on-surface-variant/40 group-hover/btn:text-primary">{getReplies(post.id).length}</span>
                          </button>

                          <button onClick={() => sharePost(post)} className="ml-auto w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-on-surface-variant/40 transition-colors">
                            <AppIcon name="arrow_forward" size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* THREAD LINE IF HAS REPLIES */}
                    {getReplies(post.id).length > 0 && (
                      <div className="absolute left-[54px] top-[100px] bottom-0 w-px bg-gradient-to-b from-secondary/40 via-secondary/10 to-transparent mb-[-20px] pointer-events-none opacity-50" />
                    )}

                    {/* REPLIES NESTED */}
                    <div className="space-y-2 mt-4 ml-8">
                       {getReplies(post.id).map((reply, ridx, rarr) => (
                         <div key={reply.id} className="relative group/reply pb-4">
                            {/* Horizontal connector line */}
                            <div className="absolute left-[-22px] top-[30px] w-[22px] h-px bg-secondary/30" />
                            
                            <div className="glass-panel p-6 rounded-[32px] border border-white/5 flex gap-4 bg-surface-container-low/20 backdrop-blur-3xl group-hover/reply:border-secondary/20 transition-all duration-300">
                              <div className="w-10 h-10 rounded-full border border-secondary/10 bg-surface-container-high flex items-center justify-center font-bold text-[10px] text-secondary/60 uppercase shrink-0 transform scale-90">
                                {reply.author_name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-bold text-[14px] text-on-surface/90">{reply.author_name}</span>
                                  <span className="text-[9px] font-mono text-on-surface-variant/30 tracking-tighter">
                                    {new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <p className="text-on-surface-variant/80 font-light text-[14px] leading-relaxed mb-4">
                                  {reply.content}
                                </p>

                                {reply.media_urls && reply.media_urls.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2 mb-4">
                                    {reply.media_urls.map((url, i) => (
                                      <div key={i} className="relative rounded-2xl overflow-hidden bg-black/20 aspect-video">
                                        {reply.media_type === 'video' ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} alt="reply media" className="w-full h-full object-cover" />}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center gap-6">
                                  <button onClick={() => handleLike(reply)} className="flex items-center gap-1.5 group/like">
                                    <AppIcon name="thumb_up" size={13} className="text-on-surface-variant/30 group-hover/like:text-secondary transition-colors"/>
                                    <span className="text-[11px] font-mono text-on-surface-variant/40 group-hover/like:text-secondary">{reply.likes_count}</span>
                                  </button>
                                  <button onClick={() => sharePost(reply)} className="text-on-surface-variant/20 hover:text-on-surface/50 transition-colors">
                                    <AppIcon name="arrow_forward" size={13}/>
                                  </button>
                                </div>
                              </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar (Ads Space) - Refined */}
          <aside className="hidden lg:block w-[300px] space-y-8">
            <div className="bg-surface-container-low/10 rounded-[48px] border border-white/5 p-8 flex flex-col items-center justify-center min-h-[450px] text-center sticky top-8 backdrop-blur-2xl">
               <div className="w-20 h-20 rounded-full border border-secondary/10 flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-secondary/5 rounded-full animate-pulse-slow" />
                 <AppIcon name="auto_awesome" className="text-secondary/80 animate-float" size={32} />
               </div>
               <h3 className="font-headline text-xl tracking-[0.2em] uppercase mb-3 text-white">Curated</h3>
               <p className="text-[10px] text-secondary tracking-widest uppercase mb-6 font-medium opacity-60">Aura Gastronomy Ads</p>
               <p className="text-xs text-on-surface-variant/60 font-light leading-relaxed max-w-[200px]">
                 Espacio exclusivo para la alta gastronomía y patrocinadores premium.
               </p>
               <div className="mt-10 pt-10 border-t border-white/5 w-full space-y-4">
                  <div className="h-[2px] w-full bg-secondary/5 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-secondary/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="h-[1px] w-2/3 mx-auto bg-white/5 rounded-full" />
               </div>
            </div>
            
            <div className="px-6 text-[10px] text-on-surface-variant/20 font-mono tracking-[0.3em] text-center uppercase">
              The Digital Hub<br/>
              AURA NETWORK v1.2
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
