# Deploy no Vercel - HomeFix

Este guia explica como fazer deploy do projeto HomeFix no Vercel.

## Estrutura do Projeto

- **Backend**: `homefix-backend/` - API Node.js/Express
- **Frontend**: `homefix-frontend/` - React/Vite

## Pré-requisitos

1. Conta no Vercel: https://vercel.com/signup
2. GitHub conectado ao Vercel
3. Base de dados Neon (ou outra PostgreSQL) configurada
4. Cloudinary configurado para uploads

## Deploy do Backend

### 1. Instalar Vercel CLI (se ainda não tiver)
```bash
npm install -g vercel
```

### 2. Fazer login no Vercel
```bash
vercel login
```

### 3. Deploy do Backend
```bash
cd homefix-backend
vercel
```

Seguir as instruções:
- Link projeto? **N** (criar novo)
- Nome do projeto: `homefix-backend`
- Diretório: **.** (ponto)
- Ajustar configurações? **N** (aceitar padrão)
- Build command: deixar em branco
- Output directory: deixar em branco
- Install command: `npm install`

### 4. Configurar Variáveis de Ambiente no Vercel

No dashboard do Vercel, ir para Settings → Environment Variables e adicionar:

```
DATABASE_URL=postgresql://... (sua URL do Neon)
JWT_SECRET=seu_jwt_secret
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
NODE_ENV=production
```

### 5. Configurar Prisma no Build

No dashboard do Vercel → Settings → Build & Development Settings:

- Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
- Output Directory: (deixar vazio)

### 6. Deploy Manual (se necessário)
```bash
vercel --prod
```

## Deploy do Frontend

### 1. Deploy do Frontend
```bash
cd homefix-frontend
vercel
```

Seguir as instruções:
- Link projeto? **N** (criar novo)
- Nome do projeto: `homefix-frontend`
- Diretório: **.** (ponto)
- Ajustar configurações? **N** (aceitar padrão)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

### 2. Configurar Variáveis de Ambiente

No dashboard do Vercel do frontend:

```
VITE_API_URL=https://homefix-backend.vercel.app/api
```

### 3. Deploy Manual
```bash
vercel --prod
```

## Configuração de Domínio Customizado (Opcional)

No Vercel, você pode:
1. Ir para Settings → Domains
2. Adicionar seu domínio customizado
3. Configurar DNS conforme instruções do Vercel

## Troubleshooting

### Backend não conecta à base de dados
- Verificar DATABASE_URL no Vercel
- Verificar firewall da Neon (permitir Vercel IPs)

### Erro de Prisma no build
```bash
cd homefix-backend
npm install
npx prisma generate
```

### Frontend não acessa API
- Verificar VITE_API_URL
- Verificar CORS no backend

### Upload não funciona
- Verificar Cloudinary credentials
- Verificar tamanho máximo de upload

## Comandos Úteis

```bash
# Ver logs do Vercel
vercel logs

# Ver deployments
vercel ls

# Remover deployment
vercel remove

# Promover deployment para produção
vercel promote <deployment-url>
```

## URLs Exemplo

Após o deploy:
- Backend: `https://homefix-backend.vercel.app`
- Frontend: `https://homefix-frontend.vercel.app`

## Verificar Deploy

1. Abrir https://homefix-frontend.vercel.app
2. Testar login
3. Criar pedido
4. Verificar API

## Automatização

O Vercel automaticamente:
- Faz deploy a cada push no GitHub (se conectado)
- Cria preview deployments para PRs
- Faz rollback em caso de erro

## Suporte

Para problemas:
1. Verificar logs no dashboard do Vercel
2. Verificar Environment Variables
3. Verificar Build Logs

