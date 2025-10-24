const prisma = require('../prismaClient');

async function getAllUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      isTechnician: true,
      technicianCategory: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { isAdmin, isTechnician } = req.body || {};

  if (typeof isAdmin !== 'boolean' && typeof isTechnician !== 'boolean') {
    return res.status(400).json({ message: 'Indique pelo menos um papel para atualizar.' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof isAdmin === 'boolean' ? { isAdmin } : {}),
      ...(typeof isTechnician === 'boolean' ? { isTechnician } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      isTechnician: true,
      technicianCategory: true,
    },
  });

  res.json(updated);
}

async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      const ownedRequests = await tx.maintenanceRequest.findMany({
        where: { ownerId: id },
        select: { id: true },
      });
      const ownedRequestIds = ownedRequests.map((request) => request.id);

      if (ownedRequestIds.length) {
        await tx.message.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.feedback.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.maintenanceRequest.deleteMany({ where: { id: { in: ownedRequestIds } } });
      }

      await tx.feedback.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({ where: { senderId: id } });
      await tx.maintenanceRequest.updateMany({
        where: { technicianId: id },
        data: { technicianId: null, status: 'pendente' },
      });

      await tx.user.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar utilizador:', error);
    res.status(400).json({ message: 'Não foi possível eliminar o utilizador.' });
  }
}

async function getAllRequests(req, res) {
  const requests = await prisma.maintenanceRequest.findMany({
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
      feedback: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}

async function deleteRequest(req, res) {
  const { id } = req.params;

  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { requestId: id } }),
      prisma.feedback.deleteMany({ where: { requestId: id } }),
      prisma.maintenanceRequest.delete({ where: { id } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar pedido:', error);
    res.status(400).json({ message: 'Não foi possível eliminar o pedido.' });
  }
}

async function getAllFeedbacks(req, res) {
  const feedbacks = await prisma.feedback.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      request: { select: { id: true, title: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(feedbacks);
}

async function deleteFeedback(req, res) {
  const { id } = req.params;
  await prisma.feedback.delete({ where: { id } });
  res.status(204).send();
}

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRequests,
  deleteRequest,
  getAllFeedbacks,
  deleteFeedback,
};
