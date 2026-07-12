import mongoose, { Document } from "mongoose";

export interface IMutedMember {
  userId: mongoose.Types.ObjectId;
  until?: Date;
}

export interface IConversation extends Document {
  type: "direct" | "group";
  participants: mongoose.Types.ObjectId[];
  name?: string;
  avatar?: string;
  description?: string;
  admin?: mongoose.Types.ObjectId;
  admins?: mongoose.Types.ObjectId[];
  onlyAdminsCanMessage?: boolean;
  disappearingMessagesSeconds?: number;
  mutedMembers?: IMutedMember[];
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new mongoose.Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    description: { type: String, default: "" },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    onlyAdminsCanMessage: { type: Boolean, default: false },
    disappearingMessagesSeconds: { type: Number, default: 0 },
    mutedMembers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        until: { type: Date },
      },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ username: 1 });

export default mongoose.model<IConversation>("Conversation", conversationSchema);
