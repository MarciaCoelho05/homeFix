# Configuração de Email

## Opção 1: Gmail (Recomendado para produção)

### Passos para configurar Gmail:

1. **Ative a Verificação em 2 Etapas:**
   - Aceda ao seu [Google Account](https://myaccount.google.com/)
   - Vá para **Segurança**
   - Ative **Verificação em 2 etapas** (se ainda não estiver ativada)

2. **Gere uma App Password:**
   - Ainda em **Segurança**, procure por **Senhas de app**
   - Clique em **Senhas de app**
   - Selecione **E-mail** e **Outro (nome personalizado)**
   - Digite "HomeFix" como nome
   - Copie a senha gerada (16 caracteres, sem espaços)

3. **Configure as variáveis de ambiente:**

```env

```

⚠️ **IMPORTANTE:** 
- Use o **email completo** como `SMTP_USER`
- Use a **App Password** gerada (não a sua senha normal do Gmail)
- A App Password pode ter espaços - pode deixar com espaços ou remover, ambos funcionam
- Nome do token: "homefix" (configurado no Google Account)

---

## Opção 2: Mailtrap (Para desenvolvimento/teste)

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=bb1d8a3acdfc8e
SMTP_PASS=3f97e5a12f28f9
```

---

## Opção 3: Mailtrap API (Recomendado para Railway/Produção)

### API de Envio Real (Sending API)

Para enviar emails reais usando Mailtrap Sending API:

```env
MAILTRAP_API_TOKEN=seu-token-aqui
MAILTRAP_API_TYPE=sending
```

**Como obter o token:**
1. Aceda ao [Mailtrap](https://mailtrap.io/)
2. Vá para **Settings → API Tokens**
3. Gere um novo token com permissão "Send emails"
4. Copie o token completo (o token completo, não apenas os últimos caracteres)

**Exemplo de configuração:**
```env
MAILTRAP_API_TOKEN=432ade3337ee129cd3c724bd4b042e93
MAILTRAP_API_TYPE=sending
```

⚠️ **IMPORTANTE:** Use o token completo fornecido pelo Mailtrap. O token mostrado na interface pode estar parcialmente oculto (ex: `****2e93`), mas você precisa do token completo.

**Nota:** A API de envio real não precisa de `MAILTRAP_INBOX_ID`

### API Sandbox (Para testes)

Para testar emails sem enviar realmente:

```env
MAILTRAP_API_TOKEN=seu-token-aqui
MAILTRAP_API_TYPE=sandbox
MAILTRAP_INBOX_ID=0
```

---

## Como testar

Após configurar as variáveis de ambiente:

1. Reinicie o servidor
2. Verifique os logs ao iniciar - deve ver:
   ```
   [EMAIL] ✅ Usando SMTP
   [EMAIL]   SMTP Host: smtp.gmail.com
   [EMAIL]   SMTP Port: 587
   ```
3. Tente enviar um email de recuperação de senha
4. Verifique os logs para ver se foi enviado com sucesso

---

## Resolução de problemas

### Erro de autenticação Gmail:
- Certifique-se de que está a usar **App Password** e não a senha normal
- Verifique se a Verificação em 2 etapas está ativada
- Confirme que copiou a App Password corretamente (sem espaços)

### Erro de conexão:
- Verifique se `SMTP_HOST` está correto
- Para Gmail, use `smtp.gmail.com` e porta `587`
- Verifique a sua conexão de internet

### Railway/Heroku bloqueia SMTP:
- Considere usar Mailtrap API em vez de SMTP
- Ou use um serviço como SendGrid, Mailgun, etc.

