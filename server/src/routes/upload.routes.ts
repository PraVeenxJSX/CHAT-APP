import express, { Request, Response } from "express";
import { upload } from "../middleware/upload";
import { protect } from "../middleware/auth.middleware"

const router = express.Router();

router.post(
  "/",
  protect,
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded" });
    }

    return res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
    });
  }
);

export default router;
