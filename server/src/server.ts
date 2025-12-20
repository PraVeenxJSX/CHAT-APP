import dotenv from "dotenv";
dotenv.config(); // ✅ MUST BE FIRST

import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db";
import { setupSocket } from "./socket/socket";

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

setupSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
