import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import usuarioDAO from '../dao/UsuarioDAO.js';
import passwordResetDAO from '../dao/PasswordResetDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';
import { enviarMailRecuperacion, enviarMailConfirmacionCambio } from '../services/mailService.js';

const MINUTOS_VALIDEZ_LINK = 30;
const sha256 = (txt) => crypto.createHash('sha256').update(txt).digest('hex');

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const usuario = await usuarioDAO.findByEmailConPassword(email);

    // Mismo mensaje si falla el email o la clave: no le doy pistas a un atacante
    const ok = usuario && (await bcrypt.compare(password, usuario.password_hash));
    if (!ok) throw new AppError('Email o contraseña incorrectos', 401);
    if (!usuario.activo) throw new AppError('Tu usuario está dado de baja. Hablá con el administrador.', 403);

    await usuarioDAO.registrarLogin(usuario.id);
    await auditoriaDAO.registrar(usuario.id, 'LOGIN', 'usuarios', usuario.id);

    const perfil = await usuarioDAO.findPublicoById(usuario.id);
    res.json({ ok: true, token: firmarToken(perfil), usuario: perfil });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  -> datos del usuario logueado
export async function me(req, res) {
  res.json({ ok: true, usuario: req.usuario });
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const usuario = await usuarioDAO.findByEmailConPassword(email);

    // Siempre respondo lo mismo, exista o no el mail (evita enumerar usuarios)
    const respuesta = {
      ok: true,
      message: 'Si el email está registrado, te enviamos un link para restablecer la contraseña.',
    };
    if (!usuario || !usuario.activo) return res.json(respuesta);

    const token = crypto.randomBytes(32).toString('hex');

    await withTransaction(async (conn) => {
      await passwordResetDAO.invalidarDeUsuario(usuario.id, conn);
      await passwordResetDAO.crearToken(usuario.id, sha256(token), MINUTOS_VALIDEZ_LINK, conn);
    });

    const link = `${env.frontendUrl}/reset-password?token=${token}`;
    try {
      await enviarMailRecuperacion(usuario, link);
    } catch (mailErr) {
      console.error('[mail] error al enviar:', mailErr.message);
      throw new AppError('No se pudo enviar el correo. Revisá la configuración SMTP.', 502);
    }
    await auditoriaDAO.registrar(usuario.id, 'RECUPERO', 'usuarios', usuario.id, 'Pidió link de recuperación');
    res.json(respuesta);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const registro = await passwordResetDAO.findVigente(sha256(token));
    if (!registro) throw new AppError('El link es inválido o ya venció. Pedí uno nuevo.', 400);

    const hash = await bcrypt.hash(password, 10);
    await withTransaction(async (conn) => {
      await usuarioDAO.update(registro.usuario_id, { password_hash: hash }, conn);
      await passwordResetDAO.update(registro.id, { usado: 1 }, conn);
    });

    const usuario = await usuarioDAO.findPublicoById(registro.usuario_id);
    await auditoriaDAO.registrar(usuario.id, 'RESET_PASS', 'usuarios', usuario.id);
    enviarMailConfirmacionCambio(usuario).catch(() => {}); // aviso, si falla no importa
    res.json({ ok: true, message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/cambiar-password (usuario logueado)
export async function cambiarPassword(req, res, next) {
  try {
    const { actual, nueva } = req.body;
    const usuario = await usuarioDAO.findByEmailConPassword(req.usuario.email);
    if (!(await bcrypt.compare(actual, usuario.password_hash))) {
      throw new AppError('La contraseña actual no es correcta', 400);
    }
    if (actual === nueva) throw new AppError('La nueva contraseña tiene que ser distinta a la actual', 400);

    await usuarioDAO.update(usuario.id, { password_hash: await bcrypt.hash(nueva, 10) });
    await auditoriaDAO.registrar(usuario.id, 'CAMBIO_PASS', 'usuarios', usuario.id);
    res.json({ ok: true, message: 'Contraseña cambiada correctamente' });
  } catch (err) {
    next(err);
  }
}
