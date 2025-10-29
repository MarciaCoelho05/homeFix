const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');

async function register(req, res) {
  try {
    let { email, password, firstName, lastName, birthDate, isTechnician, technicianCategory } = req.body || {};
    const errors = {};
    if (!firstName || !firstName.trim()) errors.firstName = 'Indique o nome';
    if (!lastName || !lastName.trim()) errors.lastName = 'Indique o apelido';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email inválido';
    if (!password || password.length < 6 || !/[^A-Za-z0-9]/.test(password)) errors.password = 'Senha com pelo menos 6 caracteres e 1 carácter especial';
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
    
    // Validar categoria se for técnico
    if (isTechnician === true && (!technicianCategory || !technicianCategory.trim())) {
      errors.technicianCategory = 'Indique a categoria do técnico';
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Campos inválidos', errors });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email já registado', errors: { email: 'Email já registado' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      birthDate: new Date(birthDate),
      isTechnician: isTechnician === true,
    };
    
    // Adicionar categoria apenas se for técnico e tiver categoria
    if (isTechnician === true && technicianCategory && technicianCategory.trim()) {
      userData.technicianCategory = technicianCategory.trim();
    }

    const user = await prisma.user.create({
      data: userData
    });
    return res.status(201).json({ message: 'Conta criada com sucesso', user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Erro a criar conta' });
  }
}

async function login(req, res) {
  try {
    let { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin, isTechnician: user.isTechnician }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { password: _password, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Erro de autenticação' });
  }
}

module.exports = { register, login };

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Indique o email' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: 'Se o email existir, enviaremos instruções' });
    
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff7a00; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #ff7a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0; border-radius: 4px; }
          .footer { margin-top: 24px; font-size: 12px; color: #666; }
          .link { word-break: break-all; color: #ff7a00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">HomeFix - Recuperar Palavra-passe</h2>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Recebemos um pedido para redefinir a sua palavra-passe na HomeFix.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Palavra-passe</a>
            </p>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p class="link">${resetLink}</p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este link expira em <strong>15 minutos</strong> por motivos de segurança.
            </div>
            
            <p>Se não solicitou esta alteração, pode ignorar este email com segurança. A sua palavra-passe permanecerá inalterada.</p>
            
            <div class="footer">
              <p>Atenciosamente,<br>Equipa HomeFix</p>
              <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: email,
      subject: 'Recuperar palavra-passe - HomeFix',
      text,
      html,
    });
    
    console.log(`Email de recuperação de senha enviado para ${email}`);
    return res.json({ message: 'Se o email existir, enviaremos instruções' });
  } catch (err) {
    console.error('Forgot error:', err);
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 16px 0; border-radius: 4px; }
          .security-box { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 16px; margin: 16px 0; border-radius: 4px; }
          .footer { margin-top: 24px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">HomeFix - Palavra-passe Redefinida</h2>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Palavra-passe redefinida com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">A sua nova palavra-passe foi configurada e está ativa.</p>
            </div>
            
            <p>Se não foi você quem fez esta alteração, contacte-nos imediatamente através do nosso suporte.</p>
            
            <div class="security-box">
              <p style="margin: 0;"><strong>🔒 Dicas de segurança:</strong></p>
              <ul style="margin: 8px 0;">
                <li>Utilize uma palavra-passe forte e única</li>
                <li>Não partilhe a sua palavra-passe com ninguém</li>
                <li>Ative autenticação de dois fatores se disponível</li>
                <li>Altere a palavra-passe regularmente</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Atenciosamente,<br>Equipa HomeFix</p>
              <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
            </div>
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
      console.log(`Email de confirmação de redefinição de senha enviado para ${user.email}`);
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

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;


