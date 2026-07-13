import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/ice-servers", protect, (_req, res) => {
  const urls = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
    // Public TURN servers for testing (metered.ca free tier)
    "turn:turn.metered.ca:443?transport=tcp",
    "turn:turn.metered.ca:443?transport=udp",
  ];

  const turnUser = process.env.TURN_USERNAME;
  const turnPass = process.env.TURN_PASSWORD;
  const turnUrl = process.env.TURN_URL;

  const iceServers: RTCIceServer[] = [{ urls }];

  // Add custom TURN if configured
  if (turnUrl && turnUser && turnPass) {
    iceServers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnPass,
    });
  }

  res.json({ iceServers });
});

export default router;
