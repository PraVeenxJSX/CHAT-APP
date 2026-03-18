import { Request, Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("_id name email avatar statusMessage");

    res.json(users);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select("_id name email avatar statusMessage");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, statusMessage } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    if (req.file) user.avatar = `/uploads/${req.file.filename}`;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      statusMessage: user.statusMessage,
    });
  } catch {
    res.status(500).json({ message: "Failed to update profile" });
  }
};
