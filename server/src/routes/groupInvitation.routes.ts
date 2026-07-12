import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  createGroupInvitation,
  getGroupInvitations,
  acceptGroupInvitation,
  declineGroupInvitation,
  getGroupInviteLink,
  joinGroupByInviteCode,
  promoteToAdmin,
  removeGroupMember,
} from "../controllers/groupInvitation.controller";

const router = Router();

router.get("/invitations", protect, getGroupInvitations);
router.post("/invitations", protect, createGroupInvitation);
router.post("/invitations/:invitationId/accept", protect, acceptGroupInvitation);
router.post("/invitations/:invitationId/decline", protect, declineGroupInvitation);
router.get("/groups/:groupId/invite-link", protect, getGroupInviteLink);
router.post("/join/:inviteCode", protect, joinGroupByInviteCode);
router.post("/groups/promote", protect, promoteToAdmin);
router.post("/groups/remove-member", protect, removeGroupMember);

export default router;