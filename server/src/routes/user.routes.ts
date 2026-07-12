import express from "express";
import { getUsers, getUserById, getMe, updateProfile, checkUsername } from "../controllers/user.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";

const router = express.Router();

router.get("/check-username", protect, checkUsername);
router.get("/", protect, getUsers);
router.get("/profile", protect, getMe);
router.get("/:id", protect, getUserById);
router.put("/profile", protect, upload.single("avatar"), updateProfile);

export default router;
