import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { getRooms, createRoom, joinRoom, deleteRoom } from "../lib/api";
import { UsersIcon, MessageCircleIcon, ArrowRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

const EMOJIS = ["💬","🇪🇸","🇫🇷","🇯🇵","🇬🇧","🇨🇳","🇩🇪","🇰🇷","🇮🇹","🇧🇷","🎯","📚"];

const RoomsPage = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { roomUnreadCounts } = useSocket();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", topic: "", emoji: "💬" });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn:  getRooms,
  });

  const { mutate: handleCreate, isPending: creating } = useMutation({
    mutationFn: createRoom,
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowModal(false);
      setForm({ name: "", topic: "", emoji: "💬" });
      // Go straight into the new room chat 
      navigate(`/rooms/${newRoom.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create room"),
  });

  const { mutate: handleDelete } = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete room"),
  });

  const { mutate: handleJoinRoom, isPending: joining } = useMutation({
    mutationFn: joinRoom,
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate(`/rooms/${roomId}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to join room"),
  });

  const handleJoinClick = (room) => {
    if (room.isJoined) {
      navigate(`/rooms/${room.id}`);
    } else {
      handleJoinRoom(room.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Language Rooms</h1>
            <p className="opacity-70 mt-1">Join a public room to practice with learners worldwide</p>
          </div>
          <button className="btn btn-primary gap-2" onClick={() => setShowModal(true)}>
            <PlusIcon className="size-4" /> New Room
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="card bg-base-200 p-8 text-center">
            <p className="text-lg font-semibold">No rooms yet</p>
            <p className="opacity-70 mt-1">Be the first to create a language room!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const unreadCount = roomUnreadCounts[room.id] || 0;
                return (
                  <div key={room.id} className="card bg-base-200 hover:shadow-lg transition-all duration-300">
                    <div className="card-body p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <span className="text-3xl">{room.emoji}</span>
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-extrabold shadow-sm animate-pulse">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">{room.name}</h3>
                        <span className="badge badge-outline badge-sm capitalize">{room.topic}</span>
                      </div>
                    </div>
                    {/* Delete button — only for the room creator */}
                    {room.createdBy?.toString() === authUser?._id?.toString() && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }}
                        title="Delete room"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {room.lastMessage && (
                    <p className="text-sm opacity-60 line-clamp-1 flex items-center gap-1">
                      <MessageCircleIcon className="size-3 shrink-0" />
                      {room.lastMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs opacity-60">
                      <UsersIcon className="size-3" />
                      <span>{room.memberCount} members</span>
                    </div>
                    <button
                      className={`btn btn-sm gap-1 ${room.isJoined ? "btn-secondary" : "btn-primary"}`}
                      onClick={() => handleJoinClick(room)}
                      disabled={joining}
                    >
                      {joining ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : room.isJoined ? (
                        <>Enter <ArrowRightIcon className="size-3" /></>
                      ) : (
                        <>Join <ArrowRightIcon className="size-3" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
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
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g. Spanish Beginners"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Topic / Language</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g. spanish, french, general"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Emoji</span></label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      className={`btn btn-sm ${form.emoji === e ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setForm({ ...form, emoji: e })}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={creating || !form.name || !form.topic}
                onClick={() => handleCreate(form)}
              >
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

export default RoomsPage;