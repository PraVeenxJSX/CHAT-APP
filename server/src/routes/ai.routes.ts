import express from "express";
import { getReplySuggestions } from "../controllers/ai.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/reply-suggestions",
  protect,
  getReplySuggestions
);

export default router;
