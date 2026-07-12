import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "../models/Message";
import Conversation from "../models/Conversation";

interface AuthSocket extends Socket {
  userId?: string;
}

interface SendMessagePayload {
  receiver?: string;
  conversationId?: string;
  content?: string;
  type?: "text" | "image" | "file" | "audio" | "sticker";
  fileUrl?: string;
  fileType?: string;
}

interface TypingPayload {
  receiver?: string;
  conversationId?: string;
}

/* 🟢 Track online users */
const onlineUsers = new Set<string>();

export const setupSocket = (io: Server) => {
  /* ------------------ AUTH MIDDLEWARE ------------------ */
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.query.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication error: No token"));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("JWT_SECRET not configured"));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as { id: string };

      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    if (!socket.userId) return;

    const userId = socket.userId;
    console.log("🟢 User connected:", userId);

    /* JOIN ROOM FOR THIS USER (so io.to(userId) works) */
    socket.join(userId);

    /* ------------------ ONLINE USERS ------------------ */
    onlineUsers.add(userId);
    io.emit("onlineUsers", Array.from(onlineUsers));


    /* ------------------ TYPING INDICATOR ------------------ */
    socket.on("typing", async ({ receiver, conversationId }: TypingPayload) => {
      if (conversationId) {
        // For group conversations, emit to all participants except sender
        const conversation = await Conversation.findById(conversationId).populate("participants");
        if (conversation) {
          conversation.participants.forEach((p: any) => {
            if (p._id.toString() !== userId) {
              io.to(p._id.toString()).emit("typing", { sender: userId, conversationId });
            }
          });
        }
      } else if (receiver) {
        // Direct message typing
        io.to(receiver).emit("typing", { sender: userId });
      }
    });

    socket.on("stopTyping", async ({ receiver, conversationId }: TypingPayload) => {
      if (conversationId) {
        // For group conversations, emit to all participants except sender
        const conversation = await Conversation.findById(conversationId).populate("participants");
        if (conversation) {
          conversation.participants.forEach((p: any) => {
            if (p._id.toString() !== userId) {
              io.to(p._id.toString()).emit("stopTyping", { sender: userId, conversationId });
            }
          });
        }
      } else if (receiver) {
        // Direct message stop typing
        io.to(receiver).emit("stopTyping", { sender: userId });
      }
    });

    /* ------------------ SEND MESSAGE ------------------ */
    socket.on(
      "sendMessage",
      async ({ receiver, conversationId, content, type = "text", fileUrl, fileType }: SendMessagePayload) => {
        let message;
        
        if (conversationId) {
          // Group message
          const conversation = await Conversation.findById(conversationId).populate("participants");
          if (!conversation) return;

          message = await Message.create({
            sender: userId,
            conversationId,
            content,
            type,
            fileUrl,
            fileType,
            status: "sent",
          });

          // Update conversation's lastMessage
          conversation.lastMessage = message._id;
          await conversation.save();

          // Emit to all participants except sender
          const messagePayload = {
            _id: message._id,
            sender: {
              _id: userId,
            },
            conversationId,
            content,
            type,
            fileUrl,
            fileType,
            status: "delivered",
            createdAt: message.createdAt,
          };

          conversation.participants.forEach((p: any) => {
            if (p._id.toString() !== userId) {
              io.to(p._id.toString()).emit("receiveMessage", messagePayload);
            }
          });

          // Also send to sender with "sent" status
          io.to(userId).emit("receiveMessage", {
            ...messagePayload,
            status: "sent",
          });

          io.to(userId).emit("messageDelivered", {
            messageId: message._id,
          });
        } else if (receiver) {
          // Direct message
          message = await Message.create({
            sender: userId,
            receiver,
            content,
            type,
            fileUrl,
            fileType,
            status: "sent",
          });

          const messagePayload = {
            _id: message._id,
            sender: {
              _id: userId,
            },
            receiver: {
              _id: receiver,
            },
            content,
            type,
            fileUrl,
            fileType,
            status: "delivered",
            createdAt: message.createdAt,
          };

          io.to(receiver).emit("receiveMessage", messagePayload);

          io.to(userId).emit("receiveMessage", {
            ...messagePayload,
            status: "sent",
          });

          io.to(userId).emit("messageDelivered", {
            messageId: message._id,
          });
        }
      }
    );

    /* ------------------ REACTIONS ------------------ */
    socket.on("addReaction", async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIdx = message.reactions.findIndex(
          (r) => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingIdx >= 0) {
          message.reactions.splice(existingIdx, 1);
        } else {
          message.reactions.push({
            userId: new mongoose.Types.ObjectId(userId),
            emoji,
          });
        }

        await message.save();

        const reactionPayload = {
          messageId,
          reactions: message.reactions,
        };

        io.to(message.sender.toString()).emit("reactionUpdate", reactionPayload);
        if (message.receiver) {
          io.to(message.receiver.toString()).emit("reactionUpdate", reactionPayload);
        }
        // Also handle conversationId for group messages
        if (message.conversationId) {
          const conversation = await Conversation.findById(message.conversationId).populate("participants");
          if (conversation) {
            conversation.participants.forEach((p: any) => {
              if (p._id.toString() !== userId) {
                io.to(p._id.toString()).emit("reactionUpdate", reactionPayload);
              }
            });
          }
        }
      } catch (err) {
        console.error("Reaction error:", err);
      }
    });

    /* ------------------ MARK AS SEEN ------------------ */
    socket.on("markSeen", async ({ senderId }) => {
      await Message.updateMany(
        {
          sender: senderId,
          receiver: userId,
          status: { $ne: "seen" },
        },
        { status: "seen" }
      );

      io.to(senderId).emit("messagesSeen", {
        receiverId: userId,
      });
    });

    /* ------------------ OFFLINE ------------------ */
    socket.on("disconnect", () => {
      console.log("⚪ User disconnected:", userId);
      onlineUsers.delete(userId);
      io.emit("onlineUsers", Array.from(onlineUsers));
    });
  });
};
