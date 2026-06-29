"use client";

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, BarChart2, Smile, Zap, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPost } = useSocial();
  const { user } = useWallet();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !image) return;
    await addPost(content, image || undefined);
    setContent('');
    setImage(null);
    showSuccess("Alpha posted to the feed!");
  };

  return (
    <div className="p-4 md:p-6 border-b border-white/5 bg-white/[0.01]">
      <div className="flex gap-3 md:gap-4">
        <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-white/10 shrink-0">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-purple-900 text-purple-200 text-xs">
            {user?.username?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the alpha today?"
            className="w-full bg-transparent border-none text-base md:text-lg text-white placeholder:text-gray-600 focus:ring-0 resize-none min-h-[80px] md:min-h-[100px] p-0"
          />

          {image && (
            <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-white/10 max-w-md">
              <img src={image} alt="Preview" className="w-full h-auto object-cover" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
            <div className="flex items-center gap-1 text-purple-400">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-purple-500/10 rounded-full transition-colors"
              >
                <ImageIcon size={18} />
              </button>
              <button className="p-2 hover:bg-purple-500/10 rounded-full transition-colors">
                <Zap size={18} />
              </button>
              <button className="p-2 hover:bg-purple-500/10 rounded-full transition-colors">
                <BarChart2 size={18} />
              </button>
            </div>
            
            <Button 
              onClick={handlePost}
              disabled={!content.trim() && !image}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-5 font-bold disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-xs"
            >
              Post Alpha
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;