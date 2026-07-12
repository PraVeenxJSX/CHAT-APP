import { Request, Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("_id name username email avatar statusMessage dob showDob showOnlineStatus");

    const mapped = users.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      statusMessage: u.statusMessage,
      dob: u.showDob ? u.dob : undefined,
      showDob: u.showDob,
      showOnlineStatus: u.showOnlineStatus,
    }));

    res.json(mapped);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const u = await User.findById(req.user._id).select(
      "_id name username email avatar statusMessage dob showDob showOnlineStatus"
    );
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json({
      _id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      statusMessage: u.statusMessage,
      dob: u.dob,
      showDob: u.showDob,
      showOnlineStatus: u.showOnlineStatus,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select("_id name username email avatar statusMessage dob showDob showOnlineStatus");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      statusMessage: user.statusMessage,
      dob: user.showDob ? user.dob : undefined,
      showDob: user.showDob,
      showOnlineStatus: user.showOnlineStatus,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

function makeUsernameSuggestions(base: string): string[] {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 18);
  const out: string[] = [];
  for (let i = 1; i <= 5; i++) {
    out.push(`${cleaned}${i}`);
    out.push(`${cleaned}_${Math.floor(Math.random() * 90 + 10)}`);
  }
  return Array.from(new Set(out)).slice(0, 5);
}

export const checkUsername = async (req: AuthRequest, res: Response) => {
  try {
    const raw = String(req.query.username || "").trim();
    const username = raw.toLowerCase();

    if (!username || username.length < 3 || username.length > 20) {
      return res.json({ available: false, reason: "Must be 3-20 characters" });
    }
    if (!/^[a-z0-9_.]+$/.test(username)) {
      return res.json({ available: false, reason: "Only a-z, 0-9, _ and ." });
    }

    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.user._id.toString()) {
      return res.json({
        available: false,
        reason: "Already taken",
        suggestions: makeUsernameSuggestions(username),
      });
    }
    res.json({ available: true });
  } catch {
    res.status(500).json({ message: "Failed to check username" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, statusMessage, dob, showDob, showOnlineStatus } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof username === "string" && username.trim()) {
      const newUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,20}$/.test(newUsername)) {
        return res.status(400).json({ message: "Invalid username format" });
      }
      const conflict = await User.findOne({
        username: newUsername,
        _id: { $ne: user._id },
      });
      if (conflict) {
        return res.status(409).json({ message: "Username already taken" });
      }
      user.username = newUsername;
    }

    if (typeof statusMessage === "string") user.statusMessage = statusMessage;
    if (typeof dob === "string") user.dob = dob;
    if (typeof showDob === "boolean") user.showDob = showDob;
    if (typeof showOnlineStatus === "boolean") user.showOnlineStatus = showOnlineStatus;

    if (req.file) user.avatar = `/uploads/${req.file.filename}`;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      statusMessage: user.statusMessage,
      dob: user.dob,
      showDob: user.showDob,
      showOnlineStatus: user.showOnlineStatus,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Username already taken" });
    }
    res.status(500).json({ message: "Failed to update profile" });
  }
};
