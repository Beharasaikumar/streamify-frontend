import { Link, useLocation } from "react-router";
import { BellIcon, HomeIcon, UserIcon, UsersIcon, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import TranslatorWidget from "./TranslatorWidget";

const MobileNav = () => {
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

  const navItems = [
    { to: "/", icon: HomeIcon, label: "Home", badge: 0 },
    { to: "/friends", icon: UserIcon, label: "Friends", badge: dmUnreadTotal },
    { to: "/rooms", icon: UsersIcon, label: "Rooms", badge: roomUnreadTotal },
    // { to: "/notifications", icon: BellIcon, label: "Alerts", badge: totalNotifications },
    { to: "/challenges", icon: Zap, label: "Challenges", badge: 0 },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-200/95 backdrop-blur-md border-t border-base-300">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive =
            to === "/" ? currentPath === "/" : currentPath.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-200 group
                ${isActive
                  ? "text-primary"
                  : "text-base-content/50 hover:text-base-content/80"
                }`}
            >
              {/* Active pill indicator at top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}

              <div className="relative">
                <Icon
                  className={`size-5 transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-105"
                  }`}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 animate-pulse">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-medium leading-none transition-all duration-200 ${
                  isActive ? "opacity-100" : "opacity-60"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* AI Translator — compact icon mode, popup appears above nav */}
        <TranslatorWidget compact />
      </div>
    </nav>
  );
};

export default MobileNav;
