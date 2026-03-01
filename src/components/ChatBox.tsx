import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Reply, X, Trash2, Download, Smile, Maximize2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { ImageZoomModal } from './ImageZoomModal';

interface ChatBoxProps {
  orderId: string;
  user: any;
}

export default function ChatBox({ orderId, user }: ChatBoxProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null); // For showing actions on mobile
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const fetchMessages = async () => {
    const res = await fetch(`/api/orders/${orderId}/messages`);
    const data = await res.json();
    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (shouldAutoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isNearBottom);
  };

  const sendMessage = async (e?: React.FormEvent, imageBase64?: string) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageBase64) return;

    setIsSending(true);
    const messageData = {
      message_id: uuidv4(),
      sender_id: user.id,
      sender_name: user.name,
      sender_role: user.role,
      text: newMessage,
      image: imageBase64 || null,
      reply_to_id: replyingTo?.id || null,
      reply_to_text: replyingTo?.text || null
    };

    const res = await fetch(`/api/orders/${orderId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });

    if (res.ok) {
      setNewMessage('');
      setReplyingTo(null);
      fetchMessages();
    }
    setIsSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await sendMessage(undefined, base64);
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    await fetch(`/api/messages/${messageId}/react`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction, userId: user.id })
    });
    fetchMessages();
    setActiveMessageId(null);
  };

  const handleDelete = async (messageId: string, type: 'me' | 'everyone') => {
    await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, type })
    });
    fetchMessages();
    setActiveMessageId(null);
  };

  return (
    <div className="bg-black/40 rounded-2xl border border-white/5 flex flex-col h-[500px] relative">
      {/* Image Zoom Modal */}
      <ImageZoomModal 
        isOpen={!!fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
        src={fullscreenImage || ''} 
      />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
            <Send size={24} />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const deletedFor = JSON.parse(msg.deleted_for || '[]');
          if (deletedFor.includes(user.id) || deletedFor.includes('everyone')) {
            if (deletedFor.includes('everyone')) {
               return (
                 <div key={msg.id} className={`flex flex-col ${msg.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                   <div className="max-w-[85%] rounded-2xl p-3 bg-zinc-900/50 text-zinc-500 italic text-sm border border-white/5">
                     This message was deleted
                   </div>
                 </div>
               );
            }
            return null; // Don't show if deleted for me
          }

          const reactions = JSON.parse(msg.reactions || '{}');
          const isMyMessage = msg.sender_id === user.id;

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col w-full ${isMyMessage ? 'items-end' : 'items-start'} relative group mb-4`}
            >
              {/* Sender Info & Timestamp */}
              <div className={`flex items-center gap-2 mb-1 px-1 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-xs font-medium text-zinc-300">{isMyMessage ? 'You' : msg.sender_name}</span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className={`flex items-end gap-2 max-w-[85%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                <div 
                  className={`rounded-2xl p-3 relative flex-1 min-w-0 shadow-sm ${
                    isMyMessage 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                  }}
                >
                  {/* Reply Quote */}
                  {msg.reply_to_text && (
                    <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-white/30 text-xs opacity-80 italic truncate">
                      {msg.reply_to_text}
                    </div>
                  )}
                  
                  {msg.image && (
                    <div className="relative group/img cursor-pointer mb-1" onClick={() => setFullscreenImage(msg.image)}>
                      <img 
                        src={msg.image} 
                        alt="Chat attachment" 
                        className="rounded-xl max-h-64 w-full object-cover border border-white/10"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Maximize2 className="text-white drop-shadow-lg" size={24} />
                      </div>
                    </div>
                  )}
                  
                  {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                  
                  {/* Reactions Display */}
                  {Object.keys(reactions).length > 0 && (
                    <div className={`absolute -bottom-3 ${isMyMessage ? 'right-2' : 'left-2'} flex gap-1 bg-zinc-900 border border-white/10 rounded-full px-1.5 py-0.5 shadow-lg`}>
                      {Object.entries(reactions).map(([uId, r]: [string, any]) => (
                        <span key={uId} className="text-xs">{r}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeMessageId === msg.id ? 'opacity-100' : ''} shrink-0 pb-1`}>
                  <button type="button" onClick={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 md:hidden">
                    <Smile size={14} />
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); setReplyingTo(msg); }} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700">
                    <Reply size={14} />
                  </button>
                </div>
              </div>

              {/* Context Menu (Reactions & Delete) */}
              {activeMessageId === msg.id && (
                <div className={`absolute z-10 top-full mt-2 ${isMyMessage ? 'right-0' : 'left-0'} bg-zinc-900 border border-white/10 rounded-xl shadow-xl p-2 flex flex-col gap-2 min-w-[150px]`}>
                  <div className="flex justify-between px-2 pb-2 border-b border-white/10">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                      <button type="button" key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => handleDelete(msg.id, 'me')} className="text-left text-xs text-zinc-300 hover:bg-white/5 px-2 py-1.5 rounded-lg flex items-center gap-2">
                      <Trash2 size={12} /> Delete for me
                    </button>
                    {(isMyMessage || user.role === 'owner') && (
                      <button type="button" onClick={() => handleDelete(msg.id, 'everyone')} className="text-left text-xs text-red-400 hover:bg-red-500/10 px-2 py-1.5 rounded-lg flex items-center gap-2">
                        <Trash2 size={12} /> Delete for everyone
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/50 border-t border-white/5 space-y-2 rounded-b-2xl">
        {replyingTo && (
          <div className="flex items-center justify-between bg-indigo-600/20 p-2 rounded-lg text-xs text-indigo-300">
            <div className="flex items-center gap-2 truncate">
              <Reply size={12} />
              <span className="truncate">Replying to: {replyingTo.text || 'Image'}</span>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <label className="absolute right-3 bottom-3 cursor-pointer text-zinc-500 hover:text-white transition-colors">
              <ImageIcon size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <button 
            type="button"
            onClick={(e) => sendMessage(e)}
            disabled={isSending || (!newMessage.trim())}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
