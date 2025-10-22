const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

function getUserFromToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const user = getUserFromToken(req);
    const { title, description, category, price } = req.body;

    const newRequest = await prisma.maintenanceRequest.create({
      data: {
        title,
        description,
        category,
        price,
        ownerId: user.id
      }
    });

    res.status(201).json(newRequest);
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 401 : 500).json({ message: err.message });
  }
};