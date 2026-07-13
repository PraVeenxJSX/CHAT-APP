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

  io.on("connection", async (socket: AuthSocket) => {
    if (!socket.userId) return;

    const userId = socket.userId;
    console.log("🟢 User connected:", userId);

    /* JOIN ROOM FOR THIS USER (so io.to(userId) works) */
    socket.join(userId);

    /* JOIN ALL CONVERSATION ROOMS so group call events can be routed */
    try {
      const convos = await Conversation.find({ participants: userId }).select("_id");
      convos.forEach((c) => socket.join(c._id.toString()));
    } catch (err) {
      console.error("Failed to join conversation rooms:", err);
    }

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

          if (conversation.type === "group" && conversation.onlyAdminsCanMessage) {
            const isAllowed = (id: string) =>
              conversation.admin?.toString() === id ||
              (Array.isArray(conversation.admins) &&
                conversation.admins.some((a: any) => a.toString() === id));
            if (!isAllowed(userId)) {
              socket.emit("sendMessageError", {
                conversationId,
                message: "Only admins can send messages in this group",
              });
              return;
            }
          }

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

    /* ------------------ CALL SIGNALING ------------------ */
    type CallTarget =
      | { kind: "direct"; partnerId: string }
      | { kind: "group"; conversationId: string };

    /* call:invite — caller rings one or many, server fans out invite to each */
    socket.on(
      "call:invite",
      async (
        payload: {
          callId: string;
          type: "audio" | "video";
          target: CallTarget;
          caller: { _id: string; name: string; avatar?: string };
        },
        ack?: (response: { ok: boolean; recipients: string[] }) => void
      ) => {
        try {
          let recipients: string[] = [];
          if (payload.target.kind === "direct") {
            recipients = [payload.target.partnerId];
          } else {
            const conv = await Conversation.findById(payload.target.conversationId);
            if (!conv) {
              ack?.({ ok: false, recipients: [] });
              return;
            }
            recipients = conv.participants
              .map((p: any) => p.toString())
              .filter((id: string) => id !== userId);
          }
          recipients.forEach((rid) => {
            io.to(rid).emit("call:invite", {
              callId: payload.callId,
              type: payload.type,
              conversationId:
                payload.target.kind === "group"
                  ? payload.target.conversationId
                  : undefined,
              fromUserId: userId,
              caller: payload.caller,
            });
          });
          ack?.({ ok: true, recipients });
        } catch (err) {
          console.error("call:invite error:", err);
          ack?.({ ok: false, recipients: [] });
        }
      }
    );

    /* call:cancel — caller withdraws before anyone accepts */
    socket.on("call:cancel", ({ callId, recipients }: { callId: string; recipients: string[] }) => {
      const list = recipients || [];
      list.forEach((rid) => io.to(rid).emit("call:cancel", { callId }));
    });

    /* call:accept — recipient accepts; route to caller (direct) or conversation room (group) */
    socket.on(
      "call:accept",
      ({
        callId,
        conversationId,
        to,
        acceptedBy,
      }: {
        callId: string;
        conversationId?: string;
        to?: string;
        acceptedBy: { _id: string; name: string; avatar?: string };
      }) => {
        const event = { callId, acceptedBy };
        if (conversationId) {
          // Group call — emit to the conversation room (sockets joined on connect)
          socket.to(conversationId).emit("call:accept", event);
        } else if (to) {
          // Direct call — send only to the caller
          io.to(to).emit("call:accept", event);
        } else {
          // Fallback — should not happen, but emit to all as safety net
          console.warn("call:accept missing both conversationId and to");
          io.emit("call:accept", event);
        }
      }
    );

    /* call:reject — recipient declines */
    socket.on(
      "call:reject",
      ({ callId, to, reason }: { callId: string; to?: string; reason?: string }) => {
        if (to) {
          io.to(to).emit("call:reject", { callId, by: userId, reason });
        }
      }
    );

    /* call:busy — recipient already in another call */
    socket.on("call:busy", ({ callId, to }: { callId: string; to: string }) => {
      if (to) io.to(to).emit("call:busy", { callId, by: userId });
    });

    /* call:offer — SDP offer (mesh) */
    socket.on(
      "call:offer",
      ({
        callId,
        to,
        from,
        sdp,
      }: {
        callId: string;
        to: string;
        from: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        io.to(to).emit("call:offer", { callId, to, from, sdp });
      }
    );

    /* call:answer — SDP answer */
    socket.on(
      "call:answer",
      ({
        callId,
        to,
        from,
        sdp,
      }: {
        callId: string;
        to: string;
        from: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        io.to(to).emit("call:answer", { callId, to, from, sdp });
      }
    );

    /* call:ice — candidate exchange */
    socket.on(
      "call:ice",
      ({
        callId,
        to,
        from,
        candidate,
      }: {
        callId: string;
        to: string;
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        io.to(to).emit("call:ice", { callId, to, from, candidate });
      }
    );

    /* call:toggle — mic/cam state broadcast so UI shows it */
    socket.on(
      "call:toggle",
      ({
        callId,
        kind,
        enabled,
        to,
        conversationId,
      }: {
        callId: string;
        kind: "mic" | "cam";
        enabled: boolean;
        to?: string;
        conversationId?: string;
      }) => {
        const event = { callId, from: userId, kind, enabled };
        if (conversationId) {
          io.to(conversationId).emit("call:toggle", event);
        } else if (to) {
          io.to(to).emit("call:toggle", event);
        }
      }
    );

    /* call:hangup — end the call for everyone in scope */
    socket.on(
      "call:hangup",
      ({
        callId,
        to,
        conversationId,
      }: {
        callId: string;
        to?: string;
        conversationId?: string;
      }) => {
        const event = { callId, by: userId };
        if (conversationId) {
          io.to(conversationId).emit("call:hangup", event);
        }
        if (to) io.to(to).emit("call:hangup", event);
      }
    );

    /* ------------------ OFFLINE ------------------ */
    socket.on("disconnect", () => {
      console.log("⚪ User disconnected:", userId);
      onlineUsers.delete(userId);
      io.emit("onlineUsers", Array.from(onlineUsers));
    });
  });
};
