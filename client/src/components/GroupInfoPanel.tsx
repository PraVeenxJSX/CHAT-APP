import { useState } from "react";
import type { Conversation, User } from "../types";
import Avatar from "./Avatar";

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
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-cyber-surface border-l border-cyber-border z-50 overflow-y-auto">
        <div className="p-4 border-b border-cyber-border flex items-center justify-between">
          <h2 className="text-lg font-cyber text-cyber-purple">GROUP INFO</h2>
          <button
            onClick={onClose}
            className="p-2 text-cyber-text-dim hover:text-cyber-magenta transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Group avatar and name */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-full bg-cyber-purple/20 border-2 border-cyber-purple/40 flex items-center justify-center text-3xl">
              {(conversation.name || "G").charAt(0).toUpperCase()}
            </div>

            {editing ? (
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-cyber-text outline-none focus:border-cyber-cyan"
                />
                <button
                  onClick={handleSave}
                  className="px-3 py-2 bg-cyber-cyan text-cyber-bg rounded-lg font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-cyber-text">
                  {conversation.name}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 text-cyber-text-dim hover:text-cyber-cyan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-cyber-text-dim">
              {conversation.participants.length} members
            </p>
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-cyber-text-dim">Members</p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="text-xs text-cyber-cyan hover:underline"
                >
                  + Add members
                </button>
              )}
            </div>

            {showAddMembers && (
              <div className="mb-3 p-3 bg-cyber-bg rounded-lg border border-cyber-border">
                <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                  {nonParticipants.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => {
                        const next = new Set(selectedToAdd);
                        if (next.has(user._id)) next.delete(user._id);
                        else next.add(user._id);
                        setSelectedToAdd(next);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded ${
                        selectedToAdd.has(user._id)
                          ? "bg-cyber-cyan/10"
                          : "hover:bg-cyber-surface-light"
                      }`}
                    >
                      <Avatar name={user.name} avatar={user.avatar} size="sm" />
                      <span className="text-sm text-cyber-text">{user.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedToAdd.size === 0}
                  className="w-full py-2 bg-cyber-cyan text-cyber-bg rounded-lg text-sm font-bold disabled:opacity-40"
                >
                  Add ({selectedToAdd.size})
                </button>
              </div>
            )}

            <div className="space-y-1">
              {conversation.participants.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-cyber-surface-light"
                >
                  <Avatar name={p.name} avatar={p.avatar} size="sm" />
                  <div className="flex-1">
                    <span className="text-cyber-text text-sm">{p.name}</span>
                    {conversation.admin === p._id && (
                      <span className="ml-2 text-[10px] text-cyber-purple bg-cyber-purple/20 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  {isAdmin && p._id !== currentUserId && (
                    <button
                      onClick={() => onRemoveParticipant(p._id)}
                      className="p-1 text-cyber-text-dim hover:text-cyber-magenta"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave group */}
          <button
            onClick={onLeave}
            className="w-full py-3 rounded-lg border border-cyber-magenta text-cyber-magenta hover:bg-cyber-magenta/10 transition-colors"
          >
            Leave Group
          </button>
        </div>
      </div>
    </>
  );
};

export default GroupInfoPanel;
