# 🔧 CORREÇÃO: Root Directory no Vercel

## ❌ PROBLEMA DETECTADO
As alterações estão commitadas no Git mas **NÃO aparecem no Vercel**. Isto significa que o **Root Directory** não está configurado corretamente.

## ✅ SOLUÇÃO PASSO-A-PASSO

### 1. Verificar Root Directory no Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto **homefix-frontend**
3. Vá em **Settings** (Configurações)
4. Clique em **Build and Deployment** (ou **General** → **Build and Deployment**)

### 2. Configurar Root Directory

Na secção **"Root Directory"**:

1. **Clique no botão "Edit"** ou no campo de texto
2. Digite: `homefix-frontend`
3. **NÃO** coloque `/` no início ou fim
4. **NÃO** coloque `./` ou `../`
5. Apenas: `homefix-frontend`

### 3. Salvar e Fazer Redeploy

1. Clique em **"Save"**
2. Vá a **Deployments**
3. Clique nos **três pontos** (⋮) no último deploy
4. Selecione **"Redeploy"**
5. **IMPORTANTE**: Desmarque **"Use existing Build Cache"**
6. Clique em **"Redeploy"**

### 4. Verificar se Funcionou

Após 2-3 minutos:
- O título deve mudar para: **"HomeFix - V2.0 - TESTE DEPLOY"**
- Deve aparecer um **banner laranja no topo** com "🚀 DEPLOY V2.0 FUNCIONANDO"
- O botão do chat flutuante deve aparecer (redondo, laranja, com "HF" azul)

## 🔍 COMO VERIFICAR SE ESTÁ CORRETO

### Verificar nos Logs do Build

No Vercel Dashboard → Deployments → Clique no último deploy → **Build Logs**

Procure por:
```
Installing dependencies...
> npm install
Building...
> npm run vercel-build
```

Se aparecer:
```
Error: Cannot find package.json
```
ou
```
Error: Root Directory does not exist
```

**Significa que o Root Directory está errado!**

### Verificar Estrutura do Build

Os logs devem mostrar:
```
/home/runner/work/homeFix/homeFix/homefix-frontend
```

**NÃO** deve mostrar:
```
/home/runner/work/homeFix/homeFix
```

## ⚠️ PROBLEMAS COMUNS

### Problema 1: Root Directory está vazio
**Solução**: Configurar como `homefix-frontend`

### Problema 2: Root Directory tem `/` no início
**Solução**: Remover o `/`, usar apenas `homefix-frontend`

### Problema 3: Root Directory está como `.` ou `./`
**Solução**: Mudar para `homefix-frontend`

### Problema 4: Build diz "no changes detected"
**Solução**: 
1. Fazer redeploy manual
2. Desmarcar "Use existing Build Cache"
3. Verificar se o commit está no GitHub

## 📸 COMO DEVE APARECER

No Vercel Dashboard → Settings → Build and Deployment:

```
Root Directory
───────────────
[homefix-frontend]  ← Campo de texto com este valor
```

**NÃO** deve estar vazio ou com outro valor.

## 🧪 TESTE RÁPIDO

Se após configurar o Root Directory corretamente:
1. O build deve mostrar: `Installing dependencies from homefix-frontend/package.json`
2. O build deve completar sem erros
3. O site deve mostrar as alterações mais recentes

## 🆘 SE AINDA NÃO FUNCIONAR

1. Verificar se o repositório Git está correto:
   - Vercel Dashboard → Settings → Git
   - Deve estar conectado a: `MarciaCoelho05/homeFix`
   - Branch deve ser: `main`

2. Verificar se há múltiplos projetos Vercel:
   - Pode haver um projeto antigo conectado
   - Criar novo projeto ou usar o correto

3. Verificar logs do build para erros específicos

4. Contactar suporte Vercel com:
   - URL do projeto
   - Screenshot do Root Directory configurado
   - Logs do build

