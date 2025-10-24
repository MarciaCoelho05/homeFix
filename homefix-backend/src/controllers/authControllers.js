const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');

async function register(req, res) {
  try {
    let { email, password, firstName, lastName, birthDate } = req.body || {};
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
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Campos inválidos', errors });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email já registado', errors: { email: 'Email já registado' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, birthDate: new Date(birthDate) }
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
    const mailer = require('../config/email');
    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: email,
      subject: 'Recuperar palavra-passe',
      html: `<p>Para redefinir a sua palavra-passe, clique no link:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Este link expira em 15 minutos.</p>`
    });
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
    return res.json({ message: 'Palavra-passe atualizada com sucesso' });
  } catch (err) {
    console.error('Reset error:', err);
    return res.status(400).json({ message: 'Token inválido ou expirado' });
  }
}

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword = resetPassword;


