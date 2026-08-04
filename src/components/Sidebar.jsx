import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, HomeIcon, ShipWheelIcon, UserIcon, UsersIcon, Zap, SettingsIcon } from "lucide-react";
import TranslatorWidget from "./TranslatorWidget";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import { useSocket } from "../context/SocketContext";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;
  const { unreadCounts, roomUnreadCounts } = useSocket();

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const friendReqCount = friendRequests?.incomingReqs?.length || 0;

  const dmUnreadTotal = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const roomUnreadTotal = Object.values(roomUnreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalNotifications = dmUnreadTotal + roomUnreadTotal + friendReqCount;

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/" className="flex items-center gap-2.5">
          <ShipWheelIcon className="size-9 text-primary" />
          <span className="text-3xl font-bold font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-wider">
            Streamify
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/" ? "btn-active" : ""
            }`}
        >
          <HomeIcon className="size-5 opacity-70" />
          <span>Home</span>
        </Link>

        <Link
          to="/friends"
          className={`btn relative btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/friends" ? "btn-active" : ""
            }`}
        >
          <UserIcon className="size-5 opacity-70" />
          {dmUnreadTotal > 0 && (
            <span className="absolute right-3 top-3.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
              {dmUnreadTotal}
            </span>
          )}
          <span>Friends</span>
        </Link>

        <Link
          to="/rooms"
          className={`btn relative btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/rooms" ? "btn-active" : ""
            }`}
        >
          <UsersIcon className="size-5 opacity-70" />
          {roomUnreadTotal > 0 && (
            <span className="absolute right-3 top-3.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
              {roomUnreadTotal}
            </span>
          )}
          <span>Rooms</span>
        </Link>

        <Link
          to="/notifications"
          className={`btn relative btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/notifications" ? "btn-active" : ""
            }`}
        >
          <BellIcon className="size-5 opacity-70" />

          {totalNotifications > 0 && (
            <span className="absolute right-3 top-3.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
              {totalNotifications > 99 ? "99+" : totalNotifications}
            </span>
          )}

          <span>Notifications</span>
        </Link>

        <Link
          to="/challenges"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/challenges" ? "btn-active" : ""
            }`}
        >
          <Zap className="size-5 opacity-70" />
          <span>Daily Challenges</span>
        </Link>

      </nav>

      <div className="px-4 pb-2">
        <TranslatorWidget />
      </div>

      <Link
        to="/profile"
        className="p-4 border-t border-base-300 mt-auto hover:bg-base-300/30 transition-all duration-200 block group"
        title="Edit Profile"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="avatar">
              <div className="w-10 rounded-full border border-base-300 group-hover:border-primary/45 transition-all">
                <img
                  src={authUser?.profilePic || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
                  alt="User Avatar"
                />
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {authUser?.fullName}
              </p>
              <p className="text-[10px] opacity-50 flex items-center gap-1">
                Click to edit profile
              </p>
            </div>
          </div>
          <SettingsIcon className="size-4 opacity-40 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-300 text-base-content/70" />
        </div>
      </Link>

    </aside>
  );
};

export default Sidebar;