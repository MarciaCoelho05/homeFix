const express = require('express');
const prisma = require('../prismaClient');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /api/email/maintenance/:id/schedule-email
router.post('/maintenance/:id/schedule-email', protect, admin, async (req, res) => {
    const { toEmail, subject, body, sendAt } = req.body;
    const id = Number(req.params.id);

    const mr = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
        return res.status(404).json({ message: 'Solicitação de manutenção não encontrada' });
    }

    const schedule = await prisma.scheduledEmail.create({
        data: {
            maintenanceId: id,
            toEmail,
            subject,
            body,
            sendAt: new Date(sendAt)
        }
    });

    res.status(201).json(schedule);
});

module.exports = router;
