# Como Corrigir o Erro "redirect_uri_mismatch"

## ⚠️ Erro que você está vendo:

```
Erro 400: redirect_uri_mismatch
Acesso bloqueado: o pedido da app Homefiz é inválido
```

## 🔧 Solução: Adicionar Redirect URI no Google Cloud Console

### Passo 1: Acessar o Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Faça login com a conta `homefix593@gmail.com` (ou a conta associada ao projeto)
3. Selecione o projeto correto (o que tem o Client ID: `198584272005-en44j0cgf5984viaftamehcn38jvckn7`)

### Passo 2: Editar as Credenciais OAuth

1. No menu lateral esquerdo, vá em **"APIs & Services"** > **"Credentials"**
2. Você verá uma lista de credenciais OAuth 2.0
3. **Encontre o OAuth Client ID** que corresponde ao seu Client ID:
   ```
   198584272005-en44j0cgf5984viaftamehcn38jvckn7.apps.googleusercontent.com
   ```
4. Clique no **ícone de lápis (✏️)** ou no **nome da credencial** para editar

### Passo 3: Adicionar o Redirect URI Autorizado

1. Na página de edição, você verá uma seção **"Authorized redirect URIs"**
2. Clique no botão **"+ ADD URI"** ou **"Add URI"**
3. Adicione exatamente este URI:
   ```
   https://developers.google.com/oauthplayground
   ```
   ⚠️ **IMPORTANTE**: 
   - Copie exatamente como está escrito acima
   - Não adicione barra no final (`/`)
   - Não adicione espaços
   - Deve começar com `https://`

4. Clique em **"SAVE"** ou **"Salvar"** para salvar as alterações

### Passo 4: Aguardar alguns segundos

- O Google pode levar alguns segundos para atualizar as configurações
- Aguarde cerca de 30-60 segundos após salvar

### Passo 5: Tentar novamente no OAuth Playground

1. Volte para: https://developers.google.com/oauthplayground/
2. Se necessário, **atualize a página** (F5)
3. Configure as credenciais novamente (se necessário)
4. Clique em **"Authorize APIs"**
5. Agora deve funcionar! ✅

## 📝 Verificação Visual

Após adicionar o redirect URI, a lista de URIs autorizados deve mostrar:

```
Authorized redirect URIs:
✓ https://developers.google.com/oauthplayground
```

## ❌ Erros Comuns

### "Este URI já está na lista"
- Significa que já está configurado, mas pode estar com espaços extras
- Verifique se há espaços antes ou depois do URI
- Remova e adicione novamente se necessário

### "URI inválido"
- Verifique se está copiando exatamente: `https://developers.google.com/oauthplayground`
- Não adicione `http://` (deve ser `https://`)
- Não adicione barra no final

### "Ainda dá erro após adicionar"
- Aguarde mais tempo (até 2 minutos)
- Feche e reabra o OAuth Playground
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Tente em uma janela anônima/privada

## 🎯 Próximos Passos

Após corrigir o redirect URI e conseguir autorizar no OAuth Playground:

1. Continue seguindo o guia em `GET_REFRESH_TOKEN.md`
2. Obtenha o refresh token
3. Configure no Railway
4. Teste o envio de emails

