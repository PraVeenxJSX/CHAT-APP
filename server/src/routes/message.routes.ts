import express from "express";
import { getChatHistory, searchMessages } from "../controllers/message.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/search", protect, searchMessages);
router.get("/:userId", protect, getChatHistory);

export default router;
