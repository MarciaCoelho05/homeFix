
import prisma from '../lib/prisma.js';

// GET /api/requests?status=concluido
export async function getRequests(req, res) {
  const { status } = req.query;

  try {
    const where = status ? { status: status.toLowerCase() } : {};
    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        feedback: {
          include: {
            user: {
              select: { firstName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: 'Erro interno ao buscar pedidos.' });
  }
}
