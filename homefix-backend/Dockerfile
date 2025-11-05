FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./

COPY prisma ./prisma/

RUN npm ci --ignore-scripts --legacy-peer-deps

RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .

RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]

