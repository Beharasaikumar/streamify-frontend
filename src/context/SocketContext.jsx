import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "../hooks/useAuthUser";
import { getUnreadCounts, getRooms } from "../lib/api";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { authUser } = useAuthUser();
  const [socket,          setSocket]          = useState(null);
  const [onlineUsers,     setOnlineUsers]     = useState(new Set());
  const [dmMessages,      setDmMessages]      = useState({});
  const [roomMessages,    setRoomMessages]    = useState({});
  const [typingUsers,     setTypingUsers]     = useState({});
  const [unreadCounts,    setUnreadCounts]    = useState({});
  const [roomUnreadCounts,setRoomUnreadCounts]= useState({});
  const [incomingCall,    setIncomingCall]    = useState(null);
  const [callSessions,    setCallSessions]    = useState({});

  const socketRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const activeDMUserIdRef = useRef(null);

  useEffect(() => {
    if (!authUser?._id) return;

    const rawUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin;
    let socketUrl = rawUrl;
    try {
      socketUrl = new URL(rawUrl).origin;
    } catch {
      socketUrl = rawUrl.replace(/\/api\/?$/, "");
    }

    const newSocket = io(socketUrl, {
      auth: { userId: authUser._id },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    getUnreadCounts()
      .then((data) => {
        setUnreadCounts(data.dmUnread || {});
      })
      .catch((err) => console.error("Failed to load unread counts", err));

    getRooms()
      .then((roomsList) => {
        let lastReadTimes = {};
        try {
          lastReadTimes = JSON.parse(localStorage.getItem("room_last_read_times") || "{}");
        } catch {}

        const initialRoomUnreads = {};
        roomsList.forEach((room) => {
          if (room.isJoined && room.lastMessageAt) {
            const lastRead = lastReadTimes[room.id];
            if (!lastRead || new Date(room.lastMessageAt) > new Date(lastRead)) {
              initialRoomUnreads[room.id] = 1;
            }
          }
        });
        setRoomUnreadCounts(initialRoomUnreads);
      })
      .catch((err) => console.error("Failed to load rooms for unreads:", err));

    // ── Connection ────────────────────────────────────────
    newSocket.on("connect", () => {
      console.log("[Socket] Connected:", newSocket.id);
    });
    newSocket.on("connect_error", (e) => console.error("[Socket] Error:", e));
    newSocket.on("disconnect", (reason)  => console.log("[Socket] Disconnected:", reason));

    // ── Online presence ───────────────────────────────────
    // Server sends the full list of online user IDs on connect
    newSocket.on("users:online", (userIds) => {
      setOnlineUsers(new Set(userIds.map(String)));
    });

    newSocket.on("user:online", ({ userId }) =>
      setOnlineUsers((prev) => new Set([...prev, String(userId)]))
    );
    newSocket.on("user:offline", ({ userId }) =>
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(String(userId));
        return n;
      })
    );

    // ── DM messages ───────────────────────────────────────
    newSocket.on("dm:message:new", (message) => {
      const { _id, sender, receiver, text, timestamp } = message;
      const senderIdStr = String(sender._id);
      const chatUserId = sender._id === authUser._id ? receiver._id : sender._id;
      setDmMessages((prev) => ({
        ...prev,
        [chatUserId]: [
          ...(prev[chatUserId] || []),
          { _id, sender, receiver, text, timestamp, isRead: false },
        ],
      }));
      if (sender._id !== authUser._id && senderIdStr !== activeDMUserIdRef.current) {
        setUnreadCounts((prev) => ({
          ...prev,
          [sender._id]: (prev[sender._id] || 0) + 1,
        }));
      }
    });

    newSocket.on("dm:user:typing", ({ userId, isTyping }) =>
      setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }))
    );

    newSocket.on("dm:message:read", ({ messageId }) => {
      setDmMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((uid) => {
          updated[uid] = updated[uid].map((m) =>
            m._id === messageId ? { ...m, isRead: true } : m
          );
        });
        return updated;
      });
    });

    newSocket.on("dm:messages:allRead", () =>
      setUnreadCounts((prev) => ({ ...prev }))
    );

    // ── Room messages ─────────────────────────────────────
    newSocket.on("room:message:new", (message) => {
      const roomId = message.room;

      // If we aren't currently viewing this room, and the message isn't sent by us, increment unread count!
      if (roomId !== activeRoomIdRef.current && message.sender?._id !== authUser._id) {
        setRoomUnreadCounts((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1,
        }));
      }

      setRoomMessages((prev) => {
        const existing = prev[roomId] || [];
        if (existing.some((m) => m._id === message._id)) return prev;
        return { ...prev, [roomId]: [...existing, message] };
      });
    });

    newSocket.on("room:user:typing", ({ roomId, userId, isTyping }) =>
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: { ...(prev[roomId] || {}), [userId]: isTyping },
      }))
    );

    newSocket.on("room:user:joined", ({ userId, memberCount }) =>
      console.log(`[Room] ${userId} joined — ${memberCount} members`)
    );
    newSocket.on("room:user:left", ({ userId, memberCount }) =>
      console.log(`[Room] ${userId} left — ${memberCount} members`)
    );

    // ── Call events ───────────────────────────────────────
    newSocket.on("call:incoming", ({ callId, initiatorId, initiatorName }) => {
      console.log("[Call] Incoming from", initiatorName, initiatorId);
      setIncomingCall({ callId, initiatorId, initiatorName });
      setCallSessions((prev) => ({
        ...prev,
        [callId]: { status: "ringing", initiator: initiatorId, timestamp: Date.now() },
      }));
    });

    newSocket.on("call:accepted", ({ callId }) => {
      console.log("[Call] Accepted", callId);
      setCallSessions((prev) => ({
        ...prev,
        [callId]: { ...prev[callId], status: "active" },
      }));
    });

    // Forwarded straight to VideoCallPage via socket — no state needed here
    // (VideoCallPage listens on socket.on("call:recipient:ready") directly)

    newSocket.on("call:rejected", ({ callId }) => {
      setIncomingCall(null);
      setCallSessions((prev) => { const n = { ...prev }; delete n[callId]; return n; });
      window.dispatchEvent(new CustomEvent("webrtc:call-ended", { detail: { callId } }));
    });

    newSocket.on("call:ended", ({ callId }) => {
      setIncomingCall(null);
      setCallSessions((prev) => { const n = { ...prev }; delete n[callId]; return n; });
      window.dispatchEvent(new CustomEvent("webrtc:call-ended", { detail: { callId } }));
    });

    // WebRTC relay events → dispatched as window CustomEvents
    // so VideoCallPage can listen without needing socket directly
    newSocket.on("call:offer:received", ({ callId, offer, senderId }) =>
      window.dispatchEvent(new CustomEvent("webrtc:offer", { detail: { callId, offer, senderId } }))
    );
    newSocket.on("call:answer:received", ({ callId, answer, senderId }) =>
      window.dispatchEvent(new CustomEvent("webrtc:answer", { detail: { callId, answer, senderId } }))
    );
    newSocket.on("call:ice-candidate:received", ({ callId, candidate, senderId }) =>
      window.dispatchEvent(new CustomEvent("webrtc:ice-candidate", { detail: { callId, candidate, senderId } }))
    );

    newSocket.on("error", ({ message }) => console.error("[Socket Error]", message));

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [authUser?._id]);

  // ── DM helpers ────────────────────────────────────────────
  const joinDM = (recipientId) => {
    activeDMUserIdRef.current = String(recipientId);
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[recipientId];
      return next;
    });
    socketRef.current?.emit("dm:join", { recipientId });
  };

  const leaveDM = (recipientId) => {
    if (!recipientId || activeDMUserIdRef.current === String(recipientId)) {
      activeDMUserIdRef.current = null;
    }
  };

  const sendDMMessage = (recipientId, text) =>
    socketRef.current?.emit("dm:message", { recipientId, text });

  const setDMTyping = (recipientId, isTyping) =>
    socketRef.current?.emit("dm:typing", { recipientId, isTyping });

  const getDMHistory = (recipientId, limit = 50, offset = 0) =>
    new Promise((resolve) => {
      if (!socketRef.current) return resolve({ messages: [], hasMore: false });
      const handler = ({ messages, hasMore }) => {
        socketRef.current.off("dm:history:loaded", handler);
        resolve({ messages, hasMore });
      };
      socketRef.current.on("dm:history:loaded", handler);
      socketRef.current.emit("dm:history", { recipientId, limit, offset });
    });

  // ── Room helpers ──────────────────────────────────────────
  const joinRoom = (roomId) => {
    activeRoomIdRef.current = roomId;
    setRoomUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });

    try {
      const times = JSON.parse(localStorage.getItem("room_last_read_times") || "{}");
      times[roomId] = new Date().toISOString();
      localStorage.setItem("room_last_read_times", JSON.stringify(times));
    } catch (e) {
      console.error("Failed to save room last read time:", e);
    }

    socketRef.current?.emit("room:join", { roomId });
  };

  const sendRoomMessage = (roomId, text) =>
    socketRef.current?.emit("room:message", { roomId, text });

  const setRoomTyping = (roomId, isTyping) =>
    socketRef.current?.emit("room:typing", { roomId, isTyping });

  const getRoomHistory = (roomId, limit = 50, offset = 0) =>
    new Promise((resolve) => {
      if (!socketRef.current) return resolve({ messages: [], hasMore: false });
      const handler = ({ messages, hasMore }) => {
        socketRef.current.off("room:history:loaded", handler);
        resolve({ messages, hasMore });
      };
      socketRef.current.on("room:history:loaded", handler);
      socketRef.current.emit("room:history", { roomId, limit, offset });
    });

  const leaveRoom = (roomId) => {
    if (activeRoomIdRef.current === roomId) {
      activeRoomIdRef.current = null;
    }
    socketRef.current?.emit("room:leave", { roomId });
  };

  // ── Call helpers ──────────────────────────────────────────
  /**
   * initiateCall — also sends initiatorName so the recipient
   * can display the caller's name in IncomingCallModal.
   */
  const initiateCall = (recipientId, callId, initiatorName) => {
    if (!socketRef.current) return;
    socketRef.current.emit("call:initiate", { recipientId, callId, initiatorName });
    setCallSessions((prev) => ({
      ...prev,
      [callId]: { status: "calling", recipient: recipientId, timestamp: Date.now() },
    }));
  };

  const acceptCall = (callId, initiatorId) => {
    socketRef.current?.emit("call:accept", { callId, recipientId: initiatorId });
    setIncomingCall(null); // dismiss the modal immediately on accept
  };

  const rejectCall = (callId) => {
    socketRef.current?.emit("call:reject", { callId });
    setIncomingCall(null);
  };

  const sendOffer = (callId, offer, recipientId) =>
    socketRef.current?.emit("call:offer", { callId, offer, recipientId });

  const sendAnswer = (callId, answer, recipientId) =>
    socketRef.current?.emit("call:answer", { callId, answer, recipientId });

  const sendIceCandidate = (callId, candidate, recipientId) =>
    socketRef.current?.emit("call:ice-candidate", { callId, candidate, recipientId });

  const endCall = (callId, recipientId) =>
    socketRef.current?.emit("call:end", { callId, recipientId });

  const value = {
    socket,
    onlineUsers,
    dmMessages,
    roomMessages,
    typingUsers,
    unreadCounts,
    setUnreadCounts,
    roomUnreadCounts,
    incomingCall,
    callSessions,
    // DM
    joinDM, leaveDM, sendDMMessage, setDMTyping, getDMHistory,
    // Room
    joinRoom, sendRoomMessage, setRoomTyping, getRoomHistory, leaveRoom,
    // Call
    initiateCall, acceptCall, rejectCall,
    sendOffer, sendAnswer, sendIceCandidate, endCall,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};