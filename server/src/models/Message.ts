import mongoose, { Document } from "mongoose";

/* ------------------ INTERFACE ------------------ */
export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;

  content?: string; // optional (files, audio, stickers)

  fileUrl?: string;
  fileType?: string;

  type: "text" | "image" | "file" | "audio" | "sticker";

  status: "sent" | "delivered" | "read";

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
      required: true,
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
  },
  {
    timestamps: true, // ✅ creates createdAt & updatedAt
  }
);

/* ------------------ MODEL ------------------ */
export default mongoose.model<IMessage>("Message", messageSchema);
