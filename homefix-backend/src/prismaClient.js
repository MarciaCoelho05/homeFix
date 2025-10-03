const { PrismaClient } = require('@prisma/client');

// Share a single PrismaClient instance across the app
const prismaClient = new PrismaClient();

module.exports = prismaClient;


