import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";
import {
  getUserConversations,
  getOrCreateDirect,
  createGroup,
  updateGroup,
  deleteGroup,
  muteGroup,
  promoteAdmin,
  demoteAdmin,
  getConversationMessages,
  leaveGroup,
} from "../controllers/conversation.controller";

const router = Router();

router.get("/", protect, getUserConversations);
router.post("/direct", protect, getOrCreateDirect);
router.post("/group", protect, createGroup);
router.put("/:id", protect, upload.single("avatar"), updateGroup);
router.delete("/:id", protect, deleteGroup);
router.post("/:id/mute", protect, muteGroup);
router.post("/:id/admins/:userId", protect, promoteAdmin);
router.delete("/:id/admins/:userId", protect, demoteAdmin);
router.get("/:conversationId/messages", protect, getConversationMessages);
router.post("/:id/leave", protect, leaveGroup);

export default router;
