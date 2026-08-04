import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { getUserFriends } from "../lib/api";
import { Search, X, MessageCircle, Video, Send, ArrowLeft } from "lucide-react";
import { capitalize } from "../lib/utils";
import NoFriendsFound from "../components/NoFriendsFound";
import { useSocket } from "../context/SocketContext.jsx";
import useAuthUser from "../hooks/useAuthUser";
import { getLanguageFlag } from "../components/FriendCard";
import MessageBubble from "../components/MessageBubble";
import { useNavigate, useSearchParams } from "react-router";
import toast from "react-hot-toast";

const FriendsPage = () => {
  const [searchParams] = useSearchParams();
  const targetFriendId = searchParams.get("friendId") || searchParams.get("id");

  const [search, setSearch] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const messagesEndRef = useRef(null);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Select friend from query parameter if specified
  useEffect(() => {
    if (targetFriendId && friends.length > 0) {
      const found = friends.find((f) => String(f._id) === String(targetFriendId));
      if (found) {
        setSelectedFriend(found);
      }
    }
  }, [targetFriendId, friends]);

  // Join DM + load history
  useEffect(() => {
    if (!selectedFriend || !socket) {
      leaveDM();
      return;
    }
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

  // Realtime messages
  useEffect(() => {
    if (!selectedFriend) return;
    const live = dmMessages[selectedFriend._id] || [];
    setMessages((prev) => {
      const merged = [...prev];
      live.forEach((msg) => { if (!merged.some((m) => m._id === msg._id)) merged.push(msg); });
      return merged;
    });
  }, [dmMessages, selectedFriend]);

  // Typing indicator
  useEffect(() => {
    if (!selectedFriend) return;
    if (globalTypingUsers[selectedFriend._id]) setTypingUsers(new Set([selectedFriend._id]));
    else setTypingUsers(new Set());
  }, [globalTypingUsers, selectedFriend]);

  // Auto-scroll
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

  // ── Video call ─────────────────────────────────────────
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return friends.filter((f) =>
      !q ||
      f.fullName.toLowerCase().includes(q) ||
      f.nativeLanguage?.toLowerCase().includes(q) ||
      f.learningLanguage?.toLowerCase().includes(q)
    );
  }, [friends, search]);

  const isOnline = selectedFriend && onlineUsers.has(String(selectedFriend._id));
  const friendOnline = (id) => onlineUsers.has(String(id));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className={`flex flex-col border-r border-base-300 shrink-0 w-72 ${selectedFriend ? "hidden lg:flex" : "flex w-full lg:w-72"}`}>
        <div className="px-3 pt-4 pb-2 border-b border-base-300/50 space-y-2">
          <h1 className="text-base font-bold px-1">
            Friends
            <span className="text-xs font-normal opacity-40 ml-2">{friends.length}</span>
          </h1>
          <label className="input input-bordered input-xs flex items-center gap-2 w-full">
            <Search className="size-3 opacity-40 shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              className="grow bg-transparent outline-none text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-100">
                <X className="size-2.5" />
              </button>
            )}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10"><span className="loading loading-spinner loading-sm" /></div>
          ) : friends.length === 0 ? (
            <div className="p-4"><NoFriendsFound /></div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs opacity-40">No friends match</div>
          ) : (
            <div>
              {filtered.map((friend) => {
                const isActive = selectedFriend?._id === friend._id;
                const online = friendOnline(friend._id);
                return (
                  <button
                    key={friend._id}
                    onClick={() => {
                      setSelectedFriend(friend);
                      setUnreadCounts((prev) => ({ ...prev, [friend._id]: 0 }));
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-l-2 transition-colors duration-100 ${isActive ? "bg-primary/10 border-primary" : "hover:bg-base-300/40 border-transparent"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend._id}`}
                        alt={friend.fullName}
                        className="size-9 rounded-full object-cover bg-base-300"
                      />
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success border border-base-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs truncate font-medium">{friend.fullName}</p>
                        {unreadCounts[friend._id] > 0 && (
                          <span className="badge badge-primary badge-sm">{unreadCounts[friend._id]}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-[10px] truncate opacity-40">{online ? "Online" : "Offline"}</p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {getLanguageFlag(friend.nativeLanguage)}
                          <span className="text-[8px] opacity-20">→</span>
                          {getLanguageFlag(friend.learningLanguage)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT CHAT PANEL ── */}
<div
  className={`
    ${
      selectedFriend
        ? "fixed inset-0 z-50 flex bg-base-100 lg:relative lg:inset-auto"
        : "hidden lg:flex"
    }
    flex-1 flex-col overflow-hidden
  `}
>
          {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <div className="size-16 rounded-full bg-base-200 flex items-center justify-center">
              <MessageCircle className="size-7 opacity-20" />
            </div>
            <p className="text-sm opacity-40 font-medium">Select a friend to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
<div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b border-base-300 bg-base-200 shrink-0">              <div className="flex items-center gap-3">
                {/* Back button — mobile only */}
                <button
                  className="lg:hidden btn btn-ghost btn-circle btn-sm"
                  onClick={() => setSelectedFriend(null)}
                  aria-label="Back to friends"
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

              {/* Video call button — always visible, disabled when offline */}
              <div className="tooltip tooltip-left" data-tip={isOnline ? "Start video call" : "Friend is offline"}>
                <button
                  onClick={handleVideoCall}
                  disabled={!isOnline}
                  className={`btn btn-sm btn-circle transition-colors ${isOnline
                      ? "btn-ghost hover:bg-success/20 hover:text-success"
                      : "btn-ghost opacity-30 cursor-not-allowed"
                    }`}
                >
                  <Video className="size-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
<div
  className="flex-1 overflow-y-auto p-4 bg-base-100"
  style={{
    paddingTop: "8px",
    paddingBottom: "80px",
  }}
>
                {loadingHistory ? (
                <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
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

            {/* Input */}
<div className="sticky bottom-0 z-20 px-4 py-3 border-t border-base-300 bg-base-200 shrink-0">              <div className="flex gap-2">
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
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;