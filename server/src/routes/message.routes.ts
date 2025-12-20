import express from "express";
import { getChatHistory } from "../controllers/message.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/:userId", protect, getChatHistory);

export default router;
