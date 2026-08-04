import { useState } from "react";
import { useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import {
  LoaderIcon,
  MapPinIcon,
  ShipWheelIcon,
  ShuffleIcon,
  CameraIcon,
  LanguagesIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowLeft,
} from "lucide-react";
import { LANGUAGES } from "../constants";

const OnboardingPage = ({ isEditMode = false }) => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningLanguage: authUser?.learningLanguage || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const [showMockTranslation, setShowMockTranslation] = useState(false);

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data) => {
      toast.success(isEditMode ? "Profile updated successfully" : "Profile onboarded successfully");
      queryClient.setQueryData(["authUser"], { success: true, user: data.user });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      if (!isEditMode) {
        window.location.href = "/";
      } else {
        navigate("/");
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed. Please try again.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.fullName || !formState.nativeLanguage || !formState.learningLanguage) {
      toast.error("Please fill in all required fields");
      return;
    }
    onboardingMutation(formState);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${idx}`;
    setFormState((prev) => ({ ...prev, profilePic: randomAvatar }));
    toast.success("Random profile picture generated!");
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="card bg-base-200 w-full max-w-6xl shadow-2xl overflow-hidden border border-base-300">
        <div className="grid grid-cols-1 lg:grid-cols-12">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-6">
            {isEditMode && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-sm gap-2 normal-case pl-0 text-base-content/70 hover:bg-transparent hover:text-primary transition-colors inline-flex items-center"
              >
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isEditMode ? "Edit Your Profile" : "Complete Your Profile"}
              </h1>
              <p className="opacity-60 text-sm mt-1">
                {isEditMode
                  ? "Update your profile details and learning preferences."
                  : "Let us set up your profile to start practicing languages."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Avatar */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-2">
                <div className="size-24 rounded-full bg-base-300 overflow-hidden border-2 border-primary/20 shrink-0">
                  {formState.profilePic ? (
                    <img src={formState.profilePic} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <CameraIcon className="size-10 text-base-content opacity-40" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="font-semibold text-sm">Profile Picture</h3>
                  <p className="text-xs opacity-60">Select a random avatar to represent yourself.</p>
                  <button type="button" onClick={handleRandomAvatar} className="btn btn-accent btn-sm gap-2 mt-1 normal-case">
                    <ShuffleIcon className="size-3.5" />
                    Generate Random Avatar
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-medium">Full Name <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="input input-bordered w-full input-sm sm:input-md"
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Bio */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-medium">Bio</span>
                </label>
                <textarea
                  name="bio"
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  className="textarea textarea-bordered h-20 text-sm"
                  placeholder="Tell others about yourself and your language learning goals..."
                />
              </div>

              {/* Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium">Native Language <span className="text-error">*</span></span>
                  </label>
                  <select
                    name="nativeLanguage"
                    value={formState.nativeLanguage}
                    onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                    className="select select-bordered w-full select-sm sm:select-md capitalize"
                    required
                  >
                    <option value="">Select your native language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={`native-${lang}`} value={lang.toLowerCase()}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium">Learning Language <span className="text-error">*</span></span>
                  </label>
                  <select
                    name="learningLanguage"
                    value={formState.learningLanguage}
                    onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
                    className="select select-bordered w-full select-sm sm:select-md capitalize"
                    required
                  >
                    <option value="">Select language you are learning</option>
                    {LANGUAGES.map((lang) => (
                      <option key={`learning-${lang}`} value={lang.toLowerCase()}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-medium">Location</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-4 opacity-55" />
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-9 input-sm sm:input-md"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Submit */}
              <button className="btn btn-primary w-full mt-2 normal-case gap-2" disabled={isPending} type="submit">
                {isPending ? (
                  <>
                    <LoaderIcon className="animate-spin size-4" />
                    {isEditMode ? "Saving Changes..." : "Onboarding..."}
                  </>
                ) : (
                  <>
                    <ShipWheelIcon className="size-4" />
                    {isEditMode ? "Save Changes" : "Complete Profile"}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 bg-gradient-to-br from-base-300 via-base-200 to-base-300 p-6 sm:p-10 border-t lg:border-t-0 lg:border-l border-base-300 flex flex-col justify-center relative overflow-hidden">

            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-6">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  How Communication Works
                </span>
                <h2 className="text-xl font-bold mt-3">Bilingual Chat Simulation</h2>
                <p className="text-xs opacity-60 mt-1">
                  See how you can chat naturally with peers, even if you do not speak the same languages yet.
                </p>
              </div>

              {/* Simulator */}
              <div className="bg-base-100/60 border border-base-300/80 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-base-300/40 pb-2">
                  <span className="text-[10px] font-bold opacity-60 flex items-center gap-1.5">
                    <span className="size-2 bg-success rounded-full animate-pulse" />
                    LIVE CHAT EXPERIMENT
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMockTranslation(!showMockTranslation)}
                    className="btn btn-xs btn-primary gap-1 px-2.5 font-semibold text-[10px] normal-case"
                  >
                    <LanguagesIcon className="size-3" />
                    {showMockTranslation ? "Show Original" : "Click to Translate"}
                  </button>
                </div>

                {/* User 1 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[10px] font-bold">User 1 (Telugu Native)</span>
                    <span className="text-[9px] opacity-40 bg-base-300 px-1.5 py-0.5 rounded">Learning Hindi</span>
                  </div>
                  <div className="bg-primary text-primary-content rounded-2xl rounded-tr-none px-3.5 py-2 text-xs max-w-[85%] ml-auto text-right shadow-sm">
                    {String.fromCharCode(0x0C28, 0x0C2E, 0x0C38, 0x0C4D, 0x0C15, 0x0C3E, 0x0C30, 0x0C02, 0x002C, 0x0020, 0x0C0E, 0x0C32, 0x0C3E, 0x0020, 0x0C09, 0x0C28, 0x0C4D, 0x0C28, 0x0C3E, 0x0C30, 0x0C41, 0x003F)}
                    {showMockTranslation && (
                      <div className="text-[10.5px] mt-2 pt-2 border-t border-primary-content/20 text-left font-medium leading-relaxed">
                        <span className="opacity-60 text-[8px] block font-mono uppercase tracking-wider mb-0.5">Translation (Hindi):</span>
                        {String.fromCharCode(0x0928, 0x092E, 0x0938, 0x094D, 0x0924, 0x0947, 0x002C, 0x0020, 0x0906, 0x092A, 0x0020, 0x0915, 0x0948, 0x0938, 0x0947, 0x0020, 0x0939, 0x0948, 0x0902, 0x003F)}
                      </div>
                    )}
                  </div>
                </div>

                {/* User 2 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold">User 2 (Hindi Native)</span>
                    <span className="text-[9px] opacity-40 bg-base-300 px-1.5 py-0.5 rounded">Learning Telugu</span>
                  </div>
                  <div className="bg-base-200 text-base-content rounded-2xl rounded-tl-none px-3.5 py-2 text-xs max-w-[85%] shadow-sm">
                    {String.fromCharCode(0x092E, 0x0948, 0x0902, 0x0020, 0x0920, 0x0940, 0x0915, 0x0020, 0x0939, 0x0942, 0x0901, 0x002C, 0x0020, 0x0906, 0x092A, 0x0020, 0x092C, 0x0924, 0x093E, 0x0907, 0x090F, 0x0021)}
                    {showMockTranslation && (
                      <div className="text-[10.5px] mt-2 pt-2 border-t border-base-content/20 font-medium leading-relaxed">
                        <span className="opacity-60 text-[8px] block font-mono uppercase tracking-wider mb-0.5">Translation (Telugu):</span>
                        {String.fromCharCode(0x0C28, 0x0C47, 0x0C28, 0x0C41, 0x0020, 0x0C2C, 0x0C3E, 0x0C17, 0x0C41, 0x0C28, 0x0C4D, 0x0C28, 0x0C3E, 0x0C28, 0x0C41, 0x002C, 0x0020, 0x0C2E, 0x0C40, 0x0C30, 0x0C41, 0x0020, 0x0C1A, 0x0C46, 0x0C2A, 0x0C4D, 0x0C2A, 0x0C02, 0x0C21, 0x0C3F, 0x0021)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <CheckCircle2Icon className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold">Practicing Target Languages</h4>
                    <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                      Both users type in their native languages to maintain a natural flow, while reading translations in their target learning languages.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <SparklesIcon className="size-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold">Dynamic Inline Translations</h4>
                    <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">
                      Once onboarded, click the Translate button beneath any chat bubble in DMs or public Rooms to translate message text instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
