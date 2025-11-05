# Fluxo de Emails no Sistema HomeFix

Este documento descreve todos os momentos em que emails são enviados automaticamente no sistema.

## 📧 Emails Enviados

### 1. **Quando um Pedido é Criado** (`POST /api/requests`)

#### Email para o Cliente (Confirmação)
- **Assunto**: `Pedido confirmado: [Título do Pedido] - HomeFix`
- **Quando**: Imediatamente após criar um pedido
- **Conteúdo**: 
  - Confirmação de recebimento do pedido
  - Detalhes do pedido (título, categoria, descrição, data preferencial)
  - Informação sobre acompanhamento através do dashboard
- **Arquivo**: `maintenanceRoutes.js` - função `notifyClientAboutRequestCreated()`
- **Linha**: ~743

#### Email para Técnicos (Notificação de Novo Pedido)
- **Assunto**: `⭐ Novo pedido: [Título]` ou `Novo pedido: [Título]` (com ⭐ se for relevante para a categoria do técnico)
- **Quando**: Imediatamente após criar um pedido
- **Destinatários**: Todos os técnicos disponíveis no sistema
- **Conteúdo**:
  - Detalhes do novo pedido
  - Categoria do serviço
  - Dados do cliente (se disponível)
  - Link para ver o pedido no dashboard
  - Se o técnico tem a categoria correspondente, aparece "⭐" e "(Relevante para si)" no assunto
- **Arquivo**: `maintenanceRoutes.js` - função `notifyTechniciansAboutNewRequest()`
- **Linha**: ~997

---

### 2. **Quando um Técnico Aceita um Pedido** (`POST /api/requests/:id/accept`)

#### Email para o Técnico (Confirmação)
- **Assunto**: `Pedido aceite: [Título do Pedido] - HomeFix`
- **Quando**: Imediatamente após o técnico aceitar um pedido
- **Conteúdo**:
  - Confirmação de que aceitou o pedido
  - Detalhes do pedido e cliente
  - Link para o dashboard e chat
- **Arquivo**: `maintenanceRoutes.js` - rota `/:id/accept`
- **Linha**: ~1100

#### Email para o Cliente (Notificação)
- **Assunto**: `O seu pedido foi aceite: [Título do Pedido] - HomeFix`
- **Quando**: Imediatamente após o técnico aceitar um pedido
- **Conteúdo**:
  - Notificação de que o pedido foi aceite
  - Nome do técnico que aceitou
  - Link para o chat e dashboard
- **Arquivo**: `maintenanceRoutes.js` - rota `/:id/accept`
- **Linha**: ~1174

---

### 3. **Quando um Pedido é Concluído** (`PATCH /api/requests/:id/complete`)

#### Email para o Cliente (Conclusão com Fatura)
- **Assunto**: `Serviço concluído: [Título do Pedido] - HomeFix`
- **Quando**: Quando o técnico marca o pedido como concluído
- **Conteúdo**:
  - Notificação de conclusão do serviço
  - Detalhes do serviço realizado
  - Preço do serviço
  - **Anexo**: PDF da fatura (se gerada)
- **Arquivo**: `maintenanceRoutes.js` - função `notifyClientAboutRequestCompleted()`
- **Linha**: ~859

---

### 4. **Quando um Pedido é Eliminado** (`DELETE /api/requests/:id`)

#### Email para o Cliente
- **Assunto**: `Pedido eliminado - HomeFix`
- **Quando**: Quando o dono do pedido o elimina
- **Conteúdo**:
  - Confirmação de eliminação
  - Detalhes do pedido eliminado
- **Arquivo**: `maintenanceRoutes.js` - rota `DELETE /:id`
- **Linha**: ~356

#### Email para o Técnico (se houver)
- **Assunto**: `Pedido eliminado - HomeFix`
- **Quando**: Quando um pedido atribuído a um técnico é eliminado
- **Conteúdo**:
  - Notificação de que o pedido atribuído foi eliminado
  - Detalhes do pedido
- **Arquivo**: `maintenanceRoutes.js` - rota `DELETE /:id`
- **Linha**: ~416

---

### 5. **Outros Emails do Sistema**

#### Recuperação de Palavra-passe (`POST /api/auth/forgot`)
- **Assunto**: `Recuperar palavra-passe - HomeFix`
- **Quando**: Quando o usuário solicita recuperação de senha
- **Conteúdo**: Link para redefinir a senha
- **Arquivo**: `controllers/authControllers.js`
- **Linha**: ~333

#### Atualização de Perfil (`PATCH /api/profile`)
- **Assunto**: `Perfil atualizado - HomeFix`
- **Quando**: Quando o usuário atualiza seu perfil
- **Conteúdo**: Confirmação de atualização com aviso de segurança
- **Arquivo**: `server.js`
- **Linha**: ~291

#### Eliminação de Conta (`DELETE /api/profile`)
- **Assunto**: `Conta eliminada - HomeFix`
- **Quando**: Quando o usuário elimina sua conta
- **Conteúdo**: Confirmação de eliminação e informações sobre dados removidos
- **Arquivo**: `server.js` e `controllers/adminController.js`
- **Linha**: ~403 (server.js), ~147 (adminController.js)

---

## 🔒 Validações e Segurança

Todos os emails são validados antes de serem enviados:

1. **Validação de Email**: Verifica se o email é válido e não está bloqueado
2. **Domínios Bloqueados**: Emails para domínios fictícios (`homefix.com`, `homefix.pt`, etc.) são bloqueados
3. **Mailer-Daemon**: Emails para endereços do Mail Delivery Subsystem são bloqueados
4. **Função `sendEmailSafe()`**: Todos os emails passam por validação antes do envio

---

## 📝 Notas Importantes

- **Preço sem IVA**: Quando o técnico define o preço do serviço, ele é informado que o preço é "sem IVA". O IVA será calculado na fatura se necessário (quando o cliente tem NIF).
- **Emails Assíncronos**: A maioria dos emails é enviada de forma assíncrona (não bloqueia a resposta ao cliente)
- **Logs**: Todos os envios de email são logados no console para depuração
- **Erros**: Se houver erro no envio, o sistema não falha - apenas registra o erro nos logs

---

## 🛠️ Funções Helper

- **`sendEmailSafe(mailOptions)`**: Função que valida e envia emails de forma segura
  - Localização: `maintenanceRoutes.js` (linha ~16)
  - Valida o email antes de enviar
  - Retorna Promise resolvida se o email for bloqueado (não rejeita)

- **`validateEmail(email)`**: Valida se um email é válido e não está bloqueado
  - Localização: `config/email.js` (linha ~18)
  - Retorna: `{ valid: boolean, reason?: string }`

