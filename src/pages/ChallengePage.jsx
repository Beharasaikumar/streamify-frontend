import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getTodaysChallenges,
    submitChallengeAnswer,
    refreshChallenges,
} from "../lib/api";
import {
    Zap, BookOpen, Mic, CheckCircle, XCircle,
    RefreshCw, Trophy, Loader2, ChevronRight,
    Lightbulb, Star,
} from "lucide-react";
import toast from "react-hot-toast";

const TYPE_CONFIG = {
    translate: {
        icon: BookOpen,
        label: "Translate",
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        badge: "badge-info",
    },
    vocab: {
        icon: Zap,
        label: "Vocabulary",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        badge: "badge-warning",
    },
    speaking: {
        icon: Mic,
        label: "Speaking",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        badge: "badge-success",
    },
};

export default function ChallengePage() {
    const queryClient = useQueryClient();
    const [activeIdx, setActiveIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [feedback, setFeedback] = useState({});
    const [showHint, setShowHint] = useState({});

    const { data: doc, isLoading, error } = useQuery({
        queryKey: ["todaysChallenges"],
        queryFn: getTodaysChallenges,
        staleTime: 5 * 60 * 1000,
    });

    const { mutate: submit, isPending: submitting } = useMutation({
        mutationFn: ({ challengeId, idx, answer }) =>
            submitChallengeAnswer(challengeId, idx, answer),
        onSuccess: (result, { idx }) => {
            setFeedback((f) => ({ ...f, [idx]: result }));
            queryClient.invalidateQueries({ queryKey: ["todaysChallenges"] });
            if (result.allComplete) toast.success("All challenges complete! 🎉");
        },
        onError: () => toast.error("Failed to submit. Try again."),
    });

    const { mutate: doRefresh, isPending: refreshing } = useMutation({
        mutationFn: refreshChallenges,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["todaysChallenges"] });
            setAnswers({});
            setFeedback({});
            setShowHint({});
            setActiveIdx(0);
            toast.success("New challenges generated!");
        },
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center space-y-3">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-sm opacity-60">Generating your daily challenges...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="card bg-base-200 p-8 text-center max-w-sm">
                <p className="font-semibold mb-2">Couldn't load challenges</p>
                <p className="text-sm opacity-60 mb-4">{error.message}</p>
                <button className="btn btn-primary btn-sm" onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["todaysChallenges"] })
                }>Try again</button>
            </div>
        </div>
    );

    const challenges = doc?.challenges || [];
    const totalScore = doc?.score || 0;
    const allComplete = doc?.completed;
    const completed = challenges.filter((c) => c.completed).length;
    const progress = challenges.length ? (completed / challenges.length) * 100 : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-16 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        Daily Challenges
                        <span className="text-2xl">⚡</span>
                    </h1>
                    <p className="opacity-60 mt-1 text-sm capitalize">
                        {doc?.language} • {new Date().toLocaleDateString("en-US", {
                            weekday: "long", month: "long", day: "numeric"
                        })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Score */}
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <Star className="size-4 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-lg">{totalScore}</span>
                        </div>
                        <p className="text-xs opacity-50">points</p>
                    </div>

                    {/* Refresh */}
                    <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => doRefresh()}
                        disabled={refreshing}
                        title="Get new challenges"
                    >
                        <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-xs opacity-50 mb-1.5">
                    <span>{completed}/{challenges.length} completed</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* All complete banner */}
            {allComplete && (
                <div className="card bg-primary/10 border border-primary/20 mb-6">
                    <div className="card-body p-5 flex-row items-center gap-4">
                        <Trophy className="size-10 text-amber-400 shrink-0" />
                        <div>
                            <h3 className="font-bold text-lg">All done for today! 🎉</h3>
                            <p className="text-sm opacity-70">
                                You scored <strong>{totalScore} points</strong>. Come back tomorrow for new challenges!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge tabs */}
            <div className="flex gap-2 mb-4">
                {challenges.map((c, idx) => {
                    const cfg = TYPE_CONFIG[c.type];
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-200 border
                ${activeIdx === idx
                                    ? `${cfg.bg} ${cfg.color}`
                                    : "border-transparent hover:bg-base-200 opacity-60 hover:opacity-100"
                                }
              `}
                        >
                            {c.completed ? (
                                c.correct
                                    ? <CheckCircle className="size-4 text-success" />
                                    : <XCircle className="size-4 text-error" />
                            ) : (
                                <Icon className="size-4" />
                            )}
                            {cfg.label}
                        </button>
                    );
                })}
            </div>

            {/* Active challenge card */}
            {challenges[activeIdx] && (
                <ChallengeCard
                    challenge={challenges[activeIdx]}
                    idx={activeIdx}
                    docId={doc._id}
                    answer={answers[activeIdx] || ""}
                    setAnswer={(val) => setAnswers((a) => ({ ...a, [activeIdx]: val }))}
                    fb={feedback[activeIdx]}
                    showHint={showHint[activeIdx]}
                    setShowHint={(v) => setShowHint((h) => ({ ...h, [activeIdx]: v }))}
                    onSubmit={(ans) =>
                        submit({ challengeId: doc._id, idx: activeIdx, answer: ans })
                    }
                    submitting={submitting}
                    onNext={() => setActiveIdx((i) => Math.min(i + 1, challenges.length - 1))}
                />
            )}
        </div>
    );
}

// ─── Individual Challenge Card ──────────────────────────────

function ChallengeCard({
    challenge, idx, answer, setAnswer,
    fb, showHint, setShowHint,
    onSubmit, submitting, onNext,
}) {
    const cfg = TYPE_CONFIG[challenge.type];
    const Icon = cfg.icon;
    const done = challenge.completed || !!fb;

    const handleSubmit = () => {
        if (!answer.trim()) return toast.error("Please enter an answer first.");
        onSubmit(answer.trim());
    };

    return (
        <div className={`card border ${cfg.bg} transition-all duration-300`}>
            <div className="card-body p-5 sm:p-6 space-y-4">

                {/* Type badge */}
                <div className="flex items-center gap-2">
                    <Icon className={`size-5 ${cfg.color}`} />
                    <span className={`badge ${cfg.badge} badge-sm`}>{cfg.label}</span>
                    {done && (
                        challenge.correct || challenge.type === "speaking"
                            ? <span className="badge badge-success badge-sm ml-auto">+{challenge.type === "translate" ? 20 : challenge.type === "vocab" ? 15 : 10} pts</span>
                            : <span className="badge badge-error badge-sm ml-auto">Incorrect</span>
                    )}
                </div>

                {/* Prompt */}
                <p className="text-base leading-relaxed font-medium">{challenge.prompt}</p>

                {/* Hint */}
                {challenge.hint && (
                    <div>
                        {!showHint ? (
                            <button
                                className="btn btn-ghost btn-xs gap-1 opacity-60"
                                onClick={() => setShowHint(true)}
                            >
                                <Lightbulb className="size-3" /> Show hint
                            </button>
                        ) : (
                            <div className="flex items-start gap-2 bg-base-200 rounded-lg px-3 py-2">
                                <Lightbulb className="size-3.5 mt-0.5 opacity-50 shrink-0" />
                                <p className="text-xs opacity-70">{challenge.hint}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Input — vocab = multiple choice, others = text */}
                {challenge.type === "vocab" && challenge.options?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {challenge.options.map((opt, i) => {
                            const isSelected = answer === opt;
                            const isCorrect = done && opt === challenge.answer;
                            const isWrong = done && isSelected && !isCorrect;
                            return (
                                <button
                                    key={i}
                                    onClick={() => !done && setAnswer(opt)}
                                    disabled={done}
                                    className={`
                    px-4 py-3 rounded-xl text-sm text-left border transition-all duration-200
                    ${isCorrect ? "border-success bg-success/10 text-success font-medium" :
                                            isWrong ? "border-error bg-error/10 text-error" :
                                                isSelected ? "border-primary bg-primary/10" :
                                                    "border-base-300 hover:border-base-content/30 bg-base-200/50"
                                        }
                  `}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <textarea
                        className="textarea textarea-bordered w-full text-sm resize-none"
                        rows={challenge.type === "speaking" ? 4 : 2}
                        placeholder={
                            challenge.type === "translate" ? "Type your translation here..."
                                : challenge.type === "speaking" ? "Write your spoken response here (or describe what you'd say)..."
                                    : "Your answer..."
                        }
                        value={answer}
                        onChange={(e) => !done && setAnswer(e.target.value)}
                        disabled={done}
                    />
                )}

                {/* Feedback */}
                {(fb || (done && challenge.feedback)) && (
                    <div className={`
            flex items-start gap-2.5 rounded-xl p-3 border text-sm
            ${challenge.correct || challenge.type === "speaking"
                            ? "bg-success/10 border-success/20 text-success"
                            : "bg-error/10 border-error/20 text-error"
                        }
          `}>
                        {challenge.correct || challenge.type === "speaking"
                            ? <CheckCircle className="size-4 mt-0.5 shrink-0" />
                            : <XCircle className="size-4 mt-0.5 shrink-0" />
                        }
                        <div className="space-y-1">
                            <p>{fb?.feedback || challenge.feedback}</p>
                            {!challenge.correct && challenge.answer && (
                                <p className="opacity-70 text-xs">
                                    Correct answer: <strong>{challenge.answer}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action button */}
                <div className="flex justify-end gap-2 pt-1">
                    {!done ? (
                        <button
                            className="btn btn-primary btn-sm gap-1.5"
                            onClick={handleSubmit}
                            disabled={submitting || !answer.trim()}
                        >
                            {submitting ? (
                                <><Loader2 className="size-3.5 animate-spin" /> Checking...</>
                            ) : (
                                <>Submit <ChevronRight className="size-3.5" /></>
                            )}
                        </button>
                    ) : (
                        <button
                            className="btn btn-ghost btn-sm gap-1.5"
                            onClick={onNext}
                        >
                            Next challenge <ChevronRight className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}