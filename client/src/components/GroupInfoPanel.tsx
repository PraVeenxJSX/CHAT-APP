import { useState, useRef, useMemo } from "react";
import type { Conversation, User } from "../types";
import Avatar from "./Avatar";
import {
  X,
  Pencil,
  UserPlus,
  LogOut,
  Check,
  Camera,
  Search,
  BellOff,
  Bell,
  Clock,
  Shield,
  Trash2,
  Crown,
  UserMinus,
  ChevronDown,
} from "lucide-react";

export interface GroupUpdateInfo {
  name?: string;
  description?: string;
  onlyAdminsCanMessage?: boolean;
  disappearingMessagesSeconds?: number;
  avatarFile?: File;
}

interface GroupInfoPanelProps {
  conversation: Conversation;
  currentUserId: string;
  allUsers: User[];
  onClose: () => void;
  onUpdate: (updates: GroupUpdateInfo) => void;
  onAddParticipants: (userIds: string[]) => void;
  onRemoveParticipant: (userId: string) => void;
  onPromoteAdmin: (userId: string) => void;
  onDemoteAdmin: (userId: string) => void;
  onMute: (durationHours: number | null) => void;
  onLeave: () => void;
  onDelete: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const DISAPPEARING_OPTIONS: { label: string; seconds: number }[] = [
  { label: "Off", seconds: 0 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "90 days", seconds: 7776000 },
];

const MUTE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "Unmute", hours: null },
  { label: "8 hours", hours: 8 },
  { label: "1 week", hours: 24 * 7 },
  { label: "Always", hours: 24 * 365 },
];

const GroupInfoPanel = ({
  conversation,
  currentUserId,
  allUsers,
  onClose,
  onUpdate,
  onAddParticipants,
  onRemoveParticipant,
  onPromoteAdmin,
  onDemoteAdmin,
  onMute,
  onLeave,
  onDelete,
}: GroupInfoPanelProps) => {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(conversation.name || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(conversation.description || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [disappearing, setDisappearing] = useState<number>(conversation.disappearingMessagesSeconds || 0);
  const [onlyAdmins, setOnlyAdmins] = useState<boolean>(!!conversation.onlyAdminsCanMessage);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  const isAdmin = useMemo(() => {
    const admins = (conversation.admins && conversation.admins.length
      ? conversation.admins
      : conversation.admin
      ? [conversation.admin]
      : []) as string[];
    return admins.includes(currentUserId);
  }, [conversation.admin, conversation.admins, currentUserId]);

  const participantIds = useMemo(
    () => new Set(conversation.participants.map((p) => p._id)),
    [conversation.participants]
  );
  const nonParticipants = useMemo(
    () => allUsers.filter((u) => !participantIds.has(u._id)),
    [allUsers, participantIds]
  );

  const memberList = useMemo(() => {
    if (showAllMembers) return conversation.participants;
    return conversation.participants.slice(0, 5);
  }, [conversation.participants, showAllMembers]);

  const myMute = useMemo(() => {
    const m = (conversation.mutedMembers || []).find(
      (mm) => mm.userId === currentUserId
    );
    return m;
  }, [conversation.mutedMembers, currentUserId]);

  const isMuted =
    !!(myMute && (!myMute.until || new Date(myMute.until).getTime() > Date.now()));

  const handleSaveName = () => {
    onUpdate({ name: name.trim() });
    setEditingName(false);
  };

  const handleSaveDesc = () => {
    onUpdate({ description: description.trim() });
    setEditingDesc(false);
  };

  const handleAddMembers = () => {
    if (selectedToAdd.size === 0) return;
    onAddParticipants(Array.from(selectedToAdd));
    setSelectedToAdd(new Set());
    setShowAddMembers(false);
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarFileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitAvatar = () => {
    if (!avatarFileRef.current) return;
    onUpdate({ avatarFile: avatarFileRef.current });
    avatarFileRef.current = null;
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleOnlyAdminsToggle = (val: boolean) => {
    setOnlyAdmins(val);
    onUpdate({ onlyAdminsCanMessage: val });
  };

  const handleDisappearing = (secs: number) => {
    setDisappearing(secs);
    onUpdate({ disappearingMessagesSeconds: secs });
  };

  const avatarUrl =
    avatarPreview ||
    (conversation.avatar
      ? conversation.avatar.startsWith("http")
        ? conversation.avatar
        : `${API_BASE}${conversation.avatar}`
      : null);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-y-auto bg-[#12141b]/95 backdrop-blur-2xl border-l border-white/10 animate-[slide-in-right_0.3s_ease-out]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#12141b]/95 backdrop-blur-xl z-10">
          <h2 className="text-base font-semibold text-white">Group info</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Avatar + name */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
            {isAdmin ? (
              avatarUrl ? (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group"
                >
                  <img
                    src={avatarUrl}
                    alt={conversation.name}
                    className="h-24 w-24 rounded-full object-cover ring-1 ring-white/15"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group h-24 w-24 rounded-full grid place-items-center ring-1 ring-white/15"
                  style={{
                    background:
                      "linear-gradient(135deg, #5865F2 0%, #a855f7 100%)",
                  }}
                >
                  <UsersFallback name={conversation.name || "G"} />
                  <div className="absolute inset-0 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              )
            ) : avatarUrl ? (
              <img src={avatarUrl} alt={conversation.name} className="h-24 w-24 rounded-full object-cover ring-1 ring-white/15" />
            ) : (
              <div
                className="h-24 w-24 rounded-full grid place-items-center ring-1 ring-white/15"
                style={{ background: "linear-gradient(135deg, #5865F2, #a855f7)" }}
              >
                <UsersFallback name={conversation.name || "G"} />
              </div>
            )}

            {isAdmin && avatarPreview && (
              <button
                onClick={submitAvatar}
                className="text-xs px-3 h-8 rounded-lg bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white font-medium"
              >
                Save new photo
              </button>
            )}

            <p className="text-[11px] text-white/40">Group · {conversation.participants.length} members</p>

            {editingName ? (
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white outline-none focus:border-white/25"
                />
                <button
                  onClick={handleSaveName}
                  className="px-3 h-9 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white text-sm font-medium"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white truncate">{conversation.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="h-7 w-7 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {editingDesc ? (
              <div className="flex flex-col gap-2 w-full">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Group description"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/25 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingDesc(false);
                      setDescription(conversation.description || "");
                    }}
                    className="px-3 h-9 rounded-xl border border-white/10 text-white/70 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDesc}
                    className="px-3 h-9 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : conversation.description ? (
              <p className="text-sm text-white/70 text-center px-2">
                {conversation.description}
              </p>
            ) : isAdmin ? (
              <button
                onClick={() => setEditingDesc(true)}
                className="text-xs text-[#8ab4ff] hover:text-white transition"
              >
                Add description
              </button>
            ) : null}
          </div>

          {/* Mute & Disappearing controls */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 divide-y divide-white/[0.06]">
            <ActionRow
              icon={isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              label={isMuted ? "Muted" : "Notifications"}
              description={isMuted ? "You won't get alerts from this group" : "You're getting alerts from this group"}
              control={
                <select
                  className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 outline-none"
                  onChange={(e) => onMute(e.target.value === "" ? null : Number(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Mute for…
                  </option>
                  {MUTE_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.hours ?? ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            />

            <ActionRow
              icon={<Clock className="h-4 w-4" />}
              label="Disappearing messages"
              description={
                disappearing
                  ? DISAPPEARING_OPTIONS.find((o) => o.seconds === disappearing)?.label
                  : "Off"
              }
              control={
                <select
                  disabled={!isAdmin}
                  className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 outline-none disabled:opacity-50"
                  value={String(disappearing)}
                  onChange={(e) => handleDisappearing(Number(e.target.value))}
                >
                  {DISAPPEARING_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.seconds}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            />

            <ActionRow
              icon={<Shield className="h-4 w-4" />}
              label="Only admins can send"
              description="When on, only admins can post messages"
              control={
                <ToggleSwitch
                  disabled={!isAdmin}
                  checked={onlyAdmins}
                  onChange={handleOnlyAdminsToggle}
                />
              }
            />
          </div>

          {/* Add members */}
          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                  Add members
                </p>
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="flex items-center gap-1 text-xs text-[#8ab4ff] hover:text-white transition"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showAddMembers ? "Hide" : "Add"}
                </button>
              </div>

              {showAddMembers && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search people"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {nonParticipants
                      .filter((u) =>
                        memberSearch ? u.name.toLowerCase().includes(memberSearch.toLowerCase()) : true
                      )
                      .map((user) => {
                        const isSel = selectedToAdd.has(user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => {
                              const next = new Set(selectedToAdd);
                              if (isSel) next.delete(user._id);
                              else next.add(user._id);
                              setSelectedToAdd(next);
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${
                              isSel ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                            }`}
                          >
                            <Avatar name={user.name} avatar={user.avatar} size="sm" />
                            <span className="text-sm text-white/90 flex-1 text-left">{user.name}</span>
                            <div
                              className={`h-4 w-4 rounded-full grid place-items-center border ${
                                isSel ? "bg-[#5865F2] border-[#5865F2]" : "border-white/20"
                              }`}
                            >
                              {isSel && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  {selectedToAdd.size > 0 && (
                    <button
                      onClick={handleAddMembers}
                      className="w-full h-9 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white text-sm font-medium"
                    >
                      Add {selectedToAdd.size} member{selectedToAdd.size > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                {conversation.participants.length} members
              </p>
              {conversation.participants.length > 5 && (
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="text-xs text-[#8ab4ff] hover:text-white transition"
                >
                  {showAllMembers ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {memberList.map((p) => {
                const adminsList = (conversation.admins && conversation.admins.length
                  ? conversation.admins
                  : conversation.admin
                  ? [conversation.admin]
                  : []) as string[];
                const isThisAdmin = adminsList.includes(p._id);
                const isPrimaryAdmin = p._id === conversation.admin;
                return (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition"
                  >
                    <Avatar name={p.name} avatar={p.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white/90 truncate">{p.name}</span>
                        {isThisAdmin && (
                          <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            {isPrimaryAdmin ? <Crown className="h-2.5 w-2.5" /> : null}
                            {isPrimaryAdmin ? "Owner" : "Admin"}
                          </span>
                        )}
                      </div>
                      {p.username && (
                        <p className="text-[11px] text-white/40 truncate">@{p.username}</p>
                      )}
                    </div>
                    {isAdmin && p._id !== currentUserId && !isPrimaryAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            isThisAdmin
                              ? onDemoteAdmin(p._id)
                              : onPromoteAdmin(p._id)
                          }
                          className="h-7 px-2 grid place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition text-[11px]"
                          title={isThisAdmin ? "Demote" : "Promote to admin"}
                        >
                          {isThisAdmin ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => onRemoveParticipant(p._id)}
                          className="h-7 w-7 grid place-items-center rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/10 transition"
                          title="Remove"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!showAllMembers && conversation.participants.length > 5 && (
                <button
                  onClick={() => setShowAllMembers(true)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-[#8ab4ff] hover:text-white text-xs transition"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show {conversation.participants.length - 5} more
                </button>
              )}
            </div>
          </div>

          {/* Leave / Delete */}
          <div className="space-y-2">
            <button
              onClick={onLeave}
              className="w-full h-11 rounded-xl border border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/15 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Leave group
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this group for everyone? This cannot be undone.")) {
                    onDelete();
                  }
                }}
                className="w-full h-11 rounded-xl border border-red-700/40 bg-red-700/15 text-red-100 hover:bg-red-700/25 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete group for everyone
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ActionRow = ({
  icon,
  label,
  description,
  control,
}: {
  icon: React.ReactNode;
  label: string;
  description: React.ReactNode;
  control: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 p-3">
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <span className="h-8 w-8 grid place-items-center rounded-lg bg-white/[0.05] text-white/70 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/90">{label}</p>
        <p className="text-[11px] text-white/45 truncate">{description}</p>
      </div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const ToggleSwitch = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition shrink-0 ${
      checked ? "bg-[#5865F2]" : "bg-white/15"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition ${
        checked ? "left-[22px]" : "left-0.5"
      }`}
    />
  </button>
);

const UsersFallback = ({ name }: { name: string }) => (
  <span className="text-white text-2xl font-semibold">
    {name.charAt(0).toUpperCase()}
  </span>
);

export default GroupInfoPanel;
