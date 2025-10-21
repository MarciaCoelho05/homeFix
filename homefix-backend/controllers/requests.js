const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createRequest = async (req, res) => {
  const { title, description, category, price } = req.body;
  const newRequest = await prisma.maintenanceRequest.create({
    data: {
      title,
      description,
      category,
      price,
      ownerId: req.user.id
    }
  });
  res.json(newRequest);
};

exports.getUserRequests = async (req, res) => {
  const requests = await prisma.maintenanceRequest.findMany({
    where: { ownerId: req.user.id }
  });
  res.json(requests);
};

exports.getAllRequests = async (req, res) => {
  const requests = await prisma.maintenanceRequest.findMany();
  res.json(requests);
};