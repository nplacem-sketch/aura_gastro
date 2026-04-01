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
}

export default function CommunityPage() {
  const { user, role } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handlePost = async () => {
    if (!newContent.trim() || !user) return;

    const authorName = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown Chef';
    
    const postData = {
      author_id: user.id,
      author_name: authorName,
      author_role: role,
      content: newContent.trim()
    };

    setNewContent('');

    const { error } = await chatDb().from('posts').insert(postData);
    if (error) {
      console.error('Error posting:', error);
      // fallback in case of strict RLS
      alert('Error publicando el mensaje.');
    }
  };

  const handleLike = async (post: Post) => {
    if (!user) return;
    
    const { error } = await fetch('/api/community/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id })
    });

    if (!error) {
      // Optimistic update
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  return (
    <div className="flex h-screen bg-[#121413] text-on-surface">
      <div className="flex-1 flex justify-center overflow-y-auto" ref={scrollRef}>
        <div className="w-full max-w-2xl px-4 py-8 space-y-6">
          
          <header className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
            <h1 className="text-2xl font-headline tracking-wide">Comunidad</h1>
            <AppIcon name="forum" className="text-secondary" />
          </header>

          {/* Create Post */}
          <div className="glass-panel p-6 rounded-3xl flex gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-secondary uppercase shrink-0">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg placeholder:text-on-surface-variant font-light min-h-[100px]"
                placeholder="¿Qué estás cocinando hoy?"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4 border-t border-outline-variant/10 pt-4">
                <div className="flex gap-2 text-secondary">
                  <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors"><AppIcon name="attach_file" size={20} /></button>
                  <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors"><AppIcon name="videocam" size={20} /></button>
                </div>
                <button
                  onClick={handlePost}
                  disabled={!newContent.trim()}
                  className="bg-secondary text-on-secondary px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest disabled:opacity-50 transition-all hover:scale-105"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="text-center text-on-surface-variant py-10 animate-pulse">Cargando comunidad...</div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-6 rounded-3xl flex gap-4 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-on-surface uppercase shrink-0">
                    {post.author_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-on-surface">{post.author_name}</span>
                      {post.author_role === 'ADMIN' && (
                        <AppIcon name="check_circle" size={14} className="text-secondary" />
                      )}
                      <span className="text-xs text-on-surface-variant font-light">
                        {new Date(post.created_at).toLocaleDateString()} a las {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-on-surface font-light leading-relaxed whitespace-pre-wrap mb-4">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-6 text-on-surface-variant">
                      <button 
                        onClick={() => handleLike(post)} 
                        className="flex items-center gap-2 hover:text-secondary transition-colors text-sm group"
                      >
                        <div className="p-2 rounded-full group-hover:bg-secondary/10 transition-colors">
                          <AppIcon name="thumb_up" size={18} />
                        </div>
                        {post.likes_count > 0 && <span className="font-mono">{post.likes_count}</span>}
                      </button>
                      <button className="flex items-center gap-2 hover:text-primary transition-colors text-sm group">
                        <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                          <AppIcon name="forum" size={18} />
                        </div>
                        {post.replies_count > 0 && <span className="font-mono">{post.replies_count}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-20 text-on-surface-variant font-light">
                  Se el primero en publicar en la comunidad.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
