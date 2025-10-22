const prisma = require('../prismaClient');

async function sendMessage(req, res){
    const { content, media } = req.body;
    const maintenanceId = Number(req.params.id);
    
    const message = await prisma.message.create({
        data: {
            content,
            senderId: req.user.id,
            maintenanceId,
            media:{
                create: (media || []).map(item =>({
                    url: item.url,
                    type: item.type
                }))
            }
        },
        include: { media: true }
    });
    res.status(201).json(message);
}

async function getMessages(req, res) {
    const maintenanceId = Number(req.params.id);

    const messages = await prisma.message.findMany({
        where:{ maintenanceId },
        include: { media: true, sender: true },
        orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
}
module.exports = { sendMessage, getMessages };
