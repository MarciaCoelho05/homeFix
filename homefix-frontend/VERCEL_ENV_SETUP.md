# ⚙️ Configuração de Variáveis de Ambiente no Vercel

## 🔧 Configurar VITE_API_URL

Para que o frontend em `https://home-fix-beta.vercel.app/` funcione corretamente, é necessário configurar a variável de ambiente `VITE_API_URL` no Vercel.

### Passo 1: Acessar Configurações do Vercel

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto **home-fix-beta** (ou o nome do projeto)
3. Vá em **Settings** → **Environment Variables**

### Passo 2: Adicionar Variável de Ambiente

1. Clique em **"Add New"**
2. **Key**: `VITE_API_URL`
3. **Value**: `https://homefix-production.up.railway.app/api`
4. Selecione os ambientes:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development** (opcional)
5. Clique em **"Save"**

### Passo 3: Fazer Redeploy

Após adicionar a variável:

1. Vá a **Deployments**
2. Clique nos **três pontos** (⋮) no último deploy
3. Selecione **"Redeploy"**
4. Clique em **"Redeploy"**

**IMPORTANTE**: As variáveis de ambiente só são aplicadas em novos deploys!

## 📋 Verificação

Após o redeploy, abra a consola do navegador (F12) e verifique:

```
[API] Using VITE_API_URL: https://homefix-production.up.railway.app/api
```

Se aparecer este log, a configuração está correta!

## 🔍 Troubleshooting

### Problema: Ainda aparece "VITE_API_URL not set"
**Solução**: 
- Verificar se a variável foi adicionada corretamente
- Fazer redeploy após adicionar a variável
- Verificar se o nome está exato: `VITE_API_URL` (case-sensitive)

### Problema: Erros de CORS
**Solução**: 
- Verificar se o backend no Railway permite requests de `https://home-fix-beta.vercel.app`
- Verificar configuração CORS no backend

### Problema: 404 Not Found
**Solução**: 
- Verificar se a URL do backend está correta: `https://homefix-production.up.railway.app/api`
- Testar a URL diretamente no navegador: `https://homefix-production.up.railway.app/api/health`

## 📝 Configuração Atual

- **Frontend URL**: `https://home-fix-beta.vercel.app/`
- **Backend URL**: `https://homefix-production.up.railway.app/api`
- **Variável necessária**: `VITE_API_URL=https://homefix-production.up.railway.app/api`

