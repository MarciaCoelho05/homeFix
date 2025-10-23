const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token nÃ£o fornecido' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ message: 'Utilizador nÃ£o encontrado' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invÃ¡lido' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin === true) {
        return next();
    }
    return res.status(403).json({ message: 'Acesso negado' });
};

module.exports = { protect, admin };

