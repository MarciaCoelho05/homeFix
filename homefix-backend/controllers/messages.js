const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.sendMessage = async (req, res) => {
  const { content, coreEntityId } = req.body;
  const message = await prisma.message.create({
    data: {
      content,
      coreEntityId,
      senderId: req.user.id
    }
  });
  res.json(message);
};

exports.getMessages = async (req, res) => {
  const { requestId } = req.params;
  const messages = await prisma.message.findMany({
    where: { coreEntityId: parseInt(requestId) },
    orderBy: { createdAt: 'asc' }
  });
  res.json(messages);
};