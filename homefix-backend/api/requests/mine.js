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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const user = getUserFromToken(req);

    const requests = await prisma.maintenanceRequest.findMany({
      where: { ownerId: user.id }
    });

    res.status(200).json(requests);
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 401 : 500).json({ message: err.message });
  }
};