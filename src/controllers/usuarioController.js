import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import usuarioDAO from '../dao/UsuarioDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';
import { query } from '../config/db.js';

// GET /api/usuarios
export async function listar(req, res, next) {
  try {
    const data = await usuarioDAO.listar(req.query);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/roles
export async function listarRoles(req, res, next) {
  try {
    res.json({ ok: true, data: await query('SELECT * FROM roles ORDER BY id') });
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/:id
export async function obtener(req, res, next) {
  try {
    const usuario = await usuarioDAO.findPublicoById(req.params.id);
    if (!usuario) throw AppError.notFound('Usuario');
    res.json({ ok: true, data: usuario });
  } catch (err) {
    next(err);
  }
}

// POST /api/usuarios  (los médicos se crean desde /api/medicos)
export async function crear(req, res, next) {
  try {
    const { password, ...datos } = req.body;
    if (datos.rol_id === 2) {
      throw new AppError('Para dar de alta un médico usá la sección Médicos (necesita matrícula y especialidad)');
    }
    if (await usuarioDAO.emailExiste(datos.email)) throw AppError.conflict('Ya hay un usuario con ese email');

    const id = await usuarioDAO.create({ ...datos, password_hash: await bcrypt.hash(password, 10) });
    await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'usuarios', id, datos.email);
    res.status(201).json({ ok: true, data: await usuarioDAO.findPublicoById(id) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/usuarios/:id
export async function actualizar(req, res, next) {
  try {
    const id = req.params.id;
    const actual = await usuarioDAO.findPublicoById(id);
    if (!actual) throw AppError.notFound('Usuario');

    const { password, ...datos } = req.body;
    if (datos.email && (await usuarioDAO.emailExiste(datos.email, id))) {
      throw AppError.conflict('Ya hay un usuario con ese email');
    }
    // Un médico no puede cambiar de rol (tiene turnos y matrícula asociados)
    if (datos.rol_id && actual.medico_id && datos.rol_id !== 2) {
      throw new AppError('Este usuario es médico; no se le puede cambiar el rol');
    }
    if (datos.rol_id === 2 && !actual.medico_id) {
      throw new AppError('Para que sea médico hay que darlo de alta desde la sección Médicos');
    }
    // No me puedo quedar sin administradores activos
    const dejaDeSerAdmin = actual.rol_id === 1 && (datos.rol_id && datos.rol_id !== 1 || datos.activo === 0);
    if (dejaDeSerAdmin && (await usuarioDAO.contarAdminsActivos()) <= 1) {
      throw new AppError('Tiene que quedar al menos un administrador activo');
    }
    if (password) datos.password_hash = await bcrypt.hash(password, 10);

    await usuarioDAO.update(id, datos);
    await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', 'usuarios', id);
    res.json({ ok: true, data: await usuarioDAO.findPublicoById(id) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/usuarios/:id  -> baja lógica (no borro para no perder el historial)
export async function baja(req, res, next) {
  try {
    const id = req.params.id;
    if (id === req.usuario.id) throw new AppError('No podés darte de baja a vos mismo');
    const usuario = await usuarioDAO.findPublicoById(id);
    if (!usuario) throw AppError.notFound('Usuario');
    if (usuario.rol_id === 1 && (await usuarioDAO.contarAdminsActivos()) <= 1) {
      throw new AppError('Tiene que quedar al menos un administrador activo');
    }
    await usuarioDAO.update(id, { activo: 0 });
    await auditoriaDAO.registrar(req.usuario.id, 'BAJA', 'usuarios', id);
    res.json({ ok: true, message: 'Usuario dado de baja' });
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/auditoria
export async function auditoria(req, res, next) {
  try {
    res.json({ ok: true, data: await auditoriaDAO.ultimos(Number(req.query.limite) || 100) });
  } catch (err) {
    next(err);
  }
}
