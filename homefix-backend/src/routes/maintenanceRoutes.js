const express = require('express');
const prisma = require('../prismaClient');
const { protect, admin } = require('../middlewares/authMiddleware');
const { sendMessage, getMessages } = require('../controllers/messageController');

const router = express.Router();

router.get('/', protect, admin, async (req, res) => {
    const requests = await prisma.maintenanceRequest.findMany({
        include: { owner: true, tech: true, messages: true }
    });
    res.json(requests);
});


router.post('/', protect, async (req, res) => {
    const { title, description, category, price } = req.body;
    const request = await prisma.maintenanceRequest.create({
        data: {
            title,
            description,
            category,
            price,
            ownerId: req.user.id
        }
    });
    res.status(201).json(request);
});

router.get('/:id', protect, async (req, res) => {
    const id = Number(req.params.id);
    const request = await prisma.maintenanceRequest.findUnique({
        where: { id },
        include: { owner: true, tech: true, messages: true }
    });
    if (!request) return res.status(404).json({ message: 'Não encontrado' });
    res.json(request);
});

// Update
router.put('/:id', protect, async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, category, price, status, techId } = req.body;
    const updated = await prisma.maintenanceRequest.update({
        where: { id },
        data: { title, description, category, price, status, techId }
    });
    res.json(updated);
});

// Delete
router.delete('/:id', protect, async (req, res) => {
    const id = Number(req.params.id);
    await prisma.maintenanceRequest.delete({ where: { id } });
    res.status(204).send();
});

// Messages for a maintenance request
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, sendMessage);

module.exports = router;