"use client";

import React, { useState } from 'react';
import { MessageSquare, Repeat2, Heart, Share2, MoreHorizontal, DollarSign, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import TipModal from './TipModal';
import { useSocial, Post } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface FeedCardProps {
  post: Post & { repostedBy?: string };
}

const FeedCard = ({ post }: FeedCardProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useWallet();
  const { toggleLike, toggleRepost, addComment, followUser, unfollowUser, isFollowing } = useSocial();
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const isLiked = currentUser ? post.likes?.some(l => l.user_id === currentUser.id) : false;
  const isReposted = currentUser ? post.reposts?.some(r => r.user_id === currentUser.id) : false;
  const following = isFollowing(post.user_id);
  const isOwnPost = currentUser?.id === post.user_id;

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    if (!currentUser) return;
    addComment(post.id, commentInput);
    setCommentInput('');
  };

  const navigateToProfile = (username?: string) => {
    if (username) {
      navigate(`/profile/${username}`);
    }
  };

  const isRepost = post.post_type === 'repost';
  const displayUsername = isRepost ? post.repost_username : post.profiles?.username;

  return (
    <div className="p-4 md:p-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      {/* Repost Header */}
      {(post.repostedBy || (isRepost && post.profiles?.username)) && (
        <div 
          onClick={() => navigateToProfile(post.repostedBy || post.profiles?.username)}
          className="flex items-center gap-2 mb-2 ml-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-purple-400 transition-colors"
        >
          <Repeat2 size={12} />
          <span>Reposted by {post.repostedBy || post.profiles?.username}</span>
        </div>
      )}
      
      <div className="flex gap-3 md:gap-4">
        <Avatar 
          onClick={() => navigateToProfile(displayUsername)}
          className="w-10 h-10 md:w-12 md:h-12 border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <AvatarImage src={isRepost ? undefined : post.profiles?.avatar_url} />
          <AvatarFallback className="bg-purple-900 text-purple-200 text-xs">
            {displayUsername?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span 
                onClick={() => navigateToProfile(displayUsername)}
                className="font-bold text-white hover:underline cursor-pointer text-sm md:text-base truncate"
              >
                {displayUsername || 'Anonymous'}
              </span>
              <span className="text-gray-600 text-xs shrink-0">
                · {formatDistanceToNow(new Date(post.created_at))} ago
              </span>
              {!isOwnPost && currentUser && !isRepost && (
                <button 
                  onClick={() => following ? unfollowUser(post.user_id) : followUser(post.user_id)}
                  className={cn(
                    "ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all",
                    following 
                      ? "border-white/10 text-gray-500 hover:text-red-400 hover:border-red-400/30" 
                      : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  )}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <button className="text-gray-600 hover:text-white transition-colors p-1">
              <MoreHorizontal size={16} />
            </button>
          </div>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {isRepost && post.repost_content ? post.repost_content : post.content}
          </p>

          {post.image_url && (
            <div className="mt-2 mb-4 rounded-2xl overflow-hidden border border-white/10 max-w-2xl">
              <img src={post.image_url} alt="Post content" className="w-full h-auto object-cover" />
            </div>
          )}

          <div className="flex items-center justify-between max-w-md text-gray-500 -ml-2">
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group/btn"
            >
              <MessageSquare size={16} />
              <span className="text-xs">{post.replies?.length || 0}</span>
            </button>
            <button 
              onClick={() => toggleRepost(post.id)}
              className={cn(
                "flex items-center gap-1.5 transition-colors group/btn",
                isReposted ? "text-green-400" : "hover:text-green-400"
              )}
            >
              <div className={cn("p-2 rounded-full", isReposted ? "bg-green-400/10" : "group-hover/btn:bg-green-400/10")}>
                <Repeat2 size={16} />
              </div>
              <span className="text-xs">{post.reposts?.length || 0}</span>
            </button>
            <button 
              onClick={() => toggleLike(post.id)}
              className={cn(
                "flex items-center gap-1.5 transition-colors group/btn",
                isLiked ? "text-pink-400" : "hover:text-pink-400"
              )}
            >
              <div className={cn("p-2 rounded-full", isLiked ? "bg-pink-400/10" : "group-hover/btn:bg-pink-400/10")}>
                <Heart size={16} className={cn(isLiked && "fill-pink-400")} />
              </div>
              <span className="text-xs">{post.likes?.length || 0}</span>
            </button>
            <button 
              onClick={() => setIsTipOpen(true)}
              className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors group/btn"
            >
              <div className="p-2 rounded-full group-hover/btn:bg-yellow-400/10">
                <DollarSign size={16} />
              </div>
            </button>
            <button className="flex items-center gap-1.5 hover:text-purple-400 transition-colors group/btn">
              <div className="p-2 rounded-full group-hover/btn:bg-purple-400/10">
                <Share2 size={16} />
              </div>
            </button>
          </div>

          {showComments && (
            <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
              {post.replies?.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <Avatar 
                    onClick={() => navigateToProfile(reply.profiles?.username)}
                    className="w-8 h-8 border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <AvatarFallback className="bg-purple-900 text-[10px] text-purple-200">
                      {reply.profiles?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span 
                        onClick={() => navigateToProfile(reply.profiles?.username)}
                        className="font-bold text-white text-xs cursor-pointer hover:underline"
                      >
                        {reply.profiles?.username}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {formatDistanceToNow(new Date(reply.created_at))} ago
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{reply.content}</p>
                  </div>
                </div>
              ))}
              
              <form onSubmit={handleComment} className="flex gap-2 mt-4">
                <input 
                  type="text" 
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Post your reply" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <button type="submit" className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition-colors">
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <TipModal 
        isOpen={isTipOpen} 
        onClose={() => setIsTipOpen(false)} 
        recipient={displayUsername || 'Anonymous'} 
      />
    </div>
  );
};

export default FeedCard;