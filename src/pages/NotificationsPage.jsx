import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, getFriendRequests, getUserFriends, getRooms } from "../lib/api";
import {
  BellIcon, ClockIcon, MessageSquareIcon,
  UserCheckIcon, MessageCircleIcon, UsersIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import NoNotificationsFound from "../components/NoNotificationsFound";
import { useSocket } from "../context/SocketContext";
import { Link } from "react-router";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { unreadCounts, roomUnreadCounts } = useSocket();

  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
  });

  const { mutate: acceptRequestMutation, isPending } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
       toast.success("Friend request accepted 🎉");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => {
      toast.error("Failed to accept request ❌");
    },
  });

  const unreadDMs = friends
    .filter((friend) => unreadCounts[friend._id] > 0)
    .map((friend) => ({
      channelId: friend._id,
      userId: friend._id,
      unreadCount: unreadCounts[friend._id],
      name: friend.fullName,
      image: friend.profilePic,
      lastMessage: "You have unread messages",
      lastTime: null,
    }));

  const unreadGroups = rooms
    .filter((room) => roomUnreadCounts[room.id] > 0)
    .map((room) => ({
      channelId: room.id,
      unreadCount: roomUnreadCounts[room.id],
      name: room.name,
      emoji: room.emoji,
      lastMessage: room.lastMessage || "New activity in this room",
      lastTime: room.lastMessageAt,
    }));

  const unreadChannels = { dms: unreadDMs, groups: unreadGroups };

  const incomingRequests = friendRequests?.incomingReqs || [];
  const acceptedRequests = friendRequests?.acceptedReqs || [];
  const hasAnything =
    incomingRequests.length > 0 ||
    acceptedRequests.length > 0 ||
    unreadChannels.dms.length > 0 ||
    unreadChannels.groups.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            {unreadChannels.dms.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircleIcon className="size-5 text-primary" />
                  Unread Messages
                  <span className="badge badge-primary ml-1">
                    {unreadChannels.dms.length}
                  </span>
                </h2>

                {unreadChannels.dms.map((ch) => (
                  <Link
                    to={`/friends?friendId=${ch.userId}`}
                    key={ch.channelId}
                    className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow block"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="size-11 rounded-full overflow-hidden bg-base-300">
                            {ch.image ? (
                              <img
                                src={ch.image}
                                alt={ch.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold opacity-50">
                                {ch.name[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-content">
                            {ch.unreadCount > 9 ? "9+" : ch.unreadCount}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{ch.name}</p>
                            {ch.lastTime && (
                              <span className="text-xs opacity-40 shrink-0 flex items-center gap-1">
                                <ClockIcon className="size-3" />
                                {new Date(ch.lastTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-55 truncate mt-0.5">
                            {ch.lastMessage}
                          </p>
                        </div>

                        <MessageSquareIcon className="size-4 opacity-30 shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {unreadChannels.groups.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UsersIcon className="size-5 text-secondary" />
                  Unread Room Messages
                  <span className="badge badge-secondary ml-1">
                    {unreadChannels.groups.length}
                  </span>
                </h2>

                {unreadChannels.groups.map((ch) => (
                  <Link
                    to={`/rooms/${ch.channelId}`}
                    key={ch.channelId}
                    className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow block"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="size-11 rounded-full bg-secondary/20 flex items-center justify-center text-xl">
                            {ch.emoji}
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-secondary-content">
                            {ch.unreadCount > 9 ? "9+" : ch.unreadCount}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{ch.name}</p>
                            {ch.lastTime && (
                              <span className="text-xs opacity-40 shrink-0 flex items-center gap-1">
                                <ClockIcon className="size-3" />
                                {new Date(ch.lastTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-55 truncate mt-0.5">
                            {ch.lastMessage}
                          </p>
                        </div>

                        <MessageSquareIcon className="size-4 opacity-30 shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {incomingRequests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCheckIcon className="size-5 text-primary" />
                  Friend Requests
                  <span className="badge badge-primary ml-1">
                    {incomingRequests.length}
                  </span>
                </h2>

                {incomingRequests.map((request) => (
                  <div
                    key={request._id}
                    className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-11 rounded-full overflow-hidden bg-base-300 shrink-0">
                            <img
                              src={request.sender.profilePic}
                              alt={request.sender.fullName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {request.sender.fullName}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="badge badge-secondary badge-sm">
                                Native: {request.sender.nativeLanguage}
                              </span>
                              <span className="badge badge-outline badge-sm">
                                Learning: {request.sender.learningLanguage}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => acceptRequestMutation(request._id)}
                          disabled={isPending}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {acceptedRequests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BellIcon className="size-5 text-success" />
                  New Connections
                </h2>

                {acceptedRequests
                  .filter((notification) => notification.recipient)
                  .map((notification) => (
                    <div key={notification._id} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-4">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-full overflow-hidden shrink-0">
                            <img
                              src={notification.recipient?.profilePic}
                              alt={notification.recipient?.fullName || "New friend"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">
                              {notification.recipient?.fullName || "Unknown user"}
                            </h3>
                            <p className="text-sm opacity-60 my-0.5">
                              {notification.recipient?.fullName || "Someone"} accepted your friend request
                            </p>
                            <p className="text-xs opacity-40 flex items-center gap-1">
                              <ClockIcon className="size-3" />
                              Recently
                            </p>
                          </div>
                          <div className="badge badge-success badge-sm gap-1">
                            <MessageSquareIcon className="size-3" />
                            New Friend
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </section>
            )}

            {!hasAnything && <NoNotificationsFound />}
          </>
        )}
      </div>
    </div>
  );
};
export default NotificationsPage;