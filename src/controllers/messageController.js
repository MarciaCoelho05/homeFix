const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();


const sendMessage = async (req, res) => {
    const { content } = req.body;
    try {
        const message = await prisma.message.create({
            data: { content, userId: req.user.id },
        });
        res.status(201).json(message);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao enviar mensagem', error: err.message });
    }
};

const listMessages = async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: { userId: req.user.id }
        });
        res.json(messages);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao listar mensagens', error: err.message });
    }
};

module.exports = { sendMessage, listMessages };
