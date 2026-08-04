import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useChatContext } from "../context/ChatContext";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import { useSocket } from "../context/SocketContext";

import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";

import toast from "react-hot-toast";
import ChatLoader from "../components/ChatLoader";
import { ArrowLeft, Video, MoreVertical } from "lucide-react";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const { authUser } = useAuthUser();
  const { client, markAsRead } = useChatContext();
  const { onlineUsers } = useSocket();

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch friend info for the header
  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    staleTime: 1000 * 60 * 5,
  });

  const friend = friends?.find((f) => f._id === targetUserId);
  const isOnline = onlineUsers?.has(String(targetUserId));

  useEffect(() => {
    const initChannel = async () => {
      if (!client || !authUser || !targetUserId) return;

      try {
        const channelId = [authUser._id, targetUserId].sort().join("-");

        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();
        await currChannel.markRead();
        markAsRead();
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not load chat.");
      } finally {
        setLoading(false);
      }
    };

    initChannel();
  }, [client, authUser, targetUserId]);

  const handleVideoCall = () => {
    if (!channel) return;
    const callUrl = `${window.location.origin}/call/${channel.id}`;
    channel.sendMessage({
      text: `I've started a video call. Join me here: ${callUrl}`,
    });
    toast.success("Video call link sent!");
  };

  if (loading || !client || !channel) return <ChatLoader />;

  return (
    <div className="h-screen flex flex-col bg-base-100">

      {/* ── WhatsApp-style Chat Header ── */}
      <header className="bg-base-200 border-b border-base-300 flex items-center gap-3 px-2 py-2 sticky top-0 z-30 shrink-0 min-h-[60px]">

        {/* Back arrow */}
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-circle btn-sm shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Avatar with online indicator */}
        <div className="relative shrink-0">
          <img
            src={
              friend?.profilePic ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUserId}`
            }
            alt={friend?.fullName || "User"}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-base-300"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-success border-2 border-base-200" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {friend?.fullName || "Chat"}
          </p>
          <p className="text-xs opacity-50 leading-tight truncate">
            {isOnline
              ? "Online"
              : friend?.nativeLanguage
              ? `${friend.nativeLanguage}${friend.learningLanguage ? " → " + friend.learningLanguage : ""}`
              : "Offline"}
          </p>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleVideoCall}
            className="btn btn-ghost btn-circle btn-sm"
            title="Video call"
          >
            <Video className="size-5 text-primary" />
          </button>
          <button
            className="btn btn-ghost btn-circle btn-sm"
            title="More options"
          >
            <MoreVertical className="size-5 opacity-60" />
          </button>
        </div>
      </header>

      {/* ── Stream Chat Body ── */}
      <div className="flex-1 overflow-hidden">
        <Chat client={client}>
          <Channel channel={channel}>
            <Window>
              {/* No default ChannelHeader — we have our own above */}
              <MessageList />
              {/* Extra bottom padding on mobile for the bottom nav bar */}
              <div className="pb-16 lg:pb-0">
                <MessageInput focus />
              </div>
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </div>
  );
};

export default ChatPage;