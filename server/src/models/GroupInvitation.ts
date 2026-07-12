import mongoose, { Document } from "mongoose";

export interface IGroupInvitation extends Document {
  groupId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedUser: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined" | "expired";
  inviteCode?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const groupInvitationSchema = new mongoose.Schema<IGroupInvitation>(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending",
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

groupInvitationSchema.index({ groupId: 1, invitedUser: 1 }, { unique: true });
groupInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IGroupInvitation>("GroupInvitation", groupInvitationSchema);