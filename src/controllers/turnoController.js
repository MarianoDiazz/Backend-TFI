import { AppError } from '../utils/AppError.js';
import { hoyISO } from '../utils/helpers.js';
import turnoDAO from '../dao/TurnoDAO.js';
import pacienteDAO from '../dao/PacienteDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';
import { disponibilidad, validarSlot, primerLibre } from '../services/agendaService.js';

// Qué cambios de estado están permitidos (ATENDIDO solo se pone al cargar la consulta)
const TRANSICIONES = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO', 'AUSENTE'],
  CONFIRMADO: ['PENDIENTE', 'CANCELADO', 'AUSENTE'],
  ATENDIDO: [],
  AUSENTE: [],
  CANCELADO: [],
};

// El médico solo ve y toca sus turnos
function soloPropios(req, turno) {
  if (req.usuario.rol === 'MEDICO' && turno.medico_id !== req.usuario.medico_id) {
    throw AppError.forbidden('Ese turno es de otro profesional');
  }
}

// GET /api/turnos?desde=&hasta=&medico_id=&estado=&paciente_id=
export async function listar(req, res, next) {
  try {
    const filtros = { ...req.query };
    if (req.usuario.rol === 'MEDICO') filtros.medico_id = req.usuario.medico_id;
    res.json({ ok: true, data: await turnoDAO.listar(filtros) });
  } catch (err) {
    next(err);
  }
}

// GET /api/turnos/disponibles?medico_id=&fecha=
export async function disponibles(req, res, next) {
  try {
    const { medico_id, fecha } = req.query;
    if (!medico_id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) {
      throw new AppError('Indicá médico y fecha válidos');
    }
    res.json({ ok: true, data: await disponibilidad(Number(medico_id), fecha) });
  } catch (err) {
    next(err);
  }
}

// GET /api/turnos/primer-libre?medico_id=&desde=
export async function proximoLibre(req, res, next) {
  try {
    const { medico_id, desde } = req.query;
    if (!medico_id) throw new AppError('Indicá el médico');
    if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new AppError('Fecha inválida');
    const libre = await primerLibre(Number(medico_id), desde || undefined);
    if (!libre) throw new AppError('No hay horarios libres en los próximos 60 días', 404);
    res.json({ ok: true, data: libre });
  } catch (err) {
    next(err);
  }
}

// GET /api/turnos/:id
export async function obtener(req, res, next) {
  try {
    const turno = await turnoDAO.findDetalle(req.params.id);
    if (!turno) throw AppError.notFound('Turno');
    soloPropios(req, turno);
    res.json({ ok: true, data: turno });
  } catch (err) {
    next(err);
  }
}

// POST /api/turnos
export async function crear(req, res, next) {
  try {
    const datos = req.body;
    const paciente = await pacienteDAO.findById(datos.paciente_id);
    if (!paciente) throw new AppError('El paciente no existe');
    if (!paciente.activo) throw new AppError('El paciente está dado de baja');

    datos.hora = await validarSlot(datos);
    const id = await turnoDAO.create({ ...datos, estado: 'PENDIENTE', creado_por: req.usuario.id });
    await auditoriaDAO.registrar(req.usuario.id, 'ALTA', 'turnos', id, `${datos.fecha} ${datos.hora}`);
    res.status(201).json({ ok: true, data: await turnoDAO.findDetalle(id) });
  } catch (err) {
    // por si dos recepcionistas dan el mismo turno al mismo tiempo: lo frena el UNIQUE de la BD
    if (err.code === 'ER_DUP_ENTRY') return next(AppError.conflict('Ese horario se acaba de ocupar. Elegí otro.'));
    next(err);
  }
}

// PATCH /api/turnos/:id/estado
export async function cambiarEstado(req, res, next) {
  try {
    const turno = await turnoDAO.findDetalle(req.params.id);
    if (!turno) throw AppError.notFound('Turno');
    soloPropios(req, turno);

    const { estado } = req.body;
    if (!TRANSICIONES[turno.estado].includes(estado)) {
      throw new AppError(`No se puede pasar un turno ${turno.estado} a ${estado}`);
    }
    if (estado === 'AUSENTE' && turno.fecha > hoyISO()) {
      throw new AppError('No se puede marcar ausente un turno que todavía no llegó');
    }

    await turnoDAO.update(turno.id, { estado });
    await auditoriaDAO.registrar(req.usuario.id, 'ESTADO', 'turnos', turno.id, `${turno.estado} -> ${estado}`);
    res.json({ ok: true, data: await turnoDAO.findDetalle(turno.id) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return next(AppError.conflict('Ese horario ya fue tomado por otro turno'));
    next(err);
  }
}

// PATCH /api/turnos/:id/reprogramar
export async function reprogramar(req, res, next) {
  try {
    const turno = await turnoDAO.findDetalle(req.params.id);
    if (!turno) throw AppError.notFound('Turno');
    if (!['PENDIENTE', 'CONFIRMADO'].includes(turno.estado)) {
      throw new AppError('Solo se pueden reprogramar turnos pendientes o confirmados');
    }
    const { fecha, hora } = req.body;
    const horaNorm = await validarSlot(
      { medico_id: turno.medico_id, paciente_id: turno.paciente_id, fecha, hora }, turno.id
    );
    await turnoDAO.update(turno.id, { fecha, hora: horaNorm, estado: 'PENDIENTE' });
    await auditoriaDAO.registrar(
      req.usuario.id, 'REPROGRAMA', 'turnos', turno.id, `${turno.fecha} ${turno.hora} -> ${fecha} ${horaNorm}`
    );
    res.json({ ok: true, data: await turnoDAO.findDetalle(turno.id) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return next(AppError.conflict('Ese horario se acaba de ocupar. Elegí otro.'));
    next(err);
  }
}
