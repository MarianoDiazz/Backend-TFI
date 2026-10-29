import { AppError } from '../utils/AppError.js';
import { paginacion, hoyISO } from '../utils/helpers.js';
import pacienteDAO from '../dao/PacienteDAO.js';
import consultaDAO from '../dao/ConsultaDAO.js';
import turnoDAO from '../dao/TurnoDAO.js';
import { obraSocialDAO } from '../dao/CatalogoDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';

async function validarObraSocial(id) {
  if (!id) return;
  const os = await obraSocialDAO.findById(id);
  if (!os) throw new AppError('La obra social no existe');
  if (!os.activo) throw new AppError('Esa obra social está inactiva');
}

// GET /api/pacientes?buscar=&page=&limit=
export async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginacion(req.query);
    const { data, total } = await pacienteDAO.listar({ ...req.query, limit, offset });
    res.json({ ok: true, data, total, page, paginas: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/pacientes/:id
export async function obtener(req, res, next) {
  try {
    const paciente = await pacienteDAO.findDetalle(req.params.id);
    if (!paciente) throw AppError.notFound('Paciente');
    res.json({ ok: true, data: paciente });
  } catch (err) {
    next(err);
  }
}

// POST /api/pacientes
export async function crear(req, res, next) {
  try {
    const datos = req.body;
    if (await pacienteDAO.dniExiste(datos.dni)) throw AppError.conflict('Ya existe un paciente con ese DNI');
    await validarObraSocial(datos.obra_social_id);
    if (!datos.obra_social_id) datos.nro_afiliado = null;

    const id = await pacienteDAO.create(datos);
    await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'pacientes', id, `${datos.apellido}, ${datos.nombre}`);
    res.status(201).json({ ok: true, data: await pacienteDAO.findDetalle(id) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/pacientes/:id
export async function actualizar(req, res, next) {
  try {
    const id = req.params.id;
    if (!(await pacienteDAO.findById(id))) throw AppError.notFound('Paciente');
    const datos = req.body;
    if (await pacienteDAO.dniExiste(datos.dni, id)) throw AppError.conflict('Ya existe un paciente con ese DNI');
    await validarObraSocial(datos.obra_social_id);
    if (!datos.obra_social_id) datos.nro_afiliado = null;

    await pacienteDAO.update(id, datos);
    await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', 'pacientes', id);
    res.json({ ok: true, data: await pacienteDAO.findDetalle(id) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/pacientes/:id -> baja lógica (la historia clínica no se borra nunca)
export async function baja(req, res, next) {
  try {
    const id = req.params.id;
    if (!(await pacienteDAO.findById(id))) throw AppError.notFound('Paciente');
    const futuros = await turnoDAO.listar({ paciente_id: id, desde: hoyISO() });
    if (futuros.some((t) => ['PENDIENTE', 'CONFIRMADO'].includes(t.estado))) {
      throw new AppError('El paciente tiene turnos pendientes. Cancelalos antes de darlo de baja.');
    }
    await pacienteDAO.update(id, { activo: 0 });
    await auditoriaDAO.registrar(req.usuario.id, 'BAJA', 'pacientes', id);
    res.json({ ok: true, message: 'Paciente dado de baja' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/pacientes/:id/reactivar
export async function reactivar(req, res, next) {
  try {
    if (!(await pacienteDAO.update(req.params.id, { activo: 1 }))) throw AppError.notFound('Paciente');
    await auditoriaDAO.registrar(req.usuario.id, 'REACTIVA', 'pacientes', req.params.id);
    res.json({ ok: true, message: 'Paciente reactivado' });
  } catch (err) {
    next(err);
  }
}

// GET /api/pacientes/:id/historia -> consultas + turnos del paciente
export async function historia(req, res, next) {
  try {
    const paciente = await pacienteDAO.findDetalle(req.params.id);
    if (!paciente) throw AppError.notFound('Paciente');
    const [consultas, turnos] = await Promise.all([
      consultaDAO.historiaClinica(paciente.id),
      turnoDAO.listar({ paciente_id: paciente.id }),
    ]);
    res.json({ ok: true, data: { paciente, consultas, turnos } });
  } catch (err) {
    next(err);
  }
}
