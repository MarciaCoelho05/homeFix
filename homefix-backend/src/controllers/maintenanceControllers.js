const prisma = require('../prismaClient');

async function  createRequest(req, res ) {
    const { title, category, price, description } = req.body;
    const request = await prisma.maintenanceRequest.create({
        data: {
            title,
            category,
            price,
            description,
            userId: req.user.id,
            status: "PENDENTE"
        }
    });
    res.status(201).json(request);
    }

async function getMyRequests(req, res) {
    const user = req.user;
    let requests = [];
if ( user.role === "ADMIN" ) {
    requests = await prisma.maintenanceRequest.findMany();
} else if ( user.role === "TECH" ) {
    requests = await prisma.maintenanceRequest.findMany({
        where:  {techId: user.id}   
    });
} else { requests = await prisma.maintenanceRequest.findMany({
    where: { ownerId: user.id}

});

res.json(requests);

}

async function assignTech(req, res) {
    const {techId} = req.body;
    const requestId = Number(req.params.id);
    
    const updated = await prisma.maintenanceRequest.update({
        where: { id: requestId },
        data: { techId, status: "EM_CURSO " },
    });
}
res.json(updated);

}
 module.exports = { createRequest, getMyRequests, assignTech };

