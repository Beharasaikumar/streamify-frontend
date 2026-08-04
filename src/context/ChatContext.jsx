import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;
const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { authUser } = useAuthUser();
  const [client, setClient]           = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn:  getStreamToken,
    enabled:  !!authUser,
  });

  useEffect(() => {
    if (!authUser || !tokenData?.token) return;

    let chatClient;
    let cleanup;

    const init = async () => {
      try {
        chatClient = StreamChat.getInstance(STREAM_API_KEY);

        if (chatClient.userID && chatClient.userID !== authUser._id) {
          await chatClient.disconnectUser();
        }

        if (!chatClient.userID) {
          await chatClient.connectUser(
            {
              id:    authUser._id,
              name:  authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        setClient(chatClient);

        await chatClient.queryChannels(
          { members: { $in: [authUser._id] } },
          {},
          { watch: true, state: true, limit: 30 }
        );

        const { total_unread_count } = await chatClient.getUnreadCount(authUser._id);
        setUnreadCount(total_unread_count ?? 0);

        const handleEvent = async (event) => {
          if (
            event.type === "message.new" ||
            event.type === "notification.message_new" ||
            event.type === "notification.mark_read" ||
            event.type === "channel.read"
          ) {
            try {
              const { total_unread_count } = await chatClient.getUnreadCount(authUser._id);
              setUnreadCount(total_unread_count ?? 0);
            } catch {
              setUnreadCount(chatClient.countUnread());
            }
          }
        };

        chatClient.on(handleEvent);

        cleanup = () => {
          chatClient.off(handleEvent);
        };
      } catch (error) {
        console.error("Failed to initialize Stream Chat client:", error);
      }
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [authUser, tokenData]);

  const markAsRead = () => setUnreadCount(0);

  return (
    <ChatContext.Provider value={{ client, unreadCount, markAsRead }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);