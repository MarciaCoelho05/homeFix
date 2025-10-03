const prisma = require('../prismaClient');

async function getAllUsers(req, res) {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true },
    });
    res.json(users);
}

async function promoteToTech(req, res) {
    const userID = Number(req.params.id);
    const updated = await prisma.user.update({
        where: { id: userID },
        data: { role: 'TECH' },
    });
    res.json(updated);
}

async function getUserById(req, res) {
    const userID = Number(req.params.id);
    const user = await prisma.user.findUnique({
        where: { id: userID },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, birthDate: true }
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user);
}

async function updateUser(req, res) {
    const userID = Number(req.params.id);
    const { firstName, lastName, birthDate, role } = req.body;
    const updated = await prisma.user.update({
        where: { id: userID },
        data: {
            firstName,
            lastName,
            birthDate: birthDate ? new Date(birthDate) : undefined,
            role
        },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, birthDate: true }
    });
    res.json(updated);
}

async function deleteUser(req, res) {
    const userID = Number(req.params.id);
    const [ownerCount, techCount, sentMessages] = await Promise.all([
        prisma.maintenanceRequest.count({ where: { ownerId: userID } }),
        prisma.maintenanceRequest.count({ where: { techId: userID } }),
        prisma.message.count({ where: { senderId: userID } })
    ]);
    if (ownerCount > 0 || techCount > 0 || sentMessages > 0) {
        return res.status(409).json({
            message: 'Não é possível excluir. Usuário possui registros relacionados'
        });
    }
    await prisma.user.delete({ where: { id: userID } });
    res.status(204).send();
}

module.exports = { getAllUsers, promoteToTech, getUserById, updateUser, deleteUser };

