const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token ausente' });
    }

const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(401).json({ message: 'User não encontrado' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores'
    });
    }
    next();
};
module.exports = { protect, admin };
