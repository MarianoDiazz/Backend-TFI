import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import usuarioDAO from '../dao/UsuarioDAO.js';

// Verifica el token JWT que manda el frontend en el header Authorization
export async function verificarToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) throw new AppError('Tenés que iniciar sesión', 401);

    const payload = jwt.verify(token, env.jwt.secret);

    // Vuelvo a leer el usuario: si lo dieron de baja, el token deja de servir
    const usuario = await usuarioDAO.findPublicoById(payload.id);
    if (!usuario || !usuario.activo) throw new AppError('Usuario inactivo o inexistente', 401);

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('La sesión expiró, volvé a ingresar', 401));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Token inválido', 401));
    next(err);
  }
}

// Permite el paso solo a los roles indicados. Ej: permitirRoles('ADMIN', 'RECEPCIONISTA')
export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return next(new AppError('Tenés que iniciar sesión', 401));
    if (!roles.includes(req.usuario.rol)) return next(AppError.forbidden());
    next();
  };
}
