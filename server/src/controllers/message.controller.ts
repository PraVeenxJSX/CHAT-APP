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

export const searchMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { q, conversationId } = req.query;
    const userId = req.user._id;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "Search query required" });
    }

    const query: Record<string, unknown> = {
      content: { $regex: q, $options: "i" },
      $or: [
        { sender: userId },
        { receiver: userId },
      ],
    };

    if (conversationId) {
      query.conversationId = conversationId;
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Search failed" });
  }
};
