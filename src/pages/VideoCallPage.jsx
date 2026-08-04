import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useSocket } from "../context/SocketContext";
import useAuthUser from "../hooks/useAuthUser";
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertCircle, Clock } from "lucide-react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const STATE = {
  WAITING_ACCEPT: "waiting_accept",
  SETTING_UP:     "setting_up",
  CONNECTING:     "connecting",
  CONNECTED:      "connected",
  ENDED:          "ended",
  ERROR:          "error",
};

const VideoCallPage = () => {
  const { callId }   = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { authUser } = useAuthUser();

  const { socket, sendOffer, sendAnswer, sendIceCandidate, endCall } = useSocket();

  const recipientId = location.state?.recipientId ?? null;
  const isInitiator = location.state?.isInitiator ?? false;

  // ── refs ──────────────────────────────────────────────────
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const iceCandidateQueue = useRef([]);
  const remoteDescSet     = useRef(false);
  const offerQueued       = useRef(null); // stores offer if it arrives before PC is ready

  // ── state ─────────────────────────────────────────────────
  const [callState, setCallState] = useState(
    isInitiator ? STATE.WAITING_ACCEPT : STATE.SETTING_UP
  );
  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [duration, setDuration] = useState(0);
  const [error,    setError]    = useState(null);

  // ── Cleanup on unmount — always stop camera/mic ───────────
  // Runs whenever the component is destroyed: navigation, back button, tab close.
  // This guarantees the camera indicator in the browser always turns off.
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, []);

  // ── duration timer ────────────────────────────────────────
  useEffect(() => {
    if (callState !== STATE.CONNECTED) return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const fmt = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── create RTCPeerConnection ──────────────────────────────
  const createPC = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && recipientId) {
        sendIceCandidate(callId, candidate, recipientId);
      }
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setCallState(STATE.CONNECTED);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log("[ICE state]", s);
      if (s === "connected" || s === "completed") {
        setCallState(STATE.CONNECTED);
      }
      if (s === "failed") {
        // Try ICE restart
        if (isInitiator && pc.signalingState !== "closed") {
          pc.restartIce();
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [callId, recipientId, sendIceCandidate, isInitiator]);

  // ── get local media (idempotent) ──────────────────────────
  const getMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("[Media]", err);
      setError("Cannot access camera/microphone. Please allow permissions.");
      setCallState(STATE.ERROR);
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // INITIATOR flow:
  //   1. Get local media (preview while ringing)
  //   2. Wait for call:accepted → create PC + send offer
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitiator) return;
    getMedia(); // local preview while waiting
  }, [isInitiator, getMedia]);

  useEffect(() => {
    if (!socket || !isInitiator) return;

    const onAccepted = async ({ callId: cid }) => {
      if (cid !== callId) return;
      console.log("[Initiator] call:accepted → waiting for recipient ready");
      setCallState(STATE.CONNECTING);
      // Don't send offer yet — wait for recipient to signal "ready"
      // so their PeerConnection is fully set up before the offer arrives.
    };

    socket.on("call:accepted", onAccepted);
    return () => socket.off("call:accepted", onAccepted);
  }, [socket, isInitiator, callId]);

  // Initiator: recipient signals ready → NOW send the offer
  useEffect(() => {
    if (!socket || !isInitiator) return;

    const onRecipientReady = async ({ callId: cid }) => {
      if (cid !== callId) return;
      console.log("[Initiator] recipient ready → creating offer");

      let stream = localStreamRef.current;
      if (!stream) stream = await getMedia();
      if (!stream) return;

      const pc = createPC();
      stream.getTracks().forEach((t) => {
        if (!pc.getSenders().find((s) => s.track === t)) pc.addTrack(t, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(callId, offer, recipientId);
    };

    socket.on("call:recipient:ready", onRecipientReady);
    return () => socket.off("call:recipient:ready", onRecipientReady);
  }, [socket, isInitiator, callId, recipientId, sendOffer, createPC, getMedia]);

  // ─────────────────────────────────────────────────────────
  // RECIPIENT flow:
  //   1. Get local media + create PC
  //   2. Emit "recipient:ready" so initiator knows to send offer
  //   3. Receive offer → answer
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitiator || !socket) return;

    const setup = async () => {
      console.log("[Recipient] Setting up media + PC");
      const stream = await getMedia();
      if (!stream) return;

      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Signal to initiator that we're ready to receive the offer
      console.log("[Recipient] Signaling ready to", recipientId);
      socket.emit("call:recipient:ready", { callId, initiatorId: recipientId });

      // If offer already arrived before we were ready, process it now
      if (offerQueued.current) {
        await processOffer(pc, offerQueued.current);
        offerQueued.current = null;
      }
    };

    setup();
  }, [isInitiator, socket]);

  // ─────────────────────────────────────────────────────────
  // Process offer (shared helper used by recipient)
  // ─────────────────────────────────────────────────────────
  const processOffer = async (pc, { offer, senderId }) => {
    console.log("[Recipient] Processing offer from", senderId);
    setCallState(STATE.CONNECTING);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescSet.current = true;

    // Drain queued ICE candidates
    for (const c of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceCandidateQueue.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendAnswer(callId, answer, senderId);
  };

  // ── WebRTC: Offer received (RECIPIENT) ────────────────────
  useEffect(() => {
    const handler = async ({ detail: { callId: cid, offer, senderId } }) => {
      if (cid !== callId) return;
      console.log("[WebRTC] offer received");

      const pc = pcRef.current;
      if (!pc) {
        // PC not ready yet — queue the offer
        console.log("[WebRTC] PC not ready, queuing offer");
        offerQueued.current = { offer, senderId };
        return;
      }
      await processOffer(pc, { offer, senderId });
    };
    window.addEventListener("webrtc:offer", handler);
    return () => window.removeEventListener("webrtc:offer", handler);
  }, [callId, sendAnswer]);

  // ── WebRTC: Answer received (INITIATOR) ───────────────────
  useEffect(() => {
    const handler = async ({ detail: { callId: cid, answer } }) => {
      if (cid !== callId) return;
      console.log("[WebRTC] answer received");
      const pc = pcRef.current;
      if (!pc || pc.signalingState === "stable") return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      remoteDescSet.current = true;

      for (const c of iceCandidateQueue.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      iceCandidateQueue.current = [];
    };
    window.addEventListener("webrtc:answer", handler);
    return () => window.removeEventListener("webrtc:answer", handler);
  }, [callId]);

  // ── WebRTC: ICE candidates ────────────────────────────────
  useEffect(() => {
    const handler = async ({ detail: { callId: cid, candidate } }) => {
      if (cid !== callId) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (remoteDescSet.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        iceCandidateQueue.current.push(candidate);
      }
    };
    window.addEventListener("webrtc:ice-candidate", handler);
    return () => window.removeEventListener("webrtc:ice-candidate", handler);
  }, [callId]);

  // ── call:rejected / call:ended ────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onRejected = ({ callId: cid }) => { if (cid === callId) hangup(false); };
    const onEnded    = ({ callId: cid }) => { if (cid === callId) hangup(false); };
    socket.on("call:rejected", onRejected);
    socket.on("call:ended",    onEnded);
    return () => {
      socket.off("call:rejected", onRejected);
      socket.off("call:ended",    onEnded);
    };
  }, [socket, callId]);

  // ── Controls ──────────────────────────────────────────────
  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((v) => !v);
  };

  const hangup = useCallback((sendSignal = true) => {
    // Stop tracks immediately; null the ref so unmount cleanup skips double-stop
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (sendSignal && recipientId) endCall(callId, recipientId);
    setCallState(STATE.ENDED);
    setTimeout(() => navigate(-1), 800);
  }, [callId, recipientId, endCall, navigate]);

  // ── Status label ──────────────────────────────────────────
  const statusLabel = {
    [STATE.WAITING_ACCEPT]: "Ringing…",
    [STATE.SETTING_UP]:     "Setting up…",
    [STATE.CONNECTING]:     "Connecting…",
    [STATE.CONNECTED]:      fmt(duration),
    [STATE.ENDED]:          "Call ended",
    [STATE.ERROR]:          "Error",
  }[callState];

  if (callState === STATE.ERROR) {
    return (
      <div className="h-screen bg-neutral flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="size-12 text-error" />
        <p className="text-center text-neutral-content/70 max-w-sm text-sm">{error}</p>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  if (callState === STATE.ENDED) {
    return (
      <div className="h-screen bg-neutral flex flex-col items-center justify-center gap-3">
        <PhoneOff className="size-10 text-error opacity-60" />
        <p className="text-neutral-content/50 text-sm">Call ended</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral flex flex-col overflow-hidden">

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${
            callState === STATE.CONNECTED      ? "bg-success animate-pulse" :
            callState === STATE.WAITING_ACCEPT ? "bg-warning animate-pulse" :
            "bg-base-content/30 animate-pulse"
          }`} />
          <span className="text-sm text-neutral-content/70 font-mono">{statusLabel}</span>
        </div>
        {callState === STATE.WAITING_ACCEPT && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-content/40">
            <Clock className="size-3" /> Waiting for answer…
          </div>
        )}
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-black overflow-hidden">

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            callState === STATE.CONNECTED ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Waiting placeholder */}
        {callState !== STATE.CONNECTED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral">
            <div className="relative">
              {callState === STATE.WAITING_ACCEPT && (
                <span className="absolute inset-0 rounded-full bg-warning/20 animate-ping" />
              )}
              <div className={`relative size-24 rounded-full flex items-center justify-center ${
                callState === STATE.WAITING_ACCEPT
                  ? "bg-warning/10 border border-warning/20"
                  : "bg-base-200"
              }`}>
                <Video className={`size-10 ${
                  callState === STATE.WAITING_ACCEPT ? "text-warning/60" : "opacity-20"
                }`} />
              </div>
            </div>
            <p className="text-neutral-content/50 text-sm">{statusLabel}</p>
            <span className="loading loading-dots loading-md opacity-30" />
          </div>
        )}

        {/* Local PiP */}
        <div className="absolute bottom-4 right-4 w-36 md:w-48 aspect-video rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-neutral-focus">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!camOn ? "invisible" : ""}`}
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral">
              <VideoOff className="size-5 opacity-30 text-neutral-content" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-5 py-5 bg-black/50">
        <button
          onClick={toggleMic}
          className={`btn btn-circle btn-lg ${micOn ? "btn-ghost text-neutral-content" : "btn-error"}`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
        </button>

        <button
          onClick={() => hangup(true)}
          className="btn btn-circle btn-error"
          style={{ width: "3.5rem", height: "3.5rem" }}
          title="End call"
        >
          <PhoneOff className="size-6" />
        </button>

        <button
          onClick={toggleCam}
          className={`btn btn-circle btn-lg ${camOn ? "btn-ghost text-neutral-content" : "btn-error"}`}
          title={camOn ? "Stop camera" : "Start camera"}
        >
          {camOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;