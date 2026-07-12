import { useState } from "react";
import type { User } from "../types";
import Avatar from "./Avatar";
import { X, Check, Search, Users } from "lucide-react";

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
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelected(next);
  };

  const handleCreate = () => {
    if (!name.trim() || selected.size === 0) return;
    onCreate(name.trim(), Array.from(selected));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl bg-[#12141b]/95 backdrop-blur-2xl border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a855f7]">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Create group</h2>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1.5 block">Group name</label>
              <input
                type="text"
                placeholder="e.g. Weekend Squad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-white/60">Add members</label>
                <span className="text-[11px] text-white/40">{selected.size} selected</span>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search people"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5 -mx-1 px-1">
                {filteredUsers.map((user) => {
                  const isSel = selected.has(user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition ${
                        isSel
                          ? "bg-white/[0.08] border border-white/10"
                          : "border border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <Avatar name={user.name} avatar={user.avatar} size="sm" />
                      <span className="text-sm text-white/90 flex-1 text-left">{user.name}</span>
                      <div
                        className={`h-5 w-5 rounded-full grid place-items-center border transition ${
                          isSel
                            ? "bg-[#5865F2] border-[#5865F2]"
                            : "border-white/20"
                        }`}
                      >
                        {isSel && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/10 text-white/70 hover:bg-white/[0.04] transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || selected.size === 0}
              className="flex-1 h-10 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white font-medium text-sm shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-indigo-500/40 transition"
            >
              Create group
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateGroupDialog;