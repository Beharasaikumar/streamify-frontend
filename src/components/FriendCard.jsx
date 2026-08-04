import { Link } from "react-router";
import { capitalize } from "../lib/utils";
import { LANGUAGE_TO_FLAG } from "../constants";

// Simple card used in HomePage etc. (not used in FriendsPage anymore)
const FriendCard = ({ friend }) => {
  return (
    <Link
      to={`/friends?friendId=${friend._id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-base-200 
        hover:bg-base-300/50 transition-colors duration-100 cursor-pointer"
    >
      <div className="relative shrink-0">
        <img
          src={
            friend.profilePic ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend._id}`
          }
          alt={friend.fullName}
          className="size-12 rounded-full object-cover bg-base-300"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{friend.fullName}</p>
        <p className="text-xs opacity-50 truncate mt-0.5">
          {capitalize(friend.nativeLanguage || "")} → {capitalize(friend.learningLanguage || "")}
        </p>
      </div>
    </Link>
  );
};

export default FriendCard;

export function getLanguageFlag(language) {
  if (!language) return null;
  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];
  if (!countryCode) return null;
  return (
    <img
      src={`https://flagcdn.com/24x18/${countryCode}.png`}
      alt={`${langLower} flag`}
      className="h-3 inline-block"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}