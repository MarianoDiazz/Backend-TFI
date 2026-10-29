import { AppError } from '../utils/AppError.js';
import { diaSemana, aMinutos, aHora, hoyISO, normalizarHora } from '../utils/helpers.js';
import horarioDAO from '../dao/HorarioDAO.js';
import turnoDAO from '../dao/TurnoDAO.js';
import medicoDAO from '../dao/MedicoDAO.js';

// Lógica de agenda que comparten "ver disponibles", "dar turno" y "reprogramar"

// Arma todos los horarios posibles de un médico en una fecha según sus franjas
export async function generarSlots(medicoId, fecha) {
  const franjas = await horarioDAO.listarPorMedicoYDia(medicoId, diaSemana(fecha));
  const slots = [];
  for (const f of franjas) {
    for (let m = aMinutos(f.hora_inicio); m + f.duracion_turno <= aMinutos(f.hora_fin); m += f.duracion_turno) {
      slots.push(aHora(m));
    }
  }
  return slots;
}

// Devuelve cada horario con su estado libre/ocupado
export async function disponibilidad(medicoId, fecha) {
  const [slots, ocupadas] = await Promise.all([
    generarSlots(medicoId, fecha),
    turnoDAO.horasOcupadas(medicoId, fecha),
  ]);
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const esHoy = fecha === hoyISO();
  const esPasado = fecha < hoyISO();

  return slots.map((hora) => ({
    hora,
    disponible: !esPasado && !ocupadas.includes(hora) && !(esHoy && aMinutos(hora) <= minutosAhora),
  }));
}

// Todas las reglas de negocio para poder ocupar un horario
export async function validarSlot({ medico_id, paciente_id, fecha, hora }, turnoIdExcluir = 0) {
  const horaNorm = normalizarHora(hora);

  if (fecha < hoyISO()) throw new AppError('No se pueden dar turnos en fechas pasadas');

  const medico = await medicoDAO.findDetalle(medico_id);
  if (!medico) throw new AppError('El médico no existe');
  if (!medico.activo) throw new AppError('El médico está dado de baja');

  const slots = await generarSlots(medico_id, fecha);
  if (slots.length === 0) throw new AppError('El médico no atiende ese día');
  if (!slots.includes(horaNorm)) throw new AppError('Esa hora no está dentro del horario de atención del médico');

  const libres = await disponibilidad(medico_id, fecha);
  const slot = libres.find((s) => s.hora === horaNorm);
  // si estoy reprogramando el mismo turno, su propio horario no cuenta como ocupado
  if (!slot.disponible) {
    const ocupadas = await turnoDAO.listar({ medico_id, desde: fecha, hasta: fecha });
    const quienOcupa = ocupadas.find((t) => t.hora === horaNorm && t.estado !== 'CANCELADO');
    if (!quienOcupa || quienOcupa.id !== turnoIdExcluir) {
      throw AppError.conflict('Ese horario ya está ocupado o ya pasó');
    }
  }

  if (await turnoDAO.pacienteOcupado(paciente_id, fecha, horaNorm, turnoIdExcluir)) {
    throw AppError.conflict('El paciente ya tiene otro turno a esa misma hora');
  }
  return horaNorm;
}

// Busca el primer horario libre de un médico a partir de una fecha (mira hasta 60 días adelante)
export async function primerLibre(medicoId, desde = hoyISO()) {
  const [y, m, d] = desde.split('-').map(Number);
  for (let i = 0; i < 60; i++) {
    const f = new Date(y, m - 1, d + i);
    const fecha = new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (fecha < hoyISO()) continue;
    const libre = (await disponibilidad(medicoId, fecha)).find((s) => s.disponible);
    if (libre) return { fecha, hora: libre.hora };
  }
  return null;
}
