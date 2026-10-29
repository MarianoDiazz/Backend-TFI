import { AppError } from '../utils/AppError.js';
import { normalizarHora } from '../utils/helpers.js';
import horarioDAO from '../dao/HorarioDAO.js';
import medicoDAO from '../dao/MedicoDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';

// Un médico solo puede tocar sus propios horarios
function controlarDueño(req, medicoId) {
  if (req.usuario.rol === 'MEDICO' && req.usuario.medico_id !== Number(medicoId)) {
    throw AppError.forbidden('Solo podés administrar tus propios horarios');
  }
}

async function prepararDatos(body) {
  const datos = {
    ...body,
    hora_inicio: normalizarHora(body.hora_inicio),
    hora_fin: normalizarHora(body.hora_fin),
  };
  if (!(await medicoDAO.findById(datos.medico_id))) throw new AppError('El médico no existe');
  return datos;
}

// GET /api/horarios?medico_id=
export async function listar(req, res, next) {
  try {
    const medicoId = req.query.medico_id || req.usuario.medico_id;
    if (!medicoId) throw new AppError('Indicá el médico');
    res.json({ ok: true, data: await horarioDAO.listarPorMedico(medicoId) });
  } catch (err) {
    next(err);
  }
}

// POST /api/horarios
export async function crear(req, res, next) {
  try {
    controlarDueño(req, req.body.medico_id);
    const datos = await prepararDatos(req.body);
    if (await horarioDAO.haySuperposicion(datos)) {
      throw AppError.conflict('Esa franja se superpone con otra del mismo día');
    }
    const id = await horarioDAO.create(datos);
    await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'horarios_atencion', id);
    res.status(201).json({ ok: true, data: await horarioDAO.findById(id) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/horarios/:id
export async function actualizar(req, res, next) {
  try {
    const actual = await horarioDAO.findById(req.params.id);
    if (!actual) throw AppError.notFound('Horario');
    controlarDueño(req, actual.medico_id);
    const datos = await prepararDatos({ ...req.body, medico_id: actual.medico_id });
    if (await horarioDAO.haySuperposicion(datos, actual.id)) {
      throw AppError.conflict('Esa franja se superpone con otra del mismo día');
    }
    await horarioDAO.update(actual.id, datos);
    await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', 'horarios_atencion', actual.id);
    res.json({ ok: true, data: await horarioDAO.findById(actual.id) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/horarios/:id
export async function eliminar(req, res, next) {
  try {
    const actual = await horarioDAO.findById(req.params.id);
    if (!actual) throw AppError.notFound('Horario');
    controlarDueño(req, actual.medico_id);
    await horarioDAO.delete(actual.id);
    await auditoriaDAO.registrar(req.usuario.id, 'ELIMINA', 'horarios_atencion', actual.id);
    res.json({ ok: true, message: 'Horario eliminado' });
  } catch (err) {
    next(err);
  }
}
