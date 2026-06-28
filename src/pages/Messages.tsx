"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/lune/Layout';
import { MessageSquare, Search, Send, MoreVertical, ChevronLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { supabase } from '@/lib/supabase';

const Messages = () => {
  const { user: currentUser } = useWallet();
  const { messages, sendMessage, fetchMessages, searchUsers } = useSocial();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchRecentChats = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:sender_id (id, username, avatar_url),
          receiver:receiver_id (id, username, avatar_url)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const uniqueChats = new Map();
        data.forEach(msg => {
          const otherUser = msg.sender_id === currentUser.id ? msg.receiver : msg.sender;
          if (otherUser && !uniqueChats.has(otherUser.id)) {
            uniqueChats.set(otherUser.id, {
              id: otherUser.id,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url,
              lastMsg: msg.content,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        });
        setRecentChats(Array.from(uniqueChats.values()));
      }
    } catch (err) {
      console.error("Error fetching recent chats:", err);
    }
  };

  useEffect(() => {
    fetchRecentChats();
  }, [currentUser]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      
      const channel = supabase
        .channel(`messages:${selectedChat.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          table: 'messages',
        }, () => {
          fetchMessages(selectedChat.id);
          fetchRecentChats();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedChat]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter(u => u.id !== currentUser?.id));
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat) return;
    await sendMessage(selectedChat.id, input);
    setInput('');
    fetchRecentChats();
  };

  return (
    <Layout noPadding className="h-[calc(100vh-5rem)]">
      <div className="flex h-full overflow-hidden relative">
        <div className={cn(
          "w-full md:w-80 border-r border-white/5 flex flex-col bg-[#050505] transition-all duration-300",
          selectedChat ? "hidden md:flex" : "flex"
        )}>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
              Messages <MessageSquare className="text-purple-500" />
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users to chat..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none text-white"
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" size={14} />}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {searchQuery.trim() ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase px-4 py-2">Search Results</p>
                {searchResults.map((user) => (
                  <div 
                    key={user.id} 
                    onClick={() => { setSelectedChat(user); setSearchQuery(''); }}
                    className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <Avatar className="w-12 h-12 border border-white/10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-purple-900 text-purple-200">{user.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-white">{user.username}</p>
                      <p className="text-[10px] text-purple-400">Start conversation</p>
                    </div>
                  </div>
                ))}
                {!isSearching && searchResults.length === 0 && (
                  <p className="text-center text-gray-600 text-xs py-4">No users found</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase px-4 py-2">Recent Chats</p>
                {recentChats.map((chat) => (
                  <div 
                    key={chat.id} 
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      "p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all",
                      selectedChat?.id === chat.id ? 'bg-white/10' : 'hover:bg-white/5'
                    )}
                  >
                    <Avatar className="w-12 h-12 border border-white/10">
                      <AvatarImage src={chat.avatar_url} />
                      <AvatarFallback className="bg-purple-900 text-purple-200">{chat.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm truncate text-white">{chat.username}</span>
                        <span className="text-[10px] text-gray-500">{chat.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{chat.lastMsg}</p>
                    </div>
                  </div>
                ))}
                {recentChats.length === 0 && (
                  <div className="py-12 text-center text-gray-600 text-sm">
                    No conversations yet. Search for a friend to start chatting!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col bg-white/[0.01] transition-all duration-300",
          !selectedChat ? "hidden md:flex" : "flex"
        )}>
          {selectedChat ? (
            <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-400"><ChevronLeft /></button>
                  <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={selectedChat.avatar_url} />
                    <AvatarFallback className="bg-purple-900 text-purple-200">{selectedChat.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-white">{selectedChat.username}</h3>
                    <p className="text-[10px] text-green-400">Online</p>
                  </div>
                </div>
                <button className="p-2 text-gray-500 hover:text-white"><MoreVertical size={20} /></button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
                {(messages[selectedChat.id] || []).map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={cn("flex gap-4 max-w-lg", isMe ? "ml-auto flex-row-reverse" : "")}>
                      <div className={cn(
                        "p-4 rounded-2xl shadow-lg", 
                        isMe ? "bg-purple-600 text-white" : "bg-white/5 border border-white/10 text-gray-200"
                      )}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <span className="text-[10px] opacity-50 mt-2 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-white/5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center gap-2">
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-transparent border-none text-sm focus:ring-0 px-2 text-white"
                  />
                  <button 
                    onClick={handleSend} 
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center hover:bg-purple-500 disabled:opacity-50 transition-all"
                  >
                    <Send size={18} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-xl font-bold text-white">Your Messages</h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2">Select a chat or search for a user to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;