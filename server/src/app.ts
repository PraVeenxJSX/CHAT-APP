import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes";
import aiRoutes from "./routes/ai.routes";
import uploadRoutes from "./routes/upload.routes";
import conversationRoutes from "./routes/conversation.routes";





const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/uploads", express.static("uploads"));


export default app;
