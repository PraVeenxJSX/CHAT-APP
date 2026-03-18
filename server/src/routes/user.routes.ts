import express from "express";
import { getUsers, getUserById, updateProfile } from "../controllers/user.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload";

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/profile", protect, upload.single("avatar"), updateProfile);

export default router;
