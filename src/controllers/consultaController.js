import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { hoyISO } from '../utils/helpers.js';
import consultaDAO from '../dao/ConsultaDAO.js';
import turnoDAO from '../dao/TurnoDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';

// POST /api/consultas -> el médico atiende: guarda la consulta y marca el turno ATENDIDO
export async function crear(req, res, next) {
  try {
    const datos = req.body;
    const turno = await turnoDAO.findDetalle(datos.turno_id);
    if (!turno) throw AppError.notFound('Turno');
    if (turno.medico_id !== req.usuario.medico_id) {
      throw AppError.forbidden('Solo el médico del turno puede registrar la consulta');
    }
    if (!['PENDIENTE', 'CONFIRMADO'].includes(turno.estado)) {
      throw new AppError(`El turno está ${turno.estado}; no se puede registrar la consulta`);
    }
    if (turno.fecha > hoyISO()) throw new AppError('No se puede atender un turno de una fecha futura');

    // Transacción: si falla cualquiera de los dos pasos, no queda nada a medias
    const id = await withTransaction(async (conn) => {
      if (await consultaDAO.findByTurno(turno.id, conn)) throw AppError.conflict('Ese turno ya tiene consulta');
      const nuevoId = await consultaDAO.create(datos, conn);
      await turnoDAO.update(turno.id, { estado: 'ATENDIDO' }, conn);
      await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'consultas', nuevoId, `Turno ${turno.id}`, conn);
      return nuevoId;
    });

    res.status(201).json({ ok: true, data: await consultaDAO.findDetalle(id) });
  } catch (err) {
    next(err);
  }
}

// GET /api/consultas/:id
export async function obtener(req, res, next) {
  try {
    const consulta = await consultaDAO.findDetalle(req.params.id);
    if (!consulta) throw AppError.notFound('Consulta');
    res.json({ ok: true, data: consulta });
  } catch (err) {
    next(err);
  }
}

// PUT /api/consultas/:id -> corrección de la consulta (solo el mismo médico)
export async function actualizar(req, res, next) {
  try {
    const consulta = await consultaDAO.findDetalle(req.params.id);
    if (!consulta) throw AppError.notFound('Consulta');
    if (consulta.medico_id !== req.usuario.medico_id) {
      throw AppError.forbidden('Solo el médico que atendió puede modificar la consulta');
    }
    await consultaDAO.update(consulta.id, req.body);
    await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', 'consultas', consulta.id);
    res.json({ ok: true, data: await consultaDAO.findDetalle(consulta.id) });
  } catch (err) {
    next(err);
  }
}
