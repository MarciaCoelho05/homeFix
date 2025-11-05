# Como Corrigir o Erro "access_denied" / "A app não concluiu o processo de validação"

## ⚠️ Erro que você está vendo:

```
Erro 403: access_denied
A app Homefiz não concluiu o processo de validação da Google.
A app está a ser testada e só pode ser acedida por testadores aprovados pelo programador.
```

## 🔧 Solução: Configurar a Tela de Consentimento OAuth

Este erro ocorre porque a aplicação OAuth está em modo de teste e não tem usuários de teste configurados. Siga os passos abaixo:

### Passo 1: Acessar a Tela de Consentimento OAuth

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto correto (homefix-477318)
3. No menu lateral esquerdo, vá em **"APIs & Services"** > **"OAuth consent screen"**
4. Se você nunca configurou, você verá um formulário. Se já configurou, você verá uma página de configuração

### Passo 2: Configurar a Tela de Consentimento (Se necessário)

Se você está criando pela primeira vez:

1. **User Type**: Selecione **"External"** (para contas pessoais do Google)
   - Se você tiver Google Workspace, pode escolher "Internal"
2. Clique em **"CREATE"**

3. **App Information**:
   - **App name**: `HomeFix`
   - **User support email**: Selecione `homefix593@gmail.com`
   - **App logo**: Opcional (pode deixar vazio)
   - **App domain**: Opcional (pode deixar vazio)
   - **Application home page**: `https://homefix-frontend.vercel.app`
   - **Application privacy policy link**: Opcional (pode deixar vazio)
   - **Application terms of service link**: Opcional (pode deixar vazio)
   - **Authorized domains**: Deixe vazio por enquanto

4. Clique em **"SAVE AND CONTINUE"**

5. **Scopes**:
   - Clique em **"ADD OR REMOVE SCOPES"**
   - Na lista, procure por **"Gmail API"**
   - Selecione o escopo: `https://www.googleapis.com/auth/gmail.send`
   - Clique em **"UPDATE"**
   - Clique em **"SAVE AND CONTINUE"**

6. **Test users** (ESTE É O PASSO MAIS IMPORTANTE!):
   - Clique em **"+ ADD USERS"**
   - Adicione o email que você vai usar para fazer login no OAuth Playground:
     ```
     homefix593@gmail.com
     ```
   - Clique em **"ADD"**
   - Você pode adicionar outros emails se necessário
   - Clique em **"SAVE AND CONTINUE"**

7. **Summary**:
   - Revise as informações
   - Clique em **"BACK TO DASHBOARD"**

### Passo 3: Se a Tela de Consentimento já existe

Se você já configurou antes:

1. Vá em **"APIs & Services"** > **"OAuth consent screen"**
2. Role até a seção **"Test users"**
3. Clique em **"+ ADD USERS"**
4. Adicione o email: `homefix593@gmail.com`
5. Clique em **"SAVE"**

### Passo 4: Verificar se está em modo de teste

1. Na página da tela de consentimento, verifique o status no topo
2. Você deve ver algo como: **"Publishing status: Testing"**
3. Isso significa que está em modo de teste (OK para desenvolvimento)

### Passo 5: Tentar novamente no OAuth Playground

1. Aguarde 1-2 minutos após adicionar o usuário de teste
2. Volte para: https://developers.google.com/oauthplayground/
3. Se necessário, **limpe o cache do navegador** (Ctrl+Shift+Delete)
4. Configure as credenciais novamente
5. Clique em **"Authorize APIs"**
6. **IMPORTANTE**: Faça login com o email que você adicionou como testador (`homefix593@gmail.com`)
7. Agora deve funcionar! ✅

## 📝 Verificação

Após configurar, você deve ver na tela de consentimento:

- **Publishing status**: Testing
- **Test users**: 
  - `homefix593@gmail.com` ✓

## ❌ Erros Comuns

### "Este email não está na lista de testadores"
- Verifique se você adicionou o email correto na seção "Test users"
- Certifique-se de que está fazendo login no OAuth Playground com o mesmo email

### "Ainda dá erro após adicionar"
- Aguarde mais tempo (até 2 minutos)
- Limpe o cache do navegador completamente
- Tente fazer logout e login novamente no Google
- Certifique-se de que está usando o email correto

### "Não consigo ver a seção Test users"
- Verifique se o "Publishing status" está como "Testing"
- Se estiver como "In production", você precisa voltar para "Testing" ou publicar a app

## 🎯 Alternativa: Publicar a Aplicação (Não recomendado para desenvolvimento)

Se você quiser que qualquer pessoa possa usar a aplicação (não recomendado para desenvolvimento):

1. Na tela de consentimento, role até o final
2. Clique em **"PUBLISH APP"**
3. Siga as instruções de verificação do Google
4. Isso pode levar dias para ser aprovado

**⚠️ Para desenvolvimento, mantenha em modo "Testing" e adicione apenas os emails de teste necessários.**

## 🎯 Próximos Passos

Após corrigir o access_denied e conseguir autorizar no OAuth Playground:

1. Continue seguindo o guia em `GET_REFRESH_TOKEN.md`
2. Obtenha o refresh token
3. Configure no Railway
4. Teste o envio de emails

