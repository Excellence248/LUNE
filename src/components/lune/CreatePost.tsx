"use client";

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPost } = useSocial();
  const { user } = useWallet();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePost = async () => {
    if (!user || (!content.trim() && !image)) return;
    setPosting(true);
    try {
      await addPost(content, image || undefined);
      setContent('');
      setImage(null);
      showSuccess('Posted.');
    } catch {
      showError('Post could not be saved.');
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return (
      <div className="px-4 md:px-6 py-5 flex items-center gap-3 text-sm text-white/45">
        <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
          <Lock size={16} className="text-lune-300/70" />
        </div>
        <p>You're browsing as a guest. Posting needs an account session.</p>
      </div>
    );
  }

  const canPost = (content.trim().length > 0 || !!image) && !posting;

  return (
    <div className="px-4 md:px-6 pt-5 pb-3">
      <div className="flex gap-3.5">
        <Avatar className="w-11 h-11 ring-1 ring-white/10 shrink-0">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 text-white text-sm font-semibold">
            {(user?.username || user?.email)?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
            }}
            placeholder="What's the alpha today?"
            rows={2}
            className="w-full bg-transparent border-none text-[17px] text-white placeholder:text-white/30 focus:outline-none focus:ring-0 resize-none min-h-[64px] pt-2 leading-relaxed"
          />

          {image && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-white/10 max-w-md">
              <img src={image} alt="Attachment preview" className="w-full h-auto object-cover" />
              <button
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
            <div className="flex items-center gap-1 text-lune-300">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
                className="h-9 w-9 flex items-center justify-center hover:bg-lune-500/10 rounded-full transition-colors"
              >
                <ImageIcon size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePost} disabled={!canPost} className="lune-btn h-9 text-sm">
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
