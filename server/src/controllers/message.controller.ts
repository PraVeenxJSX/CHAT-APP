import { Request, Response } from "express";
import Message from "../models/Message";
import { AuthRequest } from "../middleware/auth.middleware";

export const getChatHistory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const loggedInUserId = req.user._id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: loggedInUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: loggedInUserId }
      ]
    })
      .sort({ createdAt: 1 }) // oldest → newest
      .populate("sender", "name email")
      .populate("receiver", "name email");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};
