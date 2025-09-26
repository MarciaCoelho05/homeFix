const {PrismaClient }   = require('@prisma/client');
const prisma = new PrismaClient();

const createOrder = async (req, res) => {
    const { title, description} = req.body;
    try {
        const order = await prisma.maintenance.create({
            data: { title, description, userId: req.user.id},
        });
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar pedido', error: err.message });
    }
};

