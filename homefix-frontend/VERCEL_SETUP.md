# Configuração do Vercel

## Root Directory

Para que o Vercel faça deploy corretamente deste projeto monorepo, é necessário configurar o **Root Directory** no dashboard do Vercel:

1. Acesse o projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** → **General**
3. Na secção **Root Directory**, defina:
   ```
   homefix-frontend
   ```
4. Clique em **Save**

## Configurações de Build

O `vercel.json` já está configurado com:
- **Install Command**: `npm install`
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`

## Verificação

Após configurar o Root Directory, o próximo deploy deve:
1. Fazer build corretamente da pasta `homefix-frontend`
2. Executar os comandos de build na pasta correta
3. Fazer deploy do conteúdo da pasta `dist`

