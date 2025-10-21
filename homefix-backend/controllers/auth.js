const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

exports.register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName }
  });

  res.json({ message: 'User registered', user: { id: user.id, email: user.email } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, process.env.JWT_SECRET);
  res.json({ token });
};