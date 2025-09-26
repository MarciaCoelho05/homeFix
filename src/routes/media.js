import { Router } from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../services/cloudinary.js";
import {schemaprisma} from "../../prisma/schema.prisma";
import { auth} from "../middlewares/authMiddleware.js";

const router = Router();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homefix_media',
        resource_type: 'auto',
    },
});
const upload = multer({ storage: storage });

router.post("/messages/:id/media", auth, upload.single("file"), async (req, res) => {
    const messageId = Number(req.params.id);
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "Ficheiro Obrigatorio" });
    }

    const media = await Prisma.media.create({
        data: {
            url: file.path,
            kind: file.mimetype.startsWith("image/") ? "IMAGE" : "VIDEO",
            messageId,
        },
    });
    res.status(201).json(media);
});

export default router;
