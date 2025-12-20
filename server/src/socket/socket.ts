import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message";

interface AuthSocket extends Socket {
  userId?: string;
}

interface SendMessagePayload {
  receiver: string;
  content: string;
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
    socket.on("typing", ({ receiver }) => {
      io.to(receiver).emit("typing", { sender: userId });
    });

    socket.on("stopTyping", ({ receiver }) => {
      io.to(receiver).emit("stopTyping", { sender: userId });
    });

    /* ------------------ SEND MESSAGE ------------------ */
    socket.on(
      "sendMessage",
      async ({ receiver, content }: SendMessagePayload) => {
        // 💾 Save message
        const message = await Message.create({
          sender: userId,
          receiver,
          content,
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
          status: "delivered",
          createdAt: message.createdAt,
        };

        // 📩 Send to receiver
        io.to(receiver).emit("receiveMessage", messagePayload);

        // 📩 ALSO send to sender (🔥 THIS WAS MISSING)
        io.to(userId).emit("receiveMessage", {
          ...messagePayload,
          status: "sent",
        });

        // ✔✔ Notify sender that message is delivered
        io.to(userId).emit("messageDelivered", {
          messageId: message._id,
        });
      }
    );

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
