import { Request, Response } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";

interface AuthRequest extends Request {
  user?: any;
}

const populateOptions = "name username email avatar statusMessage";

function isAdminOf(conversation: any, userId: string): boolean {
  const id = userId.toString();
  if (conversation.admin && conversation.admin.toString() === id) return true;
  if (Array.isArray(conversation.admins)) {
    return conversation.admins.some((a: any) => a.toString() === id);
  }
  return false;
}

export const getUserConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", populateOptions)
      .populate("lastMessage")
      .populate("admin", "name")
      .populate("admins", "name")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrCreateDirect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({ message: "Partner ID required" });
    }

    let conversation = await Conversation.findOne({
      type: "direct",
      participants: { $all: [userId, partnerId], $size: 2 },
    }).populate("participants", populateOptions);

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [userId, partnerId],
      });
      conversation = await conversation.populate("participants", populateOptions);
    }

    res.json(conversation);
  } catch (err) {
    console.error("Get/create direct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { name, participantIds, description } = req.body;

    if (!name || !participantIds || participantIds.length < 1) {
      return res.status(400).json({ message: "Name and participants required" });
    }

    const allParticipants = [userId, ...participantIds];

    const conversation = await Conversation.create({
      type: "group",
      name,
      description: description || "",
      participants: allParticipants,
      admin: userId,
      admins: [userId],
    });

    const populated = await conversation.populate("participants", populateOptions);

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;
    const {
      name,
      description,
      addParticipants,
      removeParticipants,
      onlyAdminsCanMessage,
      disappearingMessagesSeconds,
    } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Not a group conversation" });
    }
    if (!isAdminOf(conversation, userId)) {
      return res.status(403).json({ message: "Only admin can update group" });
    }

    if (typeof name === "string") conversation.name = name;
    if (typeof description === "string") conversation.description = description;

    if (Array.isArray(addParticipants)) {
      for (const pId of addParticipants) {
        if (!conversation.participants.some((p: any) => p.toString() === pId)) {
          conversation.participants.push(new mongoose.Types.ObjectId(pId));
        }
      }
    }

    if (Array.isArray(removeParticipants)) {
      conversation.participants = conversation.participants.filter(
        (p: any) => !removeParticipants.includes(p.toString())
      );
      if (Array.isArray(conversation.admins)) {
        conversation.admins = conversation.admins.filter(
          (a: any) => !removeParticipants.includes(a.toString())
        );
      }
    }

    if (typeof onlyAdminsCanMessage === "boolean") {
      conversation.onlyAdminsCanMessage = onlyAdminsCanMessage;
    }

    if (disappearingMessagesSeconds !== undefined) {
      const n = Number(disappearingMessagesSeconds);
      conversation.disappearingMessagesSeconds = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    if (req.file) {
      conversation.avatar = `/uploads/${req.file.filename}`;
    }

    await conversation.save();

    const populated = await conversation.populate("participants", populateOptions);

    res.json(populated);
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!isAdminOf(conversation, userId)) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.findByIdAndDelete(id);

    res.json({ message: "Group deleted" });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const muteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;
    const { durationHours } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    if (!conversation.participants.some((p: any) => p.toString() === userId)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const hours = Number(durationHours);
    const until =
      Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 3600 * 1000)
        : null;

    const existingIdx = (conversation.mutedMembers || []).findIndex(
      (m: any) => m.userId.toString() === userId
    );
    if (existingIdx >= 0) {
      if (until) {
        (conversation.mutedMembers as any)[existingIdx].until = until;
      } else {
        (conversation.mutedMembers as any).splice(existingIdx, 1);
      }
    } else if (until) {
      (conversation.mutedMembers as any).push({
        userId: new mongoose.Types.ObjectId(userId),
        until,
      });
    }

    await conversation.save();
    res.json({ muted: !!until, until });
  } catch (err) {
    console.error("Mute error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const promoteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user._id.toString();
    const { id, userId } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!isAdminOf(conversation, requesterId)) {
      return res.status(403).json({ message: "Only admin can promote" });
    }
    if (!conversation.participants.some((p: any) => p.toString() === userId)) {
      return res.status(400).json({ message: "User is not a participant" });
    }

    if (!Array.isArray(conversation.admins)) {
      conversation.admins = [conversation.admin] as any;
    }
    if (!(conversation.admins as any).some((a: any) => a.toString() === userId)) {
      (conversation.admins as any).push(new mongoose.Types.ObjectId(userId));
    }

    await conversation.save();
    const populated = await conversation.populate("participants", populateOptions);
    res.json(populated);
  } catch (err) {
    console.error("Promote admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const demoteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user._id.toString();
    const { id, userId } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!isAdminOf(conversation, requesterId)) {
      return res.status(403).json({ message: "Only admin can demote" });
    }
    if (conversation.admin && conversation.admin.toString() === userId) {
      return res.status(400).json({ message: "Cannot demote the primary admin" });
    }

    if (Array.isArray(conversation.admins)) {
      conversation.admins = conversation.admins.filter(
        (a: any) => a.toString() !== userId
      );
    }

    await conversation.save();
    const populated = await conversation.populate("participants", populateOptions);
    res.json(populated);
  } catch (err) {
    console.error("Demote admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id?.toString();
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === userId
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "name username email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Get conversation messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    conversation.participants = conversation.participants.filter(
      (p: any) => p.toString() !== userId
    );

    if (Array.isArray(conversation.admins)) {
      conversation.admins = conversation.admins.filter(
        (a: any) => a.toString() !== userId
      );
    }

    const wasAdmin =
      conversation.admin && conversation.admin.toString() === userId;

    if (wasAdmin && conversation.participants.length > 0) {
      const nextAdmin =
        (Array.isArray(conversation.admins) && conversation.admins[0]) ||
        conversation.participants[0];
      conversation.admin = nextAdmin;
      if (!Array.isArray(conversation.admins)) conversation.admins = [nextAdmin] as any;
      if (!(conversation.admins as any).some((a: any) => a.toString() === nextAdmin.toString())) {
        (conversation.admins as any).push(nextAdmin);
      }
    }

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId: conversation._id });
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
