import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  getOutgoingFriendReqs, getRecommendedUsers,
  getUserFriends, sendFriendRequest,
} from "../lib/api";
import FriendCard from "../components/FriendCard";
import { Link } from "react-router";
import {
  CheckCircle, MapPin, UserPlus, Users,
  Search, X, MessageCircle,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { capitalize } from "../lib/utils";
import { getLanguageFlag } from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";

const HomePage = () => {
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const [friendSearch, setFriendSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");

const { data: friends = [], isLoading: loadingFriends } = useQuery({
  queryKey: ["friends"],
  queryFn: getUserFriends,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
});
const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
  queryKey: ["users"],
  queryFn: getRecommendedUsers,
  staleTime: 1000 * 60 * 10,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
});
const { data: outgoingFriendReqs = [] } = useQuery({
  queryKey: ["outgoingFriendReqs"],
  queryFn: getOutgoingFriendReqs,
  staleTime: 1000 * 60 * 10,
  cacheTime: 1000 * 60 * 30,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: false,
});

const { mutate: sendRequestMutation, isPending } = useMutation({
  mutationFn: sendFriendRequest,
  onSuccess: () => {
    toast.success("Friend request sent ✅");
    queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
  },
  onError: (error) => {
    toast.error(error?.response?.data?.message || "Failed to send request ❌");
  },
});

  useEffect(() => {
    const ids = new Set();
    outgoingFriendReqs?.forEach((req) => ids.add(req.recipient._id));
    setOutgoingRequestsIds(ids);
  }, [outgoingFriendReqs]);

  const friendLanguages = useMemo(() => {
    const langs = new Set();
    friends.forEach((f) => {
      if (f.nativeLanguage) langs.add(f.nativeLanguage.toLowerCase());
      if (f.learningLanguage) langs.add(f.learningLanguage.toLowerCase());
    });
    return Array.from(langs).sort();
  }, [friends]);

  const filteredFriends = useMemo(() => friends.filter((f) => {
    const q = friendSearch.toLowerCase();
    const matchSearch = !q ||
      f.fullName.toLowerCase().includes(q) ||
      f.nativeLanguage?.toLowerCase().includes(q) ||
      f.learningLanguage?.toLowerCase().includes(q);
    const matchLang = langFilter === "all" ||
      f.nativeLanguage?.toLowerCase() === langFilter ||
      f.learningLanguage?.toLowerCase() === langFilter;
    return matchSearch && matchLang;
  }), [friends, friendSearch, langFilter]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return recommendedUsers;
    const q = userSearch.toLowerCase();
    return recommendedUsers.filter((u) =>
      u.fullName.toLowerCase().includes(q) ||
      u.nativeLanguage?.toLowerCase().includes(q) ||
      u.learningLanguage?.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q)
    );
  }, [recommendedUsers, userSearch]);

  const limitedUsers = filteredUsers.slice(0, 3);

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-6xl mx-auto">

<section>
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <h2 className="text-xl font-bold tracking-tight">Your Friends</h2>
      {friends.length > 0 && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
          {friends.length}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <Link to="/notifications" className="btn btn-ghost btn-sm gap-2 opacity-70 hover:opacity-100">
        <Users className="size-4" />
        Requests
      </Link>
      {friends.length > 0 && (
        <Link to="/friends" className="btn btn-ghost btn-sm gap-2 opacity-70 hover:opacity-100">
          View All
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  </div>

  {loadingFriends ? (
    <div className="flex justify-center py-8">
      <span className="loading loading-spinner loading-md" />
    </div>
  ) : friends.length === 0 ? (
    <NoFriendsFound />
  ) : (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {friends.slice(0, 8).map((friend) => (
        <FriendAvatarChip key={friend._id} friend={friend} />
      ))}
      {friends.length > 8 && (
        <Link
          to="/friends"
          className="shrink-0 flex flex-col items-center justify-center gap-1
            w-16 h-20 rounded-2xl bg-base-200 border border-base-300
            hover:border-primary/30 transition-all text-xs opacity-60 hover:opacity-100"
        >
          <span className="font-bold text-sm">+{friends.length - 8}</span>
          <span>more</span>
        </Link>
      )}
    </div>
  )}
</section>

      <div className="border-t border-base-300/60" />

      {/* ── MEET NEW LEARNERS ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Meet New Learners</h2>
            <p className="text-sm opacity-45 mt-0.5">
              Matched to your language profile
            </p>
          </div>


        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : recommendedUsers.length === 0 ? (
          <div className="rounded-2xl bg-base-200 p-8 text-center">
            <p className="font-medium mb-1">No recommendations yet</p>
            <p className="text-sm opacity-50">Check back later for new language partners!</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl bg-base-200 p-6 text-center">
            <p className="text-sm opacity-50">No learners match "{userSearch}".</p>
            <button className="btn btn-ghost btn-xs mt-2" onClick={() => setUserSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {limitedUsers.map((user) => (
                <LearnerCard
                  key={user._id}
                  user={user}
                  hasRequestBeenSent={outgoingRequestsIds.has(user._id)}
                  isPending={isPending}
                  onSendRequest={() => sendRequestMutation(user._id)}
                />
              ))}
            </div>
            {filteredUsers.length > 3 && (
              <div className="flex justify-center mt-4">
                <Link to="/learners" className="btn btn-outline btn-sm">
                  View More
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

// const FriendTile = ({ friend }) => (
//   <div
//     className="group flex flex-col items-center gap-2 p-6 rounded-2xl
// bg-base-200 border border-transparent
// hover:border-base-300 hover:bg-base-300/50
// transition-all duration-150 cursor-pointer select-none h-[200px] w-full"
//   >

//     <div className="relative mt-1 h-full">
//       <img
//         src={friend.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
//         alt={friend.fullName}
//         className="size-12 rounded-full object-cover ring-2 ring-base-300
//           group-hover:ring-primary/30 transition-all duration-150"
//       />

//       {/* <div
//         className="absolute h-[50px] inset-0 rounded-full flex items-center justify-center
//           bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
//       >
//         <MessageCircle className="size-4 h-full text-white" />
//       </div> */}
//     </div>

//     <div className="text-center w-full h-full">
//       <p className="text-sm font-semibold truncate leading-tight">{friend.fullName}</p>
//       <p className="text-sm opacity-40 truncate mt-3.5 flex items-center justify-center gap-0.5">
//         {getLanguageFlag(friend.nativeLanguage)}
//         <span>{capitalize(friend.nativeLanguage)}</span>
//         <span className="opacity-60 mx-0.5">→</span>
//         <span>{capitalize(friend.learningLanguage)}</span>
//       </p>
//     </div>

//     <Link to={`/friends?friendId=${friend._id}`} className="btn btn-outline w-full">
//       Message
//     </Link>
//   </div>
// );

export const FriendAvatarChip = ({ friend }) => (
  <Link
    to={`/friends?friendId=${friend._id}`}
    className="group shrink-0 flex flex-col items-center gap-1.5 w-16
      cursor-pointer select-none"
  >
    <div className="relative">
      <img
        src={friend.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
        alt={friend.fullName}
        className="size-12 rounded-full object-cover ring-2 ring-base-300
          group-hover:ring-primary/50 transition-all duration-150"
      />
    </div>
    <p className="text-xs font-medium truncate w-full text-center leading-tight opacity-80">
      {friend.fullName.split(" ")[0]}
    </p>
  </Link>
);

export const LearnerCard = ({ user, hasRequestBeenSent, isPending, onSendRequest }) => (
  <div
    className="group rounded-2xl bg-base-200 border border-base-300/50
      hover:border-base-300 hover:shadow-sm
      transition-all duration-150 overflow-hidden"
  >

    <div className="p-4 pb-3 flex items-center gap-3">
      <img
        src={user.profilePic}
        alt={user.fullName}
        className="size-11 rounded-full object-cover ring-2 ring-base-300 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate leading-tight">{user.fullName}</p>
        {user.location && (
          <p className="text-xs opacity-45 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="size-2.5 shrink-0" />
            {user.location}
          </p>
        )}
      </div>
    </div>

    {/* Language badges */}
    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
      <span className="badge badge-secondary badge-sm gap-1">
        {getLanguageFlag(user.nativeLanguage)}
        {capitalize(user.nativeLanguage)}
      </span>
      <span className="badge badge-outline badge-sm gap-1">
        {getLanguageFlag(user.learningLanguage)}
        {capitalize(user.learningLanguage)}
      </span>
    </div>

    {/* Bio */}
    {user.bio && (
      <div className="px-4 pb-3">
        <p className="text-xs opacity-50 line-clamp-2 leading-relaxed">{user.bio}</p>
      </div>
    )}

    {/* Divider + action */}
    <div className="border-t border-base-300/50 px-4 py-3">
      <button
        className={`btn btn-sm w-full gap-1.5 ${hasRequestBeenSent
          ? "bg-green-500 text-white hover:bg-green-600 cursor-default"
          : "btn-primary"
          }`}
        onClick={onSendRequest}
        disabled={hasRequestBeenSent || isPending}
      >
        {hasRequestBeenSent ? (
          <><CheckCircle className="size-4" /> Request Sent</>
        ) : (
          <><UserPlus className="size-3.5" /> Connect</>
        )}
      </button>
    </div>
  </div>
);

export default HomePage;