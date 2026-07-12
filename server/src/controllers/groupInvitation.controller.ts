import { Request, Response } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation";
import GroupInvitation from "../models/GroupInvitation";
import { generateInviteCode } from "../utils/generateInviteCode";
import { AuthRequest } from "../middleware/auth.middleware";

export const createGroupInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { groupId, userIds } = req.body;

    if (!groupId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Group ID and user IDs required" });
    }

    const conversation = await Conversation.findById(groupId);
    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Not a group conversation" });
    }

    if (conversation.admin?.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can invite members" });
    }

    const existingMembers = new Set(conversation.participants.map((p) => p.toString()));
    const newInvites = userIds.filter((id) => !existingMembers.has(id));

    if (newInvites.length === 0) {
      return res.status(400).json({ message: "All users are already members" });
    }

    const invitations = [];
    for (const invitedUserId of newInvites) {
      const existing = await GroupInvitation.findOne({
        groupId,
        invitedUser: invitedUserId,
        status: "pending",
      });

      if (!existing) {
        const inviteCode = generateInviteCode();
        const invitation = await GroupInvitation.create({
          groupId,
          invitedBy: userId,
          invitedUser: invitedUserId,
          inviteCode,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        invitations.push(invitation);
      }
    }

    const populatedInvitations = await GroupInvitation.find({
      _id: { $in: invitations.map((i) => i._id) },
    }).populate("invitedUser", "name email avatar");

    res.status(201).json(populatedInvitations);
  } catch (err) {
    console.error("Create group invitation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getGroupInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const invitations = await GroupInvitation.find({
      invitedUser: userId,
      status: "pending",
    })
      .populate("groupId", "name avatar participants admin")
      .populate("invitedBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (err) {
    console.error("Get group invitations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptGroupInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { invitationId } = req.params;

    const invitation = await GroupInvitation.findById(invitationId)
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.invitedUser.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: `Invitation already ${invitation.status}` });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({ message: "Invitation expired" });
    }

    const conversation = await Conversation.findById(invitation.groupId);
    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      conversation.participants.push(new mongoose.Types.ObjectId(userId));
      await conversation.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar")
      .populate("admin", "name");

    res.json({ conversation: populatedConversation, invitation });
  } catch (err) {
    console.error("Accept group invitation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const declineGroupInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { invitationId } = req.params;

    const invitation = await GroupInvitation.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.invitedUser.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: `Invitation already ${invitation.status}` });
    }

    invitation.status = "declined";
    await invitation.save();

    res.json({ message: "Invitation declined" });
  } catch (err) {
    console.error("Decline group invitation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getGroupInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { groupId } = req.params;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.admin?.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can generate invite link" });
    }

    const inviteCode = generateInviteCode();
    const invitation = await GroupInvitation.create({
      groupId,
      invitedBy: userId,
      invitedUser: userId,
      inviteCode,
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/join/${inviteCode}`;

    res.json({ inviteLink, invitation });
  } catch (err) {
    console.error("Get group invite link error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinGroupByInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { inviteCode } = req.params;

    const invitation = await GroupInvitation.findOne({ inviteCode })
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ message: "Invalid invite link" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: `Invitation already ${invitation.status}` });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({ message: "Invitation expired" });
    }

    const conversation = await Conversation.findById(invitation.groupId);
    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      conversation.participants.push(new mongoose.Types.ObjectId(userId));
      await conversation.save();
    }

    invitation.status = "accepted";
    invitation.invitedUser = new mongoose.Types.ObjectId(userId);
    await invitation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar")
      .populate("admin", "name");

    res.json({ conversation: populatedConversation, invitation });
  } catch (err) {
    console.error("Join group by invite code error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const promoteToAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { groupId, userId: targetUserId } = req.body;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.admin?.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can promote members" });
    }

    if (!conversation.participants.some((p) => p.toString() === targetUserId)) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    conversation.admin = new mongoose.Types.ObjectId(targetUserId);
    await conversation.save();

    const populated = await conversation.populate("participants", "name email avatar");
    res.json(populated);
  } catch (err) {
    console.error("Promote to admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeGroupMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { groupId, userId: targetUserId } = req.body;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || conversation.type !== "group") {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.admin?.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ message: "Cannot remove yourself, use leave group" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== targetUserId
    );

    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(groupId);
      return res.json({ message: "Group deleted as no members remain" });
    }

    await conversation.save();

    const populated = await conversation.populate("participants", "name email avatar");
    res.json(populated);
  } catch (err) {
    console.error("Remove group member error:", err);
    res.status(500).json({ message: "Server error" });
  }
};