const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getBaseEmailTemplate } = require('../utils/emailTemplates');
const mailer = require('../config/email');

let prisma;
try {
  prisma = require('../prismaClient');
} catch (error) {
  console.error('Erro ao carregar Prisma Client no authControllers:', error);
  prisma = null;
}

async function register(req, res) {
  try {
    if (!prisma) {
      return res.status(503).json({ message: 'Serviço temporariamente indisponível - Prisma não inicializado' });
    }
    
    let { email, password, firstName, lastName, nif, birthDate, isTechnician, technicianCategory } = req.body || {};
    const errors = {};
    if (!firstName || !firstName.trim()) errors.firstName = 'Indique o nome';
    if (!lastName || !lastName.trim()) errors.lastName = 'Indique o apelido';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email inválido';
    if (!password || password.length < 6 || !/[^A-Za-z0-9]/.test(password)) errors.password = 'Senha com pelo menos 6 caracteres e 1 carácter especial';
    
    if (nif && nif.trim() && !/^\d{9}$/.test(nif.trim())) {
      errors.nif = 'NIF deve ter 9 dígitos';
    }
    if (!birthDate) {
      errors.birthDate = 'Indique a data de nascimento';
    } else {
      const birth = new Date(birthDate);
      if (Number.isNaN(birth.getTime())) {
        errors.birthDate = 'Data de nascimento inválida';
      } else {
        const today = new Date();
        const oldestAllowed = new Date(today);
        oldestAllowed.setFullYear(today.getFullYear() - 100);
        const youngestAllowed = new Date(today);
        youngestAllowed.setFullYear(today.getFullYear() - 18);
        if (birth < oldestAllowed || birth > youngestAllowed) {
          errors.birthDate = 'Data de nascimento deve indicar idade entre 18 e 100 anos';
        }
      }
    }
    
    if (isTechnician === true) {
      if (!technicianCategory || 
          (Array.isArray(technicianCategory) && technicianCategory.length === 0) ||
          (typeof technicianCategory === 'string' && !technicianCategory.trim())) {
        errors.technicianCategory = 'Selecione pelo menos uma categoria';
      }
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Campos inválidos', errors });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: 'Email já registado', errors: { email: 'Email já registado' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      nif: nif && nif.trim() ? nif.trim() : null,
      birthDate: new Date(birthDate),
      isTechnician: isTechnician === true,
    };
    
    if (isTechnician === true && technicianCategory) {
      if (Array.isArray(technicianCategory)) {
        userData.technicianCategory = technicianCategory.filter(cat => cat && cat.trim()).map(cat => cat.trim());
      } else if (typeof technicianCategory === 'string' && technicianCategory.trim()) {
        userData.technicianCategory = [technicianCategory.trim()];
      } else {
        userData.technicianCategory = [];
      }
    }

    const user = await prisma.user.create({
      data: userData
    });

    sendWelcomeEmail(user).catch((emailError) => {
      console.error('Erro ao enviar email de boas-vindas:', emailError);
    });

    return res.status(201).json({ message: 'Conta criada com sucesso', user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Erro a criar conta' });
  }
}

async function login(req, res) {
  try {
    if (!prisma) {
      return res.status(503).json({ message: 'Serviço temporariamente indisponível - Prisma não inicializado' });
    }
    
    let { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está configurado');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    } catch (dbError) {
      console.error('Erro ao buscar usuário no banco:', dbError);
      return res.status(500).json({ message: 'Erro ao acessar banco de dados' });
    }
    
    if (!user || !user.id) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    if (!user.password) {
      console.error('Usuário sem senha encontrado:', user.id);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (compareError) {
      console.error('Erro ao comparar senha:', compareError);
      return res.status(500).json({ message: 'Erro ao validar senha' });
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    let token;
    try {
      token = jwt.sign({ id: user.id, isAdmin: user.isAdmin === true, isTechnician: user.isTechnician === true }, process.env.JWT_SECRET, { expiresIn: '1h' });
    } catch (tokenError) {
      console.error('Erro ao gerar token JWT:', tokenError);
      return res.status(500).json({ message: 'Erro ao gerar token de autenticação' });
    }
    
    const { password: _password, ...userWithoutPassword } = user;
    
    const safeUser = {
      id: String(userWithoutPassword.id || ''),
      email: String(userWithoutPassword.email || ''),
      firstName: String(userWithoutPassword.firstName || ''),
      lastName: String(userWithoutPassword.lastName || ''),
      nif: userWithoutPassword.nif ? String(userWithoutPassword.nif) : null,
      avatarUrl: userWithoutPassword.avatarUrl ? String(userWithoutPassword.avatarUrl) : null,
      birthDate: userWithoutPassword.birthDate instanceof Date 
        ? userWithoutPassword.birthDate.toISOString() 
        : (userWithoutPassword.birthDate ? new Date(userWithoutPassword.birthDate).toISOString() : null),
      isAdmin: userWithoutPassword.isAdmin === true,
      isTechnician: userWithoutPassword.isTechnician === true,
      createdAt: userWithoutPassword.createdAt instanceof Date 
        ? userWithoutPassword.createdAt.toISOString() 
        : (userWithoutPassword.createdAt ? new Date(userWithoutPassword.createdAt).toISOString() : null),
      updatedAt: userWithoutPassword.updatedAt instanceof Date 
        ? userWithoutPassword.updatedAt.toISOString() 
        : (userWithoutPassword.updatedAt ? new Date(userWithoutPassword.updatedAt).toISOString() : null),
      technicianCategory: []
    };
    
    try {
      const rawCategory = userWithoutPassword.technicianCategory;
      if (rawCategory !== undefined && rawCategory !== null) {
        if (Array.isArray(rawCategory)) {
          safeUser.technicianCategory = rawCategory
            .filter(cat => cat != null)
            .map(cat => String(cat).trim())
            .filter(cat => cat.length > 0);
        } else if (typeof rawCategory === 'string') {
          const trimmed = rawCategory.trim();
          safeUser.technicianCategory = trimmed ? [trimmed] : [];
        } else {
          safeUser.technicianCategory = [];
        }
      }
    } catch (normalizeError) {
      console.error('Erro ao normalizar technicianCategory:', normalizeError);
      console.error('Raw category value:', userWithoutPassword.technicianCategory);
      console.error('Type:', typeof userWithoutPassword.technicianCategory);
      safeUser.technicianCategory = [];
    }
    
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      code: err.code
    });
    return res.status(500).json({ message: 'Erro de autenticação', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

module.exports = { register, login };

async function forgotPassword(req, res) {
  const origin = req.headers.origin;
  const setCorsHeaders = () => {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  };
  
  try {
    console.log('[FORGOT] Iniciando processo de recuperação de senha');
    const { email } = req.body || {};
    console.log('[FORGOT] Email recebido:', email || 'não fornecido');
    
    if (!email) {
      console.log('[FORGOT] Email não fornecido, retornando erro 400');
      setCorsHeaders();
      return res.status(400).json({ message: 'Indique o email' });
    }
    
    console.log('[FORGOT] Buscando usuário no banco de dados...');
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log('[FORGOT] Usuário não encontrado, retornando sucesso (segurança)');
      setCorsHeaders();
      return res.status(200).json({ message: 'Se o email existir, enviaremos instruções' });
    }
    
    console.log('[FORGOT] Usuário encontrado:', user.email);
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ action: 'reset', id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';
    const mailer = require('../config/email');
    
    const text = [
      `Olá ${userName},`,
      '',
      'Recebemos um pedido para redefinir a sua palavra-passe na HomeFix.',
      '',
      'Para redefinir a sua palavra-passe, clique no link abaixo:',
      resetLink,
      '',
      'Este link expira em 15 minutos por motivos de segurança.',
      '',
      'Se não solicitou esta alteração, pode ignorar este email. A sua palavra-passe permanecerá inalterada.',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('HomeFix - Recuperar Palavra-passe')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Recebemos um pedido para redefinir a sua palavra-passe na HomeFix.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Palavra-passe</a>
            </p>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <div class="highlight" style="word-break: break-all;">${resetLink}</div>
            
            <div class="warning-box">
              <strong>⚠️ Importante:</strong> Este link expira em <strong>15 minutos</strong> por motivos de segurança.
            </div>
            
            <p>Se não solicitou esta alteração, pode ignorar este email com segurança. A sua palavra-passe permanecerá inalterada.</p>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;
    
    console.log(`[EMAIL] Tentando enviar email de recuperação para ${email}...`);
    
    try {
      const emailResult = await Promise.race([
        mailer.sendMail({
          from: '"HomeFix" <no-reply@homefix.com>',
          to: email,
          subject: 'Recuperar palavra-passe - HomeFix',
          text,
          html,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao enviar email')), 30000)
        )
      ]);
      
      console.log(`[EMAIL] ✅ Email de recuperação de senha enviado para ${email}`);
      console.log(`[EMAIL] Resultado:`, emailResult?.messageId || 'N/A');
      setCorsHeaders();
      return res.json({ message: 'Se o email existir, enviaremos instruções' });
    } catch (emailError) {
      console.error('[EMAIL] ❌ Erro ao enviar email:', emailError);
      console.error('[EMAIL] Erro detalhado:', emailError.message);
      console.error('[EMAIL] Código:', emailError.code);
      throw emailError;
    }
  } catch (err) {
    console.error('Forgot error:', err);
    setCorsHeaders();
    return res.status(500).json({ message: 'Erro ao enviar email de recuperação' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 6 || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.action !== 'reset') return res.status(400).json({ message: 'Token inválido' });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(400).json({ message: 'Utilizador não existe' });
    
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    
    // Enviar email de confirmação de senha redefinida
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';
    const mailer = require('../config/email');
    
    const text = [
      `Olá ${userName},`,
      '',
      'A sua palavra-passe foi redefinida com sucesso.',
      '',
      'Se não foi você quem fez esta alteração, contacte-nos imediatamente através do nosso suporte.',
      '',
      'Para sua segurança, recomendamos:',
      '- Utilizar uma palavra-passe forte e única',
      '- Não partilhar a sua palavra-passe com ninguém',
      '- Ativar autenticação de dois fatores se disponível',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate('#28a745');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('HomeFix - Palavra-passe Redefinida')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Palavra-passe redefinida com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">A sua nova palavra-passe foi configurada e está ativa.</p>
            </div>
            
            <p>Se não foi você quem fez esta alteração, contacte-nos imediatamente através do nosso suporte.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>🔒 Dicas de segurança:</strong></p>
              <ul style="margin: 8px 0;">
                <li>Utilize uma palavra-passe forte e única</li>
                <li>Não partilhe a sua palavra-passe com ninguém</li>
                <li>Ative autenticação de dois fatores se disponível</li>
                <li>Altere a palavra-passe regularmente</li>
              </ul>
            </div>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await mailer.sendMail({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: user.email,
        subject: 'Palavra-passe redefinida - HomeFix',
        text,
        html,
      });
      console.log(`✅ Email de confirmação de redefinição de senha enviado para ${user.email}`);
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não falhar a redefinição se o email falhar
    }
    
    return res.json({ message: 'Palavra-passe atualizada com sucesso' });
  } catch (err) {
    console.error('Reset error:', err);
    return res.status(400).json({ message: 'Token inválido ou expirado' });
  }
}

// Função auxiliar para enviar email de boas-vindas
async function sendWelcomeEmail(user) {
  try {
    console.log(`📧 Enviando email de boas-vindas para ${user.email}...`);
    
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const loginLink = `${appUrl}/login`;
    const dashboardLink = `${appUrl}/dashboard`;
    const userType = user.isTechnician ? 'técnico' : 'cliente';
    
    const text = [
      `Olá ${userName},`,
      '',
      'Bem-vindo à HomeFix! 🎉',
      '',
      `A sua conta foi criada com sucesso como ${userType}.`,
      '',
      'Aqui estão os seus dados de registo:',
      `Email: ${user.email}`,
      `Nome: ${userName}`,
      `Tipo de conta: ${userType.charAt(0).toUpperCase() + userType.slice(1)}`,
      user.technicianCategory ? `Categoria: ${user.technicianCategory}` : '',
      '',
      user.isTechnician 
        ? 'Como técnico, poderá receber notificações de novos pedidos de serviço e aceitar trabalhos na sua área de especialização.'
        : 'Como cliente, poderá solicitar serviços de manutenção e acompanhar os seus pedidos através do painel.',
      '',
      'Para começar a usar a HomeFix:',
      `1. Aceda à plataforma: ${loginLink}`,
      '2. Faça login com o seu email e senha',
      `3. Explore o painel: ${dashboardLink}`,
      '',
      user.isTechnician
        ? 'Dicas para técnicos:'
        : 'Dicas para começar:',
      user.isTechnician
        ? '• Complete o seu perfil com informações profissionais'
        : '• Crie o seu primeiro pedido de serviço',
      user.isTechnician
        ? '• Mantenha o seu perfil atualizado para receber mais pedidos'
        : '• Acompanhe o estado dos seus pedidos no dashboard',
      user.isTechnician
        ? '• Responda rapidamente aos pedidos dos clientes'
        : '• Comunique com os técnicos através do chat',
      '',
      'Se tiver alguma dúvida ou precisar de ajuda, não hesite em contactar-nos através da aplicação.',
      '',
      'Obrigado por se juntar à HomeFix!',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].filter(Boolean).join('\n');

    const template = getBaseEmailTemplate('#28a745');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('🎉 Bem-vindo à HomeFix!')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Conta criada com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">Bem-vindo à plataforma HomeFix.</p>
            </div>
            
            <p>A sua conta foi registada com sucesso como <strong>${userType}</strong>.</p>
            
            <div class="details">
              <h3>Dados da Conta</h3>
              <ul>
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Nome:</strong> ${userName}</li>
                <li><strong>Tipo:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</li>
                ${user.technicianCategory ? `<li><strong>Categoria:</strong> ${user.technicianCategory}</li>` : ''}
              </ul>
            </div>
            
            ${user.isTechnician ? `
              <div class="info-box">
                <p style="margin: 0;"><strong>📋 Como técnico, pode:</strong></p>
                <ul style="margin: 8px 0;">
                  <li>Receber notificações de novos pedidos</li>
                  <li>Aceitar trabalhos na sua área</li>
                  <li>Comunicar diretamente com clientes</li>
                  <li>Gerir os seus serviços no dashboard</li>
                </ul>
              </div>
            ` : `
              <div class="info-box">
                <p style="margin: 0;"><strong>📋 Como cliente, pode:</strong></p>
                <ul style="margin: 8px 0;">
                  <li>Criar pedidos de serviço</li>
                  <li>Acompanhar o estado dos pedidos</li>
                  <li>Comunicar com técnicos</li>
                  <li>Avaliar os serviços recebidos</li>
                </ul>
              </div>
            `}
            
            <p style="text-align: center;">
              <a href="${loginLink}" class="button">Fazer Login</a>
            </p>
            
            <p style="text-align: center;">
              <a href="${dashboardLink}" style="color: #ff7a00;">Aceder ao Dashboard</a>
            </p>
            
            <p>Se tiver alguma dúvida ou precisar de ajuda, não hesite em contactar-nos através da aplicação.</p>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: user.email,
      subject: 'Bem-vindo à HomeFix - Conta criada com sucesso! 🎉',
      text,
      html,
    });
    
    console.log(`✅ Email de boas-vindas enviado com sucesso para ${user.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    throw error; // Re-throw para que o catch no register possa logar
  }
}

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;
module.exports.register = register;
module.exports.login = login;


