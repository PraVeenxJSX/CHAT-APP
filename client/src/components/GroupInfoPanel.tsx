import { useState } from "react";
import type { Conversation, User } from "../types";
import Avatar from "./Avatar";
import { X, Pencil, UserPlus, LogOut, Check } from "lucide-react";

interface GroupInfoPanelProps {
  conversation: Conversation;
  currentUserId: string;
  allUsers: User[];
  onClose: () => void;
  onUpdate: (name: string) => void;
  onAddParticipants: (userIds: string[]) => void;
  onRemoveParticipant: (userId: string) => void;
  onLeave: () => void;
}

const GroupInfoPanel = ({
  conversation,
  currentUserId,
  allUsers,
  onClose,
  onUpdate,
  onAddParticipants,
  onRemoveParticipant,
  onLeave,
}: GroupInfoPanelProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.name || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  const isAdmin = conversation.admin === currentUserId;
  const participantIds = new Set(conversation.participants.map((p) => p._id));
  const nonParticipants = allUsers.filter((u) => !participantIds.has(u._id));

  const handleSave = () => {
    onUpdate(name);
    setEditing(false);
  };

  const handleAddMembers = () => {
    if (selectedToAdd.size > 0) {
      onAddParticipants(Array.from(selectedToAdd));
      setSelectedToAdd(new Set());
      setShowAddMembers(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 overflow-y-auto bg-[#12141b]/95 backdrop-blur-2xl border-l border-white/10 animate-[slide-in-right_0.3s_ease-out]">
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
          <div className="flex flex-col items-center gap-3">
            <Avatar name={conversation.name || "G"} size="xl" />
            {editing ? (
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white outline-none focus:border-white/25"
                />
                <button
                  onClick={handleSave}
                  className="px-3 h-9 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white text-sm font-medium"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">{conversation.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    className="h-7 w-7 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-white/50">
              {conversation.participants.length} members
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Members
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="flex items-center gap-1 text-xs text-[#8ab4ff] hover:text-white transition"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            {showAddMembers && (
              <div className="mb-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
                  {nonParticipants.map((user) => {
                    const isSel = selectedToAdd.has(user._id);
                    return (
                      <button
                        key={user._id}
                        onClick={() => {
                          const next = new Set(selectedToAdd);
                          if (next.has(user._id)) next.delete(user._id);
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
                <button
                  onClick={handleAddMembers}
                  disabled={selectedToAdd.size === 0}
                  className="w-full h-9 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white text-sm font-medium disabled:opacity-40"
                >
                  Add {selectedToAdd.size > 0 && `(${selectedToAdd.size})`}
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {conversation.participants.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition"
                >
                  <Avatar name={p.name} avatar={p.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white/90 truncate">{p.name}</span>
                      {conversation.admin === p._id && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && p._id !== currentUserId && (
                    <button
                      onClick={() => onRemoveParticipant(p._id)}
                      className="h-7 w-7 grid place-items-center rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/10 transition"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onLeave}
            className="w-full h-11 rounded-xl border border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/15 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Leave group
          </button>
        </div>
      </div>
    </>
  );
};

export default GroupInfoPanel;