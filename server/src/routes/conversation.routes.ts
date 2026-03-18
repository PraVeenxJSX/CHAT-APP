import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";
import {
  getUserConversations,
  getOrCreateDirect,
  createGroup,
  updateGroup,
  getConversationMessages,
  leaveGroup,
} from "../controllers/conversation.controller";

const router = Router();

router.get("/", protect, getUserConversations);
router.post("/direct", protect, getOrCreateDirect);
router.post("/group", protect, createGroup);
router.put("/:id", protect, upload.single("avatar"), updateGroup);
router.get("/:conversationId/messages", protect, getConversationMessages);
router.post("/:id/leave", protect, leaveGroup);

export default router;
