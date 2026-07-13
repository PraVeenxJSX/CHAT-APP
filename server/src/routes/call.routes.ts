import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/ice-servers", protect, (_req, res) => {
  const stunUrls = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
  ];

  const customStun = process.env.STUN_URL;
  if (customStun) stunUrls.unshift(customStun);

  const iceServers: RTCIceServer[] = [{ urls: stunUrls }];

  // Add custom TURN if properly configured with credentials
  const turnUrl = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnPass = process.env.TURN_PASSWORD;

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
