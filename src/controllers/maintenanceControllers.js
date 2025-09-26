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

const listOrders = async (req, res) => {
    try {
        const orders = await prisma.maintenance.findMany({
            where: { userId: req.user.id }
        });
        res.json(orders);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao listar pedidos', error: err.message });
    }
};

const  updateOrder = async (req, res) => {
    const {id} = req.params;
    const{status} = req.body;
    try {
        const order = await prisma.maintenance.update({
            where: { id: Number(id) },
            data: { status },
        });
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao atualizar pedido', error: err.message });
    }
};


module.exports = { createOrder, listOrders, updateOrder };
