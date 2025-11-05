# Como Obter o GOOGLE_REFRESH_TOKEN

## ⚠️ Erro "invalid_grant"?

Se você está vendo o erro `invalid_grant`, significa que o `GOOGLE_REFRESH_TOKEN` está inválido. Isso acontece quando:
- O token foi copiado incorretamente
- O token não foi obtido usando o OAuth Playground
- O token foi gerado com credenciais diferentes
- O token expirou ou foi revogado

**Solução**: Siga os passos abaixo para obter um novo refresh token válido.

## Passo a Passo Detalhado

### 1. Acesse o OAuth 2.0 Playground
   - Vá para: https://developers.google.com/oauthplayground/
   - **Importante**: Use este link oficial do Google

### 2. Configure suas credenciais
   - Clique no ícone de **engrenagem (⚙️)** no canto superior direito
   - Marque a opção **"Use your own OAuth credentials"** ✅
   - Cole suas credenciais EXATAS (sem espaços extras):
     - **OAuth Client ID**: 
       ```
       198584272005-en44j0cgf5984viaftamehcn38jvckn7.apps.googleusercontent.com
       ```
     - **OAuth Client secret**: 
       ```
       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
       ```
   - Clique em **"Close"** para salvar

### 3. Selecione o escopo correto
   - No painel **esquerdo**, role até encontrar **"Gmail API v1"**
   - Expanda a seção **"Gmail API v1"**
   - Selecione **APENAS** este escopo:
     ```
     https://www.googleapis.com/auth/gmail.send
     ```
   - ⚠️ **NÃO selecione outros escopos** - apenas o `gmail.send`

### 4. Autorize a aplicação
   - Clique no botão azul **"Authorize APIs"** (canto superior esquerdo)
   - Uma nova janela/aba abrirá pedindo login
   - **Faça login com a conta Gmail que você quer usar para enviar emails**
     - Exemplo: `homefix593@gmail.com`
   - Você verá uma tela de permissões
   - Clique em **"Allow"** ou **"Permitir"** para conceder as permissões

### 5. Obtenha o Refresh Token
   - Após autorizar, você voltará ao OAuth Playground
   - Você verá um **código de autorização** no campo "Authorization code"
   - Clique no botão **"Exchange authorization code for tokens"** (trocar código por tokens)
   - Aguarde alguns segundos
   - Você verá uma resposta JSON com vários campos:
     ```json
     {
       "access_token": "ya29.a0AfB_by...",
       "token_type": "Bearer",
       "expires_in": 3599,
       "refresh_token": "1//0g...",  ← ESTE É O QUE VOCÊ PRECISA!
       "scope": "https://www.googleapis.com/auth/gmail.send"
     }
     ```
   - **Copie o valor do campo `refresh_token`** - é uma string longa que começa com algo como `1//0g...` ou `1//0e...`
   - ⚠️ **Copie o valor COMPLETO** - pode ter mais de 100 caracteres

### 6. Verifique o Refresh Token
   - O refresh token válido normalmente:
     - Tem mais de 50 caracteres
     - Começa com `1//0` ou `1//0e` ou `1//0g`
     - NÃO é igual ao `NEXTAUTH_SECRET`
     - NÃO é igual ao `GOOGLE_CLIENT_SECRET`
     - É diferente do `access_token`

## Variáveis para Configurar no Railway

Após obter o Refresh Token, configure no Railway:

1. Acesse seu projeto no Railway
2. Vá em **"Variables"** ou **"Environment Variables"**
3. Adicione/atualize estas variáveis:

```
GOOGLE_CLIENT_ID=198584272005-en44j0cgf5984viaftamehcn38jvckn7.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=cole_o_refresh_token_completo_aqui
GOOGLE_SENDER_EMAIL=homefix593@gmail.com
```

**⚠️ IMPORTANTE**:
- O `GOOGLE_SENDER_EMAIL` deve ser o **mesmo email** usado para fazer login no OAuth Playground
- O `GOOGLE_REFRESH_TOKEN` deve ser o valor **completo** copiado do campo `refresh_token` no JSON
- **NÃO adicione espaços** antes ou depois dos valores
- **NÃO adicione aspas** nos valores

### Após configurar:
- Salve as variáveis
- O Railway fará um redeploy automaticamente (ou você pode fazer manualmente)
- Aguarde o deploy completar
- Teste novamente o envio de email

## ❌ Erros Comuns

### "invalid_grant"
- **Causa**: Refresh token inválido ou incorreto
- **Solução**: Obtenha um novo refresh token seguindo os passos acima

### "refresh_token não encontrado"
- **Causa**: Você copiou o `access_token` em vez do `refresh_token`
- **Solução**: Certifique-se de copiar o campo `refresh_token` do JSON, não o `access_token`

### "Token expirado"
- **Causa**: O refresh token foi revogado ou a conta foi desautorizada
- **Solução**: Obtenha um novo refresh token no OAuth Playground

## 📝 Notas Importantes

- As variáveis `NEXTAUTH_URL` e `NEXTAUTH_SECRET` **NÃO são necessárias** para o envio de emails via Gmail API
- Elas seriam usadas apenas se estivéssemos usando NextAuth para autenticação, mas não é o caso
- Para envio de emails, precisamos apenas das 4 variáveis listadas acima
- O refresh token é válido até ser revogado manualmente ou a aplicação for desautorizada

