const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');

async function register(req, res) {
    const { email, password, firstName, lastName, birthDate } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data:{
            email,
            password: hashedPassword,
            firstName,
            lastName,
            birthDate: birthDate ? new Date(birthDate) : null,
            role: 'CLIENT'
        }
    });
    res.status(201).json({ message: 'Conta criada com sucesso', user });
}

async function login (req, res) {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if( !user || !(await bcrypt.compare(password, user.password)) ) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const token = jwt.sign({id: user.id, role: user.role}, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user });
}

module.exports = { register, login };
