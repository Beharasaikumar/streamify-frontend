import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Video, Send, MessageCircle } from "lucide-react";
import { capitalize } from "../lib/utils";
import { getLanguageFlag } from "./FriendCard";
import MessageBubble from "./MessageBubble";
import useAuthUser from "../hooks/useAuthUser";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

/**
 * InlineChatPanel
 *
 * Reusable chat panel used in both FriendsPage and HomePage.
 *
 * Props:
 *   selectedFriend  – friend object to chat with (null = show empty state)
 *   onClose         – called when the ← back button is pressed (clears selectedFriend in parent)
 *   emptyStateLabel – text shown when no friend is selected (optional)
 */
const InlineChatPanel = ({ selectedFriend, onClose, emptyStateLabel = "Select a friend to start chatting" }) => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const {
    socket,
    onlineUsers,
    dmMessages,
    unreadCounts,
    setUnreadCounts,
    typingUsers: globalTypingUsers,
    joinDM,
    leaveDM,
    sendDMMessage,
    setDMTyping,
    getDMHistory,
    initiateCall,
  } = useSocket();

  const [messages,       setMessages]       = useState([]);
  const [inputText,      setInputText]      = useState("");
  const [isTyping,       setIsTyping]       = useState(false);
  const [typingUsers,    setTypingUsers]    = useState(new Set());
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);

  // Reset + load history when selected friend changes
  useEffect(() => {
    if (!selectedFriend || !socket) {
      leaveDM();
      return;
    }
    setMessages([]);
    setInputText("");
    setIsTyping(false);
    joinDM(selectedFriend._id);
    setUnreadCounts((prev) => ({ ...prev, [selectedFriend._id]: 0 }));

    const load = async () => {
      setLoadingHistory(true);
      try {
        const { messages: loaded } = await getDMHistory(selectedFriend._id);
        setMessages(loaded || []);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    load();

    return () => {
      leaveDM(selectedFriend._id);
    };
  }, [selectedFriend, socket]);

  // Realtime incoming messages
  useEffect(() => {
    if (!selectedFriend) return;
    const live = dmMessages[selectedFriend._id] || [];
    setMessages((prev) => {
      const merged = [...prev];
      live.forEach((msg) => {
        if (!merged.some((m) => m._id === msg._id)) merged.push(msg);
      });
      return merged;
    });
  }, [dmMessages, selectedFriend]);

  // Typing indicator
  useEffect(() => {
    if (!selectedFriend) return;
    if (globalTypingUsers[selectedFriend._id]) setTypingUsers(new Set([selectedFriend._id]));
    else setTypingUsers(new Set());
  }, [globalTypingUsers, selectedFriend]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedFriend) return;
    sendDMMessage(selectedFriend._id, inputText.trim());
    setInputText("");
    setIsTyping(false);
    setDMTyping(selectedFriend._id, false);
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!selectedFriend) return;
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      setDMTyping(selectedFriend._id, true);
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
      setDMTyping(selectedFriend._id, false);
    }
  };

  const handleVideoCall = () => {
    if (!selectedFriend || !authUser) return;
    const friendOnline = onlineUsers.has(String(selectedFriend._id));
    if (!friendOnline) {
      toast.error(`${selectedFriend.fullName} is offline`);
      return;
    }
    const callId = [authUser._id, selectedFriend._id].sort().join("-") + "-" + Date.now();
    initiateCall(selectedFriend._id, callId, authUser.fullName);
    navigate(`/video-call/${callId}`, {
      state: { recipientId: selectedFriend._id, isInitiator: true },
    });
  };

  const isOnline = selectedFriend && onlineUsers.has(String(selectedFriend._id));

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!selectedFriend) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
        <div className="size-16 rounded-full bg-base-200 flex items-center justify-center">
          <MessageCircle className="size-7 opacity-20" />
        </div>
        <p className="text-sm opacity-40 font-medium">{emptyStateLabel}</p>
      </div>
    );
  }

  // ── Chat panel ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-300 bg-base-200 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back arrow — always visible so parent can clear selectedFriend */}
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={onClose}
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>

          <img
            src={selectedFriend.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend._id}`}
            alt={selectedFriend.fullName}
            className="size-8 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              {selectedFriend.fullName}
              {isOnline && <span className="size-2 rounded-full bg-success inline-block" />}
            </p>
            <p className="text-xs opacity-40 leading-tight">
              {capitalize(selectedFriend.nativeLanguage || "")} → {capitalize(selectedFriend.learningLanguage || "")}
            </p>
          </div>
        </div>

        {/* Video call */}
        <div className="tooltip tooltip-left" data-tip={isOnline ? "Start video call" : "Friend is offline"}>
          <button
            onClick={handleVideoCall}
            disabled={!isOnline}
            className={`btn btn-sm btn-circle transition-colors ${
              isOnline
                ? "btn-ghost hover:bg-success/20 hover:text-success"
                : "btn-ghost opacity-30 cursor-not-allowed"
            }`}
          >
            <Video className="size-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-base-100">
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-40 text-sm">
            No messages yet. Start chatting!
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} isOwn={msg.sender._id === authUser._id} />
            ))}
            {typingUsers.size > 0 && (
              <div className="flex gap-2 mb-3 items-end">
                <div className="flex gap-1 items-end">
                  <div className="size-2 rounded-full bg-base-400 animate-bounce" />
                  <div className="size-2 rounded-full bg-base-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="size-2 rounded-full bg-base-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
                <p className="text-xs opacity-40">{selectedFriend.fullName} is typing…</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-200 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message…"
            className="input input-bordered input-sm flex-1"
            value={inputText}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="btn btn-primary btn-sm btn-circle"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineChatPanel;
