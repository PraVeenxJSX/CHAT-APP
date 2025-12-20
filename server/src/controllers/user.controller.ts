import { Request, Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("_id name email");

    res.json(users);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
