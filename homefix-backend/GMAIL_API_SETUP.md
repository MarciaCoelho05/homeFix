# Configuração da Gmail API

Este projeto usa a Gmail API para envio de emails. Siga os passos abaixo para configurar as credenciais.

## Passo 1: Criar um Projeto no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o ID do projeto

## Passo 2: Habilitar a Gmail API

1. No menu lateral, vá em **APIs & Services** > **Library**
2. Pesquise por "Gmail API"
3. Clique em **Enable** para habilitar a API

## Passo 3: Criar Credenciais OAuth 2.0

1. Vá em **APIs & Services** > **Credentials**
2. Clique em **Create Credentials** > **OAuth client ID**
3. Se solicitado, configure a tela de consentimento:
   - Escolha **External** (ou Internal se tiver Google Workspace)
   - Preencha os dados obrigatórios
   - **IMPORTANTE**: Adicione o seu email (`homefix593@gmail.com`) como usuário de teste na seção "Test users"
   - Veja o guia detalhado em `FIX_ACCESS_DENIED.md` se encontrar erro "access_denied"
4. Configure o tipo de aplicação:
   - Tipo: **Web application**
   - Nome: HomeFix Email Sender
   - **Authorized redirect URIs**: Clique em **"+ ADD URI"** e adicione:
     ```
     https://developers.google.com/oauthplayground
     ```
     ⚠️ **IMPORTANTE**: Copie exatamente como está, sem barra no final
5. Clique em **Create**
6. **Copie o Client ID e Client Secret** - você precisará deles

**⚠️ Se você já criou as credenciais e está vendo erro `redirect_uri_mismatch`:**
- Veja o guia detalhado em `FIX_REDIRECT_URI.md`
- Ou edite as credenciais existentes e adicione o redirect URI acima

## Passo 4: Obter o Refresh Token

1. Acesse o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Clique no ícone de engrenagem (⚙️) no canto superior direito
3. Marque **Use your own OAuth credentials**
4. Cole o **Client ID** e **Client Secret** obtidos no passo anterior
5. No painel esquerdo, encontre **Gmail API v1**
6. Selecione o escopo: `https://www.googleapis.com/auth/gmail.send`
7. Clique em **Authorize APIs**
8. Faça login com a conta Gmail que deseja usar para enviar emails
9. Clique em **Allow** para conceder as permissões
10. Clique em **Exchange authorization code for tokens**
11. **Copie o Refresh Token** - você precisará dele

## Passo 5: Configurar Variáveis de Ambiente no Railway

No Railway, adicione as seguintes variáveis de ambiente:

```
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REFRESH_TOKEN=seu_refresh_token_aqui
GOOGLE_SENDER_EMAIL=seu_email@gmail.com
```

**Nota**: O `GOOGLE_SENDER_EMAIL` deve ser o mesmo email usado para obter o refresh token no passo 4.

## Verificação

Após configurar as variáveis, o sistema tentará usar a Gmail API automaticamente. Verifique os logs para confirmar que a conexão está funcionando.

## Troubleshooting

- **Erro `redirect_uri_mismatch`**: O redirect URI não está configurado no Google Cloud Console. Veja `FIX_REDIRECT_URI.md` para instruções detalhadas.
- **Erro `access_denied` / "App não concluiu o processo de validação"**: A aplicação está em modo de teste e precisa adicionar usuários de teste. Veja `FIX_ACCESS_DENIED.md` para instruções detalhadas.
- **Erro 401 / `invalid_grant`**: Refresh token inválido ou expirado. Obtenha um novo refresh token seguindo `GET_REFRESH_TOKEN.md`.
- **Erro 403**: Permissões insuficientes. Verifique se o escopo `gmail.send` foi concedido.
- **Erro 429**: Limite de taxa excedido. Aguarde alguns minutos antes de tentar novamente.

