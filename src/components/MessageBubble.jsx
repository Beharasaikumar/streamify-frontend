import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { formatDistanceToNow } from "date-fns";
import { translateText } from "../lib/api";

const MessageBubble = ({ message, isOwn }) => {
  const { authUser } = useAuthUser();
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const senderName = message.sender?.fullName || "Unknown";
  const senderAvatar = message.sender?.profilePic;
  const timestamp = new Date(message.timestamp || message.createdAt);

  const handleTranslateClick = async () => {
    if (translatedText) {
      setTranslatedText("");
      return;
    }

    setIsTranslating(true);
    try {
      const targetLang = isOwn
        ? (authUser?.learningLanguage || "english")
        : (authUser?.nativeLanguage || "english");

      const data = await translateText(message.text, targetLang);
      setTranslatedText(data.translated || "Translation unavailable");
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isOwn && (
        <img
          src={senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender?._id}`}
          alt={senderName}
          className="size-8 rounded-full object-cover flex-shrink-0"
        />
      )}

      {/* Message bubble */}
      <div className={`flex flex-col gap-1 max-w-xs ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name (group chats) */}
        {!isOwn && (
          <p className="text-xs font-medium opacity-60">{senderName}</p>
        )}

        {/* Text bubble */}
        <div
          className={`px-3 py-2 rounded-lg text-sm break-words ${
            isOwn
              ? "bg-primary text-primary-content rounded-br-none"
              : "bg-base-300 text-base-content rounded-bl-none"
          }`}
        >
          {message.text}
          {translatedText && (
            <div className="text-[11px] mt-1.5 pt-1.5 border-t border-current/20 opacity-90 font-medium">
              <span className="opacity-60 text-[9px] block font-mono uppercase tracking-wider mb-0.5">
                Translation ({isOwn ? authUser?.learningLanguage : authUser?.nativeLanguage}):
              </span>
              {translatedText}
            </div>
          )}
        </div>

        {/* Timestamp + Read receipt + Translate */}
        <div className="flex items-center gap-2 text-[10px] opacity-40">
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          {isOwn && message.isRead && (
            <span title="Read">✓✓</span>
          )}
          {isOwn && !message.isRead && (
            <span title="Sent">✓</span>
          )}

          <button
            onClick={handleTranslateClick}
            className="hover:underline hover:text-primary transition-colors focus:outline-none font-semibold flex items-center gap-1"
            disabled={isTranslating}
          >
            •
            {isTranslating ? (
              <span className="loading loading-spinner size-2.5" />
            ) : translatedText ? (
              "Original"
            ) : (
              "Translate"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;