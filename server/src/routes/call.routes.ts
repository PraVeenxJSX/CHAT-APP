import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/ice-servers", protect, (_req, res) => {
  const urls = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
  ];

  const custom = process.env.STUN_URL;
  if (custom) urls.unshift(custom);

  res.json({
    iceServers: [{ urls }, { urls: "stun:stun.metered.ca:3478" }],
  });
});

export default router;
