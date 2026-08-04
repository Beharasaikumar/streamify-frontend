import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { getRooms, createRoom, joinRoom as joinRoomApi, deleteRoom } from "../lib/api";
import { Search, X, PlusIcon, Send, Video, ArrowLeft, Trash2Icon, UsersIcon } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import useAuthUser from "../hooks/useAuthUser";
import MessageBubble from "../components/MessageBubble";
import toast from "react-hot-toast";

const EMOJIS = ["💬","🇪🇸","🇫🇷","🇯🇵","🇬🇧","🇨🇳","🇩🇪","🇰🇷","🇮🇹","🇧🇷","🎯","📚"];

const GroupChatPage = () => {
  const { roomId: urlRoomId } = useParams();   // set when visiting /rooms/:roomId
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(urlRoomId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", topic: "", emoji: "💬" });

  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const {
    socket,
    roomMessages,
    roomUnreadCounts,
    typingUsers: globalTypingUsers,
    joinRoom,
    sendRoomMessage,
    setRoomTyping,
    getRoomHistory,
    leaveRoom,
  } = useSocket();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
    staleTime: 1000 * 60 * 2,
  });

  const { mutate: handleCreate, isPending: creating } = useMutation({
    mutationFn: createRoom,
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowModal(false);
      setForm({ name: "", topic: "", emoji: "💬" });
      selectRoom(newRoom.id);
      toast.success("Room created!");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create room"),
  });

  const { mutate: handleDelete } = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (selectedRoomId) {
        navigate("/rooms", { replace: true });
        setSelectedRoomId(null);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete room"),
  });

  // Sync URL roomId → selected room when rooms load
  useEffect(() => {
    if (urlRoomId && rooms.length > 0) {
      const exists = rooms.find((r) => r.id === urlRoomId);
      if (exists) setSelectedRoomId(urlRoomId);
      else navigate("/rooms", { replace: true });
    }
  }, [urlRoomId, rooms]);

  // Auto-join room in MongoDB if user is currently inside it and not marked as joined yet
  useEffect(() => {
    if (!selectedRoomId || rooms.length === 0) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room && !room.isJoined) {
      joinRoomApi(selectedRoomId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        })
        .catch((err) => console.error("Failed to auto-join room in DB:", err));
    }
  }, [selectedRoomId, rooms, queryClient]);

  // Navigate URL when user clicks a room from the sidebar
  const selectRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
    setSelectedRoomId(roomId);
  };

  // Join room via socket + load history whenever selected room changes
  useEffect(() => {
    if (!selectedRoomId || !socket) return;
    setMessages([]);
    joinRoom(selectedRoomId);

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const { messages: loaded } = await getRoomHistory(selectedRoomId);
        setMessages(loaded || []);
      } catch (err) {
        console.error("Failed to load room history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();

    return () => leaveRoom(selectedRoomId);
  }, [selectedRoomId, socket]);

  // Merge real-time messages
  useEffect(() => {
    if (!selectedRoomId) return;
    const live = roomMessages[selectedRoomId] || [];
    setMessages((prev) => {
      const merged = [...prev];
      live.forEach((msg) => {
        if (!merged.some((m) => m._id === msg._id)) merged.push(msg);
      });
      return merged;
    });
  }, [roomMessages, selectedRoomId]);

  // Typing indicators
  useEffect(() => {
    if (!selectedRoomId) return;
    setTypingUsers(globalTypingUsers[selectedRoomId] || {});
  }, [globalTypingUsers, selectedRoomId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedRoomId) return;
    sendRoomMessage(selectedRoomId, inputText.trim());
    setInputText("");
    setIsTyping(false);
    setRoomTyping(selectedRoomId, false);
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!selectedRoomId) return;
    if (!isTyping && e.target.value.length > 0) { setIsTyping(true); setRoomTyping(selectedRoomId, true); }
    else if (isTyping && e.target.value.length === 0) { setIsTyping(false); setRoomTyping(selectedRoomId, false); }
  };

  const handleRoomVideoCall = () => {
    if (!selectedRoomId || !authUser) return;
    const callId = `room-${selectedRoomId}-${Date.now()}`;
    const joinUrl = `${window.location.origin}/video-call/${callId}`;
    sendRoomMessage(selectedRoomId, `📹 ${authUser.fullName} started a video call. Join here: ${joinUrl}`);
    navigate(`/video-call/${callId}`, { state: { recipientId: null, isInitiator: true, isGroup: true } });
  };

  const filtered = rooms.filter(
    (r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.topic.toLowerCase().includes(search.toLowerCase())
  );

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
<div className="flex h-[calc(100dvh-64px)] overflow-hidden">
      {/* ── LEFT: Rooms Sidebar ── */}
      <div className={`flex flex-col border-r border-base-300 shrink-0 w-72 ${selectedRoomId ? "hidden lg:flex" : "flex w-full lg:w-72"}`}>
        <div className="px-3 pt-4 pb-2 border-b border-base-300/50 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-base font-bold">
              Rooms
              <span className="text-xs font-normal opacity-40 ml-2">{rooms.length}</span>
            </h1>
            <button className="btn btn-primary btn-xs gap-1" onClick={() => setShowModal(true)}>
              <PlusIcon className="size-3" /> New
            </button>
          </div>
          <label className="input input-bordered input-xs flex items-center gap-2 w-full">
            <Search className="size-3 opacity-40 shrink-0" />
            <input
              type="text"
              placeholder="Search rooms…"
              className="grow bg-transparent outline-none text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-100"><X className="size-2.5" /></button>}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10"><span className="loading loading-spinner loading-sm" /></div>
          ) : rooms.length === 0 ? (
            <div className="p-6 text-center text-xs opacity-40">No rooms yet. Create one!</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs opacity-40">No rooms match</div>
          ) : (
            <div>
              {filtered.map((room) => {
                const isActive = selectedRoomId === room.id;
                const unreadCount = roomUnreadCounts[room.id] || 0;
                return (
                  <button
                    key={room.id}
                    onClick={() => selectRoom(room.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-l-2 transition-colors duration-100 group ${isActive ? "bg-primary/10 border-primary" : "hover:bg-base-300/40 border-transparent"}`}
                  >
                    <div className="size-9 rounded-full bg-base-300 flex items-center justify-center text-base shrink-0 relative">
                      {room.emoji}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-extrabold shadow-sm animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium truncate">{room.name}</p>
                        <div className="flex items-center gap-1">
                          <UsersIcon className="size-2.5 opacity-30" />
                          <span className="text-[9px] opacity-30">{room.memberCount}</span>
                        </div>
                      </div>
                      <p className="text-[10px] truncate opacity-35 capitalize">{room.topic}</p>
                      {room.lastMessage && (
                        <p className="text-[10px] truncate opacity-25 mt-0.5">{room.lastMessage}</p>
                      )}
                    </div>
                    {/* Delete button (creator only) */}
                    {room.createdBy?.toString() === authUser?._id?.toString() && (
                      <button
                        className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }}
                        title="Delete room"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Panel ── */}
<div
  className={`
    flex-1 flex-col overflow-hidden
    ${
      selectedRoomId
        ? "fixed inset-0 z-50 flex bg-base-100 lg:relative lg:inset-auto lg:z-auto"
        : "hidden lg:flex"
    }
  `}
>
          {!selectedRoomId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <div className="size-20 rounded-full bg-base-200 flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-base">Pick a room to start chatting</p>
              <p className="text-sm opacity-40 mt-1">Or create a new one with the + New button</p>
            </div>
          </div>
        ) : (
          <>
            {/* Room Header */}
<div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b border-base-300 bg-base-200 shrink-0">              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  className="btn btn-ghost btn-sm btn-circle lg:hidden"
                  onClick={() => { navigate("/rooms"); setSelectedRoomId(null); }}
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="size-8 rounded-full bg-base-300 flex items-center justify-center text-lg">{selectedRoom?.emoji}</div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{selectedRoom?.name}</p>
                  <p className="text-xs opacity-40 leading-tight capitalize">{selectedRoom?.topic}</p>
                </div>
              </div>

              <button
                onClick={handleRoomVideoCall}
                className="btn btn-sm btn-ghost btn-circle hover:btn-success hover:text-success-content"
                title="Start group video call"
              >
                <Video className="size-5" />
              </button>
            </div>

            {/* Messages */}
<div
  className="flex-1 overflow-y-auto p-4 bg-base-100"
  style={{ paddingBottom: "80px" }}
>
                {loadingHistory ? (
                <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                  <span className="text-4xl">{selectedRoom?.emoji}</span>
                  <p className="text-sm">No messages yet — say hello! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg._id} message={msg} isOwn={msg.sender._id === authUser._id} />
                  ))}
                  {Object.keys(typingUsers).length > 0 && (
                    <div className="flex gap-2 mb-3 items-end">
                      <div className="flex gap-1 items-end">
                        <div className="size-2 rounded-full bg-base-400 animate-bounce" />
                        <div className="size-2 rounded-full bg-base-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="size-2 rounded-full bg-base-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                      <p className="text-xs opacity-40">Someone is typing…</p>
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
                  placeholder={`Message ${selectedRoom?.name || "room"}…`}
                  className="input input-bordered input-sm flex-1"
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <button onClick={handleSendMessage} disabled={!inputText.trim()} className="btn btn-primary btn-sm btn-circle">
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Room Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create a New Room</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Room Name</span></label>
                <input type="text" className="input input-bordered w-full" placeholder="e.g. Spanish Beginners" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Topic / Language</span></label>
                <input type="text" className="input input-bordered w-full" placeholder="e.g. spanish, french, general" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Emoji</span></label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button key={e} className={`btn btn-sm ${form.emoji === e ? "btn-primary" : "btn-ghost"}`} onClick={() => setForm({ ...form, emoji: e })}>{e}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={creating || !form.name || !form.topic} onClick={() => handleCreate(form)}>
                {creating ? <span className="loading loading-spinner loading-xs" /> : "Create Room"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;