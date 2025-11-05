# Como Obter o GOOGLE_REFRESH_TOKEN

## Passo a Passo Rápido

1. **Acesse o OAuth 2.0 Playground**
   - Vá para: https://developers.google.com/oauthplayground/

2. **Configure suas credenciais**
   - Clique no ícone de engrenagem (⚙️) no canto superior direito
   - Marque a opção **"Use your own OAuth credentials"**
   - Cole suas credenciais:
     - **OAuth Client ID**: `198584272005-en44j0cgf5984viaftamehcn38jvckn7.apps.googleusercontent.com`
     - **OAuth Client secret**: `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`

3. **Selecione o escopo**
   - No painel esquerdo, procure por **"Gmail API v1"**
   - Expanda e selecione: **`https://www.googleapis.com/auth/gmail.send`**

4. **Autorize**
   - Clique no botão **"Authorize APIs"** (canto superior esquerdo)
   - Faça login com a conta Gmail que deseja usar para enviar emails
   - Clique em **"Allow"** para conceder as permissões

5. **Obtenha o Refresh Token**
   - Após autorizar, você verá um código de autorização
   - Clique no botão **"Exchange authorization code for tokens"**
   - O **Refresh Token** aparecerá no campo correspondente
   - **Copie este Refresh Token** - você precisará dele!

## Variáveis para Configurar no Railway

Após obter o Refresh Token, configure no Railway:

```
GOOGLE_CLIENT_ID=198584272005-en44j0cgf5984viaftamehcn38jvckn7.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=cole_o_refresh_token_aqui
GOOGLE_SENDER_EMAIL=seu_email@gmail.com
```

**Nota**: O `GOOGLE_SENDER_EMAIL` deve ser o mesmo email usado para obter o refresh token.

## Importante

- As variáveis `NEXTAUTH_URL` e `NEXTAUTH_SECRET` **não são necessárias** para o envio de emails via Gmail API
- Elas seriam usadas apenas se estivéssemos usando NextAuth para autenticação, mas não é o caso
- Para envio de emails, precisamos apenas das 4 variáveis listadas acima

