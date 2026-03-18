import mongoose, { Document } from "mongoose";

/* ------------------ INTERFACE ------------------ */
export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver?: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;

  content?: string; // optional (files, audio, stickers)

  fileUrl?: string;
  fileType?: string;

  type: "text" | "image" | "file" | "audio" | "sticker";

  status: "sent" | "delivered" | "read";

  reactions: { userId: mongoose.Types.ObjectId; emoji: string }[];

  createdAt: Date;
  updatedAt: Date;
}

/* ------------------ SCHEMA ------------------ */
const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    content: {
      type: String,
      required: function () {
        return this.type === "text";
      },
    },

    fileUrl: {
      type: String,
    },

    fileType: {
      type: String, // image/png, application/pdf, audio/webm etc.
    },

    type: {
      type: String,
      enum: ["text", "image", "file", "audio", "sticker"],
      default: "text",
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  {
    timestamps: true, // ✅ creates createdAt & updatedAt
  }
);

/* ------------------ MODEL ------------------ */
export default mongoose.model<IMessage>("Message", messageSchema);
