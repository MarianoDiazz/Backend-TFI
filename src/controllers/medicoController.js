import bcrypt from 'bcryptjs';
import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { limpiar } from '../utils/helpers.js';
import medicoDAO from '../dao/MedicoDAO.js';
import usuarioDAO from '../dao/UsuarioDAO.js';
import turnoDAO from '../dao/TurnoDAO.js';
import { especialidadDAO } from '../dao/CatalogoDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';

// GET /api/medicos
export async function listar(req, res, next) {
  try {
    const data = await medicoDAO.listar({
      especialidad_id: req.query.especialidad_id,
      soloActivos: req.query.activos === '1',
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/medicos/:id
export async function obtener(req, res, next) {
  try {
    const medico = await medicoDAO.findDetalle(req.params.id);
    if (!medico) throw AppError.notFound('Médico');
    res.json({ ok: true, data: medico });
  } catch (err) {
    next(err);
  }
}

// POST /api/medicos -> crea el usuario y el médico en una sola transacción
export async function crear(req, res, next) {
  try {
    const { nombre, apellido, email, password, matricula, especialidad_id, telefono } = req.body;
    if (await usuarioDAO.emailExiste(email)) throw AppError.conflict('Ya hay un usuario con ese email');
    if (await medicoDAO.matriculaExiste(matricula)) throw AppError.conflict('Esa matrícula ya está registrada');
    if (!(await especialidadDAO.findById(especialidad_id))) throw new AppError('La especialidad no existe');

    const hash = await bcrypt.hash(password, 10);
    const medicoId = await withTransaction(async (conn) => {
      const usuarioId = await usuarioDAO.create(
        { nombre, apellido, email, password_hash: hash, rol_id: 2 }, conn
      );
      const id = await medicoDAO.create({ usuario_id: usuarioId, matricula, especialidad_id, telefono }, conn);
      await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'medicos', id, `${apellido}, ${nombre}`, conn);
      return id;
    });

    res.status(201).json({ ok: true, data: await medicoDAO.findDetalle(medicoId) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/medicos/:id -> actualiza datos de las dos tablas juntas
export async function actualizar(req, res, next) {
  try {
    const medico = await medicoDAO.findDetalle(req.params.id);
    if (!medico) throw AppError.notFound('Médico');

    const { nombre, apellido, email, activo, matricula, especialidad_id, telefono } = req.body;
    if (email && (await usuarioDAO.emailExiste(email, medico.usuario_id))) {
      throw AppError.conflict('Ya hay un usuario con ese email');
    }
    if (matricula && (await medicoDAO.matriculaExiste(matricula, medico.id))) {
      throw AppError.conflict('Esa matrícula ya está registrada');
    }
    if (activo === 0 && (await turnoDAO.contarFuturosDeMedico(medico.id)) > 0) {
      throw new AppError('El médico tiene turnos pendientes. Reprogramalos o cancelalos antes de darlo de baja.');
    }

    await withTransaction(async (conn) => {
      await usuarioDAO.update(medico.usuario_id, limpiar({ nombre, apellido, email, activo }), conn);
      await medicoDAO.update(medico.id, limpiar({ matricula, especialidad_id, telefono }), conn);
    });
    await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', 'medicos', medico.id);
    res.json({ ok: true, data: await medicoDAO.findDetalle(medico.id) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/medicos/:id -> baja lógica del usuario del médico
export async function baja(req, res, next) {
  try {
    const medico = await medicoDAO.findDetalle(req.params.id);
    if (!medico) throw AppError.notFound('Médico');
    if ((await turnoDAO.contarFuturosDeMedico(medico.id)) > 0) {
      throw new AppError('El médico tiene turnos pendientes. Reprogramalos o cancelalos antes de darlo de baja.');
    }
    await usuarioDAO.update(medico.usuario_id, { activo: 0 });
    await auditoriaDAO.registrar(req.usuario.id, 'BAJA', 'medicos', medico.id);
    res.json({ ok: true, message: 'Médico dado de baja' });
  } catch (err) {
    next(err);
  }
}
