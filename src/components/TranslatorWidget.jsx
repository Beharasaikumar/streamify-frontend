import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { translateText, transcribeAudio } from "../lib/api";
import { LANGUAGES } from "../constants";
import {
    Languages, X, Copy, ArrowRightLeft, Volume2,
    Loader2, Mic, MicOff, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

const TranslatorWidget = ({ compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [targetLang, setTargetLang] = useState("spanish");
    const [result, setResult] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [popupPos, setPopupPos] = useState({ bottom: 0, left: 0, width: 0 });

    const triggerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Calculate popup position — anchors to bottom of trigger, grows upward
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const popupWidth = compact
                ? Math.min(340, window.innerWidth - 16) // full-width friendly on mobile
                : Math.max(rect.width, 340);
            // For compact (mobile nav) mode, centre-align or left-clamp the popup
            let leftPos = compact
                ? Math.max(8, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 8))
                : rect.left;
            setPopupPos({
                bottom: window.innerHeight - rect.top + 8, // 8px gap above button
                left: leftPos,
                width: popupWidth,
            });
        }
    }, [isOpen, compact]);

    // Add this function inside TranslatorWidget component (after handleSwap)
    const handleSpeak = () => {
        if (!result) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(result);

        // Map your language names to BCP-47 language codes
        const LANG_CODES = {
            spanish: "es-ES",
            french: "fr-FR",
            japanese: "ja-JP",
            mandarin: "zh-CN",
            german: "de-DE",
            italian: "it-IT",
            korean: "ko-KR",
            portuguese: "pt-BR",
            arabic: "ar-SA",
            russian: "ru-RU",
            hindi: "hi-IN",
            telugu: "te-IN",
            marwari: "hi-IN", // Fallback to Hindi pronunciation for Marwari
            english: "en-US",
            dutch: "nl-NL",
            turkish: "tr-TR",
            polish: "pl-PL",
            swedish: "sv-SE",
            greek: "el-GR",
            hebrew: "he-IL",
            thai: "th-TH",
            vietnamese: "vi-VN",
            indonesian: "id-ID",
        };

        utterance.lang = LANG_CODES[targetLang.toLowerCase()] || "en-US";
        utterance.rate = 0.9;
        utterance.pitch = 1;

        window.speechSynthesis.speak(utterance);
    };

    // --- Translation ---
    const { mutate: doTranslate, isPending: translating } = useMutation({
        mutationFn: () => translateText(inputText, targetLang),
        onSuccess: (data) => setResult(data.translated),
        onError: () => toast.error("Translation failed. Check your Groq API key."),
    });

    // --- Transcription ---
    const { mutate: doTranscribe, isPending: transcribing } = useMutation({
        mutationFn: (blob) => transcribeAudio(blob),
        onSuccess: (data) => {
            setInputText(data.text);
            toast.success("Voice captured!");
        },
        onError: () => toast.error("Transcription failed."),
    });

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                doTranscribe(blob);
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch {
            toast.error("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result);
        toast.success("Copied!");
    };

    const handleSwap = () => {
        if (!result) return;
        setInputText(result);
        setResult("");
    };

    const popup = isOpen ? createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
            />

            {/* Floating widget — grows upward from trigger */}
            <div
                className="fixed z-50"
                style={{
                    bottom: popupPos.bottom,
                    left: popupPos.left,
                    width: popupPos.width,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glass card */}
                <div
                    className="rounded-2xl overflow-hidden border shadow-2xl"
                    style={{
                        borderColor: "rgba(255,255,255,0.1)",
                        background: "rgba(20, 20, 30, 0.75)",
                        backdropFilter: "blur(24px) saturate(180%)",
                        WebkitBackdropFilter: "blur(24px) saturate(180%)",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)",
                    }}
                >
                    {/* Subtle top shimmer line */}
                    <div
                        className="h-px w-full"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
                    />

                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div
                                className="size-7 rounded-lg flex items-center justify-center"
                                style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.3)" }}
                            >
                                <Languages className="size-3.5" style={{ color: "#a78bfa" }} />
                            </div>
                            <span className="font-semibold text-sm text-white">AI Translator</span>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}
                            >
                                Llama 3.3
                            </span>
                        </div>
                        <button
                            className="size-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>

                    <div className="p-4 space-y-3">
                        {/* Source label + char count */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                                Source text
                            </span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                                {inputText.length}/500
                            </span>
                        </div>

                        {/* Textarea with mic */}
                        <div className="relative">
                            <textarea
                                rows={3}
                                maxLength={500}
                                placeholder={
                                    isRecording ? "🎙 Listening..." :
                                        transcribing ? "Transcribing..." :
                                            "Type or speak something..."
                                }
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    if (result) setResult("");
                                }}
                                className="w-full text-sm resize-none rounded-xl px-3 py-2.5 outline-none transition-all"
                                style={{
                                    paddingRight: "2.75rem",
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.9)",
                                    caretColor: "#a78bfa",
                                    lineHeight: "1.6",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                            />

                            {/* Mic button */}
                            <button
                                className="absolute bottom-2.5 right-2.5 size-7 rounded-full flex items-center justify-center transition-all duration-200"
                                style={
                                    isRecording
                                        ? { background: "rgba(239,68,68,0.8)", color: "#fff", boxShadow: "0 0 12px rgba(239,68,68,0.5)" }
                                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                                }
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={transcribing}
                                title={isRecording ? "Stop recording" : "Speak to translate"}
                                onMouseEnter={(e) => {
                                    if (!isRecording) {
                                        e.currentTarget.style.background = "rgba(139,92,246,0.4)";
                                        e.currentTarget.style.color = "#fff";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isRecording) {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                        e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                                    }
                                }}
                            >
                                {transcribing ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : isRecording ? (
                                    <MicOff className="size-3.5" />
                                ) : (
                                    <Mic className="size-3.5" />
                                )}
                            </button>
                        </div>

                        {/* Recording hint */}
                        {isRecording && (
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="size-1.5 rounded-full animate-pulse"
                                    style={{ background: "#ef4444" }}
                                />
                                <span className="text-xs" style={{ color: "#fca5a5" }}>
                                    Recording — tap mic to stop
                                </span>
                            </div>
                        )}

                        {/* Language picker + Translate button */}
                        <div className="flex gap-2">
                            <select
                                value={targetLang}
                                onChange={(e) => {
                                    setTargetLang(e.target.value);
                                    if (result) setResult("");
                                }}
                                className="flex-1 text-sm rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer transition-all"
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.85)",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
                                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                            >
                                {LANGUAGES.map((lang) => (
                                    <option
                                        key={lang}
                                        value={lang.toLowerCase()}
                                        style={{ background: "#1a1a2e", color: "#fff" }}
                                    >
                                        {lang}
                                    </option>
                                ))}
                            </select>

                            <button
                                disabled={translating || !inputText.trim()}
                                onClick={() => doTranslate()}
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                                style={{
                                    background: translating || !inputText.trim()
                                        ? "rgba(139,92,246,0.3)"
                                        : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                    color: translating || !inputText.trim() ? "rgba(255,255,255,0.4)" : "#fff",
                                    border: "1px solid rgba(139,92,246,0.4)",
                                    boxShadow: translating || !inputText.trim() ? "none" : "0 4px 15px rgba(124,58,237,0.4)",
                                    cursor: translating || !inputText.trim() ? "not-allowed" : "pointer",
                                    minWidth: "110px",
                                    justifyContent: "center",
                                }}
                            >
                                {translating ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Translating
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft className="size-3.5" />
                                        Translate
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Result */}
                        {/* Result */}
                        {result && (
                            <>
                                <div
                                    className="h-px w-full"
                                    style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)" }}
                                />

                                <div
                                    className="rounded-xl p-3 space-y-2"
                                    style={{
                                        background: "rgba(139,92,246,0.1)",
                                        border: "1px solid rgba(139,92,246,0.2)",
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                                            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}
                                        >
                                            {targetLang}
                                        </span>
                                        <div className="flex gap-1">
                                            {/* ── Speak button ── */}
                                            <button
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                                                style={{ color: "rgba(255,255,255,0.45)" }}
                                                onClick={handleSpeak}
                                                title="Listen to pronunciation"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                                                }}
                                            >
                                                <Volume2 className="size-3" />
                                                Speak
                                            </button>

                                            <button
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                                                style={{ color: "rgba(255,255,255,0.45)" }}
                                                onClick={handleCopy}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                                                }}
                                            >
                                                <Copy className="size-3" />
                                                Copy
                                            </button>
                                            <button
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                                                style={{ color: "rgba(255,255,255,0.45)" }}
                                                onClick={handleSwap}
                                                title="Use as new input"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                                                }}
                                            >
                                                <ArrowRightLeft className="size-3" />
                                                Swap
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
                                        {result}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom shimmer line */}
                    <div
                        className="h-px w-full"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)" }}
                    />
                </div>

                {/* Small arrow pointing down to the trigger button */}
                <div
                    className="absolute -bottom-1.5 left-6"
                    style={{
                        width: 0, height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid rgba(255,255,255,0.08)",
                    }}
                />
            </div>
        </>,
        document.body
    ) : null;

    // Compact mode: icon-only button for mobile bottom nav
    if (compact) {
        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setIsOpen((o) => !o)}
                    className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-200
                        ${isOpen ? "text-primary" : "text-base-content/50 hover:text-base-content/80"}`}
                >
                    {isOpen && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                    <Languages className="size-5 transition-transform duration-200 hover:scale-105" />
                    <span className={`text-[10px] font-medium leading-none ${isOpen ? "opacity-100" : "opacity-60"}`}>
                        Translate
                    </span>
                </button>
                {popup}
            </>
        );
    }

    // Full mode: wide sidebar button
    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                style={
                    isOpen
                        ? { background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }
                        : { background: "transparent", border: "1px solid transparent", color: "inherit" }
                }
                onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "transparent";
                }}
            >
                <Languages className="size-5 opacity-70 shrink-0" />
                <span className="text-sm font-medium">AI Translator</span>
                <Sparkles className="size-3 ml-auto opacity-40" />
            </button>

            {popup}
        </>
    );
};

export default TranslatorWidget;