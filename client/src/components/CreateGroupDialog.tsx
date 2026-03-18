import { useState } from "react";
import type { User } from "../types";
import Avatar from "./Avatar";

interface CreateGroupDialogProps {
  users: User[];
  onClose: () => void;
  onCreate: (name: string, participantIds: string[]) => void;
}

const CreateGroupDialog = ({ users, onClose, onCreate }: CreateGroupDialogProps) => {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    const next = new Set(selected);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelected(next);
  };

  const handleCreate = () => {
    if (!name.trim() || selected.size === 0) return;
    onCreate(name.trim(), Array.from(selected));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-cyber-surface border border-cyber-border rounded-2xl w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-cyber-border flex items-center justify-between">
            <h2 className="text-lg font-cyber text-cyber-cyan">CREATE GROUP</h2>
            <button
              onClick={onClose}
              className="p-2 text-cyber-text-dim hover:text-cyber-magenta transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <input
              type="text"
              placeholder="Group name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-4 py-3 text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan transition-colors"
            />

            <div>
              <p className="text-sm text-cyber-text-dim mb-2">
                Add participants ({selected.size} selected)
              </p>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-4 py-2 text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan transition-colors mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => toggleUser(user._id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      selected.has(user._id)
                        ? "bg-cyber-cyan/10 border border-cyber-cyan/40"
                        : "hover:bg-cyber-surface-light border border-transparent"
                    }`}
                  >
                    <Avatar name={user.name} avatar={user.avatar} size="sm" />
                    <span className="text-cyber-text">{user.name}</span>
                    {selected.has(user._id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-auto text-cyber-cyan">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-cyber-border flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-cyber-border text-cyber-text-dim hover:border-cyber-text-dim transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || selected.size === 0}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-neon-cyan transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateGroupDialog;
