import { Router } from "express";
import {schemaPrisma} from "../../prisma/schema.prisma";
import { auth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/maintenance/:id/schedule-email", auth(), async (req, res) => {
    const { toEmail, sunject, body, sendAt } = req.body;
    const id = Number(req.params.id);

  const mr = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!mr) return res.status(404).json({ error: "Pedido não encontrado" });

  const schedule = await prisma.scheduledEmail.create({
    data: { maintenanceId: id, toEmail, subject, body, sendAt: new Date(sendAt) },
  });

  res.status(201).json(schedule);
});

export default router;