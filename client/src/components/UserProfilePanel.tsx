import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { checkUsername, updateMyProfile, type ProfileUpdatePayload } from "../api/user";
import Avatar from "./Avatar";
import { X, Camera, Loader2, Check, AlertCircle, LogOut, Eye, EyeOff } from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { user, token, logout, setUser, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || "");
  const [dob, setDob] = useState(user?.dob || "");
  const [showDob, setShowDob] = useState<boolean>(!!user?.showDob);
  const [showOnlineStatus, setShowOnlineStatus] = useState<boolean>(
    user?.showOnlineStatus !== false
  );

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const selectedAvatarRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameState, setUsernameState] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "available" }
    | { status: "unavailable"; reason: string; suggestions: string[] }
  >({ status: "idle" });
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarUrl = avatarPreview
    ? avatarPreview
    : user?.avatar
    ? `${API_BASE}${user.avatar}`
    : null;

  useEffect(() => {
    if (saving) return;
    const next = username.trim().toLowerCase();
    if (!next) {
      setUsernameState({ status: "idle" });
      return;
    }
    if (user?.username && next === user.username.toLowerCase()) {
      setUsernameState({ status: "available" });
      return;
    }
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    setUsernameState({ status: "checking" });
    usernameCheckTimer.current = setTimeout(async () => {
      if (!token) return;
      const result = await checkUsername(next, token);
      if (result.available) {
        setUsernameState({ status: "available" });
      } else {
        setUsernameState({
          status: "unavailable",
          reason: result.reason || "Unavailable",
          suggestions: result.suggestions || [],
        });
      }
    }, 500);
    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [username, token, user?.username, saving]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedAvatarRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token) return;
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername && usernameState.status !== "available" && usernameState.status !== "idle") {
      setError("Pick an available username or revert to your current one");
      return;
    }

    setSaving(true);
    try {
      const updates: ProfileUpdatePayload = {
        name: name.trim() || undefined,
      };
      if (trimmedUsername) updates.username = trimmedUsername;
      if (statusMessage !== undefined) updates.statusMessage = statusMessage;
      if (dob !== undefined) updates.dob = dob;
      updates.showDob = showDob;
      updates.showOnlineStatus = showOnlineStatus;
      if (selectedAvatarRef.current) updates.avatar = selectedAvatarRef.current;

      const updated = await updateMyProfile(updates, token);
      setUser(updated);
      await refreshUser();
      setAvatarPreview(null);
      selectedAvatarRef.current = null;
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update profile";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-[#12141b]/95 backdrop-blur-2xl border-l border-white/10 animate-[slide-in-right_0.3s_ease-out] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#12141b]/95 backdrop-blur-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-white">Settings</h2>
            <p className="text-[11px] text-white/40 mt-0.5">Manage your profile and preferences</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <Avatar name={name || user?.name || "U"} size="xl" />
              )}
              <div className="absolute inset-0 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <p className="text-[11px] text-white/45">Click to change profile photo</p>
          </div>

          <Field label="Display name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
            />
          </Field>

          <Field
            label="Username"
            hint="Unique. Letters, numbers, _ and . allowed (3-20 chars)"
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                placeholder="username"
                className="w-full pl-7 pr-9 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameState.status === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                )}
                {usernameState.status === "available" && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
                {usernameState.status === "unavailable" && (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
              </span>
            </div>
            {usernameState.status === "unavailable" && (
              <div className="mt-1.5 text-[11px] space-y-1">
                <p className="text-red-300">{usernameState.reason}</p>
                {usernameState.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {usernameState.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setUsername(s)}
                        className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.1] hover:text-white transition text-[11px]"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white/50 cursor-not-allowed"
            />
          </Field>

          <Field label="Date of birth">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition [color-scheme:dark]"
            />
          </Field>

          <Field label="Status">
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
            />
          </Field>

          <div className="rounded-xl bg-white/[0.04] border border-white/10 divide-y divide-white/[0.06]">
            <ToggleRow
              icon={showDob ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              label="Show date of birth"
              description="Other people in your groups can see your birthday"
              checked={showDob}
              onChange={setShowDob}
            />
            <ToggleRow
              icon={<Eye className="h-4 w-4" />}
              label="Show online status"
              description="Let others know when you're active"
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white font-medium text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full h-11 rounded-xl border border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/15 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </>
  );
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-xs font-medium text-white/60 mb-1.5 block">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
  </div>
);

const ToggleRow = ({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3 p-3">
    <div className="flex items-start gap-3 min-w-0">
      <span className="h-8 w-8 grid place-items-center rounded-lg bg-white/[0.05] text-white/70 shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-white/90">{label}</p>
        <p className="text-[11px] text-white/45">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

const Switch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition shrink-0 ${
      checked ? "bg-[#5865F2]" : "bg-white/15"
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
        checked ? "left-[22px]" : "left-0.5"
      }`}
    />
  </button>
);

export default SettingsPanel;
