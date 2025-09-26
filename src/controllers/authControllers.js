const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const registerUser = async (req, res) => {
    const { name, email, password} = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email já  existe' })
        
    const hasdedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({data: {name, email, password: hasdedPassword}});

    res.status(201).json({ id: user.id, name: user.name, email: user.email, token: generateToken(user.id) });
};

const loginUser = async (req, res) => {
    const { email, password} = req.body;
    const user = await prisma.user.findUnique({ where:{email}})
    if(!user) return res.status(401).json({ message: 'Credenciais inválidas'});

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(401).json({ message: 'Credenciais inválidas'});  

    res.json({ id: user.id, name: user.name, email: user.email, token: generateToken(user.id) });
};

const getProfile = async (req, res) => {
    const user = req.user;
    res.json({ id: user.id, name: user.name, email: user.email });
};

module.exports = { registerUser, loginUser, getProfile };
