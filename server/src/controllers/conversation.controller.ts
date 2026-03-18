import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";

interface AuthRequest extends Request {
  user?: { _id: string; name: string; email: string };
}

export const getUserConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name email avatar")
      .populate("lastMessage")
      .populate("admin", "name")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrCreateDirect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({ message: "Partner ID required" });
    }

    let conversation = await Conversation.findOne({
      type: "direct",
      participants: { $all: [userId, partnerId], $size: 2 },
    }).populate("participants", "name email avatar");

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [userId, partnerId],
      });
      conversation = await conversation.populate("participants", "name email avatar");
    }

    res.json(conversation);
  } catch (err) {
    console.error("Get/create direct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { name, participantIds } = req.body;

    if (!name || !participantIds || participantIds.length < 1) {
      return res.status(400).json({ message: "Name and participants required" });
    }

    const allParticipants = [userId, ...participantIds];

    const conversation = await Conversation.create({
      type: "group",
      name,
      participants: allParticipants,
      admin: userId,
    });

    const populated = await conversation.populate("participants", "name email avatar");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const { name, addParticipants, removeParticipants } = req.body;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Not a group conversation" });
    }

    if (conversation.admin?.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can update group" });
    }

    if (name) conversation.name = name;

    if (addParticipants && Array.isArray(addParticipants)) {
      for (const pId of addParticipants) {
        if (!conversation.participants.some((p) => p.toString() === pId)) {
          conversation.participants.push(pId);
        }
      }
    }

    if (removeParticipants && Array.isArray(removeParticipants)) {
      conversation.participants = conversation.participants.filter(
        (p) => !removeParticipants.includes(p.toString())
      );
    }

    if (req.file) {
      conversation.avatar = `/uploads/${req.file.filename}`;
    }

    await conversation.save();

    const populated = await conversation.populate("participants", "name email avatar");

    res.json(populated);
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Get conversation messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const conversation = await Conversation.findById(id);

    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId
    );

    if (conversation.admin?.toString() === userId && conversation.participants.length > 0) {
      conversation.admin = conversation.participants[0];
    }

    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(id);
      return res.json({ message: "Group deleted" });
    }

    await conversation.save();

    res.json({ message: "Left group successfully" });
  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
