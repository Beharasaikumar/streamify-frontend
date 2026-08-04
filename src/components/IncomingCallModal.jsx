import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useSocket } from "../context/SocketContext";
import { Phone, PhoneOff, Video } from "lucide-react";

const IncomingCallModal = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { incomingCall, acceptCall, rejectCall } = useSocket();
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Don't render at all when the user is already inside a video-call page
  const onCallPage = location.pathname.startsWith("/video-call");

  // ── Ringtone ──────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall || onCallPage) {
      clearInterval(intervalRef.current);
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
      return;
    }

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const ring = () => {
        try {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 440;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        } catch {}
      };

      ring();
      intervalRef.current = setInterval(ring, 1800);
    } catch {}

    return () => {
      clearInterval(intervalRef.current);
      try { audioCtxRef.current?.close(); } catch {}
    };
  }, [incomingCall?.callId, onCallPage]);

  // Not visible when already on a call page or no incoming call
  if (!incomingCall || onCallPage) return null;

  const { callId, initiatorId, initiatorName } = incomingCall;

  const handleAccept = () => {
    // acceptCall already sets incomingCall to null in SocketContext
    acceptCall(callId, initiatorId);
    navigate(`/video-call/${callId}`, {
      state: { recipientId: initiatorId, isInitiator: false },
    });
  };

  const handleReject = () => {
    rejectCall(callId); // also sets incomingCall to null
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 card bg-base-100 shadow-2xl w-full max-w-xs border border-base-300">
        <div className="card-body items-center text-center gap-5 py-8">

          {/* Pulsing avatar ring */}
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-success/25 animate-ping" />
            <div className="relative size-20 rounded-full bg-success/15 border border-success/20 flex items-center justify-center">
              <Video className="size-9 text-success" />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1">
              Incoming video call
            </p>
            <h2 className="text-xl font-bold">{initiatorName || "Someone"}</h2>
          </div>

          {/* Decline / Accept */}
          <div className="flex gap-8 mt-1">
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={handleReject} className="btn btn-circle btn-lg btn-error">
                <PhoneOff className="size-6" />
              </button>
              <span className="text-xs opacity-60">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button onClick={handleAccept} className="btn btn-circle btn-lg btn-success">
                <Phone className="size-6" />
              </button>
              <span className="text-xs opacity-60">Accept</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;