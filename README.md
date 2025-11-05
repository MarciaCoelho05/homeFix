# HomeFix - Plataforma de Gestão de Manutenção

## 📋 Visão Geral

**HomeFix** é uma plataforma web completa para gestão de pedidos de manutenção e reparação doméstica. A aplicação conecta clientes que precisam de serviços de manutenção com técnicos especializados, permitindo gestão completa do ciclo de vida dos pedidos, desde a criação até a conclusão e avaliação.

### Funcionalidades Principais

- **Gestão de Pedidos de Manutenção**: Clientes podem criar pedidos com descrição, categoria, imagens e data preferencial
- **Sistema de Atribuição**: Técnicos podem ver e aceitar pedidos disponíveis na sua área de especialização
- **Chat em Tempo Real**: Comunicação entre clientes e técnicos através de mensagens
- **Avaliações e Feedback**: Sistema de rating (1-5 estrelas) com comentários
- **Geração Automática de Faturas**: PDF com cálculos de IVA automáticos
- **Painel de Administração**: Gestão completa de utilizadores, pedidos e feedbacks
- **Chat Flutuante de Suporte**: Botão flutuante para contacto direto com administradores
- **Upload de Mídia**: Suporte para imagens e vídeos nos pedidos
- **Notificações por Email**: Emails automáticos para criação de conta, eliminação, mudanças de estado, etc.

---

## 🏗️ Arquitetura

A aplicação segue uma arquitetura **monorepo** com separação clara entre backend e frontend:

```
HomeFix/
├── homefix-backend/     # API REST em Node.js
└── homefix-frontend/    # Interface React
```

---

## 🔧 Backend

### Tecnologias Utilizadas

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js 5.1.0
- **Base de Dados**: PostgreSQL
- **ORM**: Prisma 6.16.2
- **Autenticação**: JWT (jsonwebtoken 9.0.2)
- **Encriptação**: bcryptjs 3.0.2
- **Email**: Google APIs (Gmail API via googleapis 164.1.0)
- **Upload de Ficheiros**: Cloudinary (cloudinary 1.41.3, multer 2.0.2)
- **PDF**: PDFKit 0.14.0
- **Agendamento**: node-cron 4.2.1
- **CORS**: cors 2.8.5

### Estrutura do Backend

```
homefix-backend/
├── src/
│   ├── server.js              # Servidor principal Express
│   ├── prismaClient.js         # Cliente Prisma
│   ├── config/
│   │   ├── db.js              # Configuração da base de dados
│   │   └── email.js           # Configuração Gmail API + validação
│   ├── controllers/
│   │   ├── authControllers.js # Login, registo, recuperação de senha
│   │   ├── adminController.js # Gestão de utilizadores e dados
│   │   └── messageController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js  # Proteção de rotas (JWT)
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── userRoutes.js      # Autenticação
│   │   ├── maintenanceRoutes.js # CRUD de pedidos
│   │   ├── messageRoutes.js   # Mensagens
│   │   ├── uploadRoutes.js     # Upload Cloudinary
│   │   ├── adminRoutes.js      # Rotas administrativas
│   │   └── publicRoutes.js     # Dados públicos
│   ├── utils/
│   │   ├── emailTemplates.js  # Templates HTML de emails
│   │   ├── pdf.js             # Geração de faturas PDF
│   │   └── cloudinary.js      # Helper Cloudinary
│   ├── worker/
│   │   └── emailWorker.js     # Worker para emails agendados
│   └── scripts/               # Scripts de manutenção
└── prisma/
    ├── schema.prisma          # Schema da base de dados
    └── seed.js                # Dados iniciais
```

### Modelos de Dados (Prisma)

1. **User**: Utilizadores (clientes, técnicos, admins)
   - Autenticação, perfil, categorias de especialização
   
2. **MaintenanceRequest**: Pedidos de manutenção
   - Título, descrição, categoria, estado, preço, mídia
   
3. **Message**: Mensagens do chat
   - Conteúdo, anexos, relação com pedido
   
4. **Feedback**: Avaliações
   - Rating (1-5), comentário, relação com pedido

### Principais Funcionalidades do Backend

- **Autenticação JWT**: Tokens com expiração de 1 hora
- **Validação de Emails**: Sistema robusto para evitar bouncebacks
- **Geração de Faturas PDF**: Cálculo automático de IVA (23% quando aplicável)
- **Worker de Emails**: Processamento assíncrono de emails agendados
- **Upload Seguro**: Validação de tipos e tamanhos de ficheiros
- **CORS Configurado**: Suporte multi-origem
- **Transações de Base de Dados**: Garantia de integridade

### Endpoints Principais

- `POST /api/auth/register` - Registo de utilizador
- `POST /api/auth/login` - Login
- `GET /api/profile` - Perfil do utilizador
- `GET /api/requests` - Listar pedidos
- `POST /api/requests` - Criar pedido
- `POST /api/requests/:id/accept` - Aceitar pedido
- `POST /api/requests/:id/complete` - Concluir pedido
- `GET /api/messages/:requestId` - Mensagens do chat
- `POST /api/messages` - Enviar mensagem
- `GET /api/requests/:id/invoice` - Download de fatura PDF

---

## 🎨 Frontend

### Tecnologias Utilizadas

- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Roteamento**: React Router DOM 7.9.4
- **HTTP Client**: Axios 1.12.2
- **UI Framework**: Bootstrap 5.3.8
- **Gerenciamento de Estado**: React Context API
- **TypeScript**: Suporte via @types (opcional)

### Estrutura do Frontend

```
homefix-frontend/
├── src/
│   ├── App.jsx                 # Componente raiz
│   ├── main.jsx                # Entry point
│   ├── routes.jsx              # Configuração de rotas
│   ├── components/
│   │   ├── Layout.jsx         # Layout principal com navbar
│   │   ├── FloatingChat.jsx   # Chat flutuante de suporte
│   │   ├── HeroBanner.jsx      # Banner hero
│   │   └── Footer.jsx
│   ├── pages/
│   │   ├── Home.jsx            # Página inicial
│   │   ├── Login.jsx           # Autenticação
│   │   ├── Register.jsx        # Registo
│   │   ├── Dashboard.jsx       # Painel principal
│   │   ├── Profile.jsx         # Perfil do utilizador
│   │   ├── NewRequest.jsx      # Criar pedido
│   │   ├── Chat.jsx            # Chat de pedidos
│   │   ├── AdminDashboard.jsx  # Painel administrativo
│   │   ├── ServicesWithFeedback.jsx # Serviços públicos
│   │   └── Schedule.jsx
│   ├── services/
│   │   └── api.js              # Configuração Axios
│   └── contexts/
│       └── SearchContext.jsx   # Context para busca global
```

### Páginas e Funcionalidades

1. **Home** (`/`): Página inicial com carrossel e call-to-action
2. **Login/Registo**: Autenticação com validação de formulários
3. **Dashboard**:
   - **Clientes**: Ver seus pedidos, criar novos, avaliar serviços
   - **Técnicos**: Ver pedidos disponíveis, aceitar, concluir pedidos
   - **Admins**: Visão completa de todos os pedidos
4. **Perfil**: Editar dados pessoais, upload de avatar, eliminar conta
5. **Novo Pedido**: Formulário com upload de mídia, seleção de categoria
6. **Chat**: Comunicação em tempo real com atualização automática
7. **Serviços**: Página pública com feedbacks de serviços concluídos
8. **Admin Dashboard**: Gestão de utilizadores, pedidos, feedbacks

### Características do Frontend

- **Design Responsivo**: Bootstrap para adaptação mobile/desktop
- **Chat Flutuante**: Botão "HF" laranja sempre visível (exceto admins)
- **Notificações**: Contador de mensagens não lidas
- **Validação de Formulários**: Feedback visual de erros
- **Upload de Mídia**: Preview de imagens/vídeos antes do envio
- **Modais**: Confirmações e formulários em modais
- **Loading States**: Indicadores de carregamento
- **Error Handling**: Mensagens de erro amigáveis

---

## 🔐 Segurança

- **Autenticação JWT**: Tokens seguros com expiração
- **Senhas Encriptadas**: bcryptjs com salt rounds
- **Validação de Email**: Regex e lista de domínios bloqueados
- **Proteção de Rotas**: Middleware de autenticação
- **CORS Configurado**: Controle de origens permitidas
- **Validação de Uploads**: Tipos e tamanhos de ficheiros
- **Sanitização**: Validação de inputs do utilizador

---

## 📧 Sistema de Emails

### Tipos de Emails Enviados

1. **Boas-vindas**: Quando conta é criada
2. **Confirmação de Eliminação**: Quando conta é eliminada
3. **Notificação de Pedido**: Cliente cria pedido
4. **Pedido Aceite**: Técnico aceita pedido
5. **Pedido Concluído**: Serviço finalizado
6. **Recuperação de Senha**: Link para reset
7. **Senha Redefinida**: Confirmação de alteração

### Validação de Emails

- Bloqueio de domínios fictícios (homefix.com, example.com, etc.)
- Bloqueio de mailer-daemon
- Validação de formato (regex)
- Verificação de domínio válido

---

## 🗄️ Base de Dados

**PostgreSQL** com Prisma ORM

### Relações

- **User** ↔ **MaintenanceRequest** (1:N)
  - Cliente cria pedidos
  - Técnico é atribuído a pedidos
- **MaintenanceRequest** ↔ **Message** (1:N)
  - Pedido tem múltiplas mensagens
- **MaintenanceRequest** ↔ **Feedback** (1:1)
  - Cada pedido pode ter um feedback
- **User** ↔ **Message** (1:N)
  - Utilizador envia mensagens
- **User** ↔ **Feedback** (1:N)
  - Utilizador deixa feedbacks

---

## 🚀 Deploy

- **Frontend**: Vercel
- **Backend**: Railway / Vercel
- **Base de Dados**: PostgreSQL (Railway/Neon)
- **Storage**: Cloudinary (imagens/vídeos)
- **Email**: Gmail API

### Variáveis de Ambiente Necessárias

**Backend:**
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT
- `GOOGLE_CLIENT_ID` - ID do cliente Gmail API
- `GOOGLE_CLIENT_SECRET` - Secret do cliente Gmail API
- `GOOGLE_REFRESH_TOKEN` - Refresh token Gmail
- `GOOGLE_SENDER_EMAIL` - Email remetente
- `CLOUDINARY_URL` - Configuração Cloudinary
- `APP_URL` - URL da aplicação frontend

**Frontend:**
- `VITE_API_URL` - URL da API backend

---

## 📦 Instalação e Execução

### Backend

```bash
cd homefix-backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

### Frontend

```bash
cd homefix-frontend
npm install
npm run dev
```

---

## 🎯 Casos de Uso

1. **Cliente cria pedido** → Técnicos recebem notificação
2. **Técnico aceita pedido** → Cliente recebe email
3. **Comunicação via chat** → Mensagens em tempo real
4. **Técnico conclui serviço** → Fatura PDF gerada automaticamente
5. **Cliente avalia serviço** → Feedback aparece publicamente
6. **Admin gerencia sistema** → Painel completo de controle

---

## 📊 Estatísticas e Métricas

- **Tipos de Utilizadores**: Cliente, Técnico, Admin
- **Estados de Pedidos**: Pendente, Em Progresso, Concluído
- **Categorias**: Canalização, Eletricidade, Pintura, Remodelações, Jardinagem, Carpintaria, Outro
- **Sistema de Rating**: 1-5 estrelas
- **Suporte a Mídia**: Imagens (JPG, PNG) e Vídeos (MP4, WebM)

---

## 🔄 Fluxo de Trabalho Típico

1. Cliente cria conta e completa perfil
2. Cliente cria pedido com descrição e mídia
3. Técnicos na categoria veem pedido disponível
4. Técnico aceita pedido
5. Comunicação via chat
6. Técnico completa serviço e define preço
7. Fatura PDF é gerada automaticamente
8. Cliente avalia serviço (1-5 estrelas + comentário)
9. Feedback aparece na página pública de serviços

---

## 🛠️ Tecnologias em Detalhe

### Backend Stack
- **Express.js**: Framework web minimalista e flexível
- **Prisma**: ORM type-safe com migrations automáticas
- **PostgreSQL**: Base de dados relacional robusta
- **JWT**: Tokens stateless para autenticação
- **Gmail API**: Envio de emails profissional
- **Cloudinary**: CDN para armazenamento de mídia
- **PDFKit**: Geração programática de PDFs
- **node-cron**: Agendamento de tarefas

### Frontend Stack
- **React 19**: Biblioteca UI moderna com hooks
- **Vite**: Build tool ultra-rápido
- **React Router**: Navegação SPA
- **Bootstrap 5**: Framework CSS responsivo
- **Axios**: Cliente HTTP com interceptors
- **Context API**: Gerenciamento de estado global

---

## 📝 Licença

ISC License

## 👤 Autor

MárciaCoelho

---

**HomeFix** - Conectando clientes e técnicos para soluções de manutenção doméstica.

