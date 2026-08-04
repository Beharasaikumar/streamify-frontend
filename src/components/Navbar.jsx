import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, ShipWheelIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import { useSocket } from "../context/SocketContext";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const isChatPage = location.pathname?.startsWith("/chat");
  const isNonChatPage = !isChatPage;

  const { unreadCounts } = useSocket();

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

  const totalNotifications = dmUnreadTotal + friendReqCount;

  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full">

          {/* Logo — visible on mobile (sidebar hidden) or chat pages */}
          <div className="flex items-center">
            {(isNonChatPage) && (
              <Link to="/" className="flex items-center gap-2 lg:hidden">
                <ShipWheelIcon className="size-7 text-primary" />
                <span className="text-xl font-bold font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-wider">
                  Streamify
                </span>
              </Link>
            )}
            {isChatPage && (
              <Link to="/" className="flex items-center gap-2.5">
                <ShipWheelIcon className="size-9 text-primary" />
                <span className="text-3xl font-bold font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-wider">
                  Streamify
                </span>
              </Link>
            )}
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">

            {/* Notification bell */}
            <Link to="/notifications" className="relative p-1">
              <BellIcon className="size-5" />
              {totalNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 animate-pulse">
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              )}
            </Link>

            <ThemeSelector />

            {/* Avatar — links to profile on mobile */}
            <Link to="/profile" className="avatar">
              <div className="w-8 sm:w-9 rounded-full ring-2 ring-base-300 hover:ring-primary/50 transition-all">
                <img src={authUser?.profilePic} alt="User Avatar" />
              </div>
            </Link>

            <button className="btn btn-ghost btn-circle btn-sm sm:btn-md" onClick={logoutMutation}>
              <LogOutIcon className="h-5 w-5 text-base-content opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;