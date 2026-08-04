import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { getRecommendedUsers, getOutgoingFriendReqs, sendFriendRequest } from "../lib/api";
import { LearnerCard } from "./HomePage";
import { Link } from "react-router";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const LearnersPage = () => {
    const queryClient = useQueryClient();
    const [userSearch, setUserSearch] = useState("");

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
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
    });

    const outgoingIds = new Set(outgoingFriendReqs.map((req) => req.recipient._id));

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

    if (loadingUsers) {
        return <div className="text-center py-10">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <Link to="/" className="btn btn-ghost btn-sm my-6">
                ← Back
            </Link>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold mb-4">All Learners</h2>

                {recommendedUsers.length > 0 && (
                    <label className="input input-bordered input-sm flex items-center gap-2 w-52 mb-4">
                        <Search className="size-3.5 opacity-40 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search learners…"
                            className="grow bg-transparent outline-none text-sm"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                        {userSearch && (
                            <button onClick={() => setUserSearch("")}>
                                <X className="size-3 opacity-40 hover:opacity-100" />
                            </button>
                        )}
                    </label>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                    <LearnerCard
                        key={user._id}
                        user={user}
                        hasRequestBeenSent={outgoingIds.has(user._id)}
                        isPending={isPending}
                        onSendRequest={() => sendRequestMutation(user._id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default LearnersPage;