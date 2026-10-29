import { AppError } from '../utils/AppError.js';
import { hoyISO, fechaHoraAR } from '../utils/helpers.js';
import turnoDAO from '../dao/TurnoDAO.js';
import pacienteDAO from '../dao/PacienteDAO.js';
import consultaDAO from '../dao/ConsultaDAO.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';
import { generarCSV, generarExcel, generarPDF, generarHistoriaPDF } from '../services/reportService.js';

const TIPOS_MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

// Primer día del mes actual
const inicioMes = () => hoyISO().slice(0, 8) + '01';

// Manda el archivo en el formato pedido. Reutilizo esto en todos los reportes.
async function enviarReporte(res, formato, nombre, reporte) {
  if (!TIPOS_MIME[formato]) throw new AppError('Formato inválido. Usá pdf, xlsx o csv');
  let buffer;
  if (formato === 'csv') buffer = generarCSV(reporte);
  else if (formato === 'xlsx') buffer = await generarExcel(reporte);
  else buffer = await generarPDF(reporte);

  res.setHeader('Content-Type', TIPOS_MIME[formato]);
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}_${hoyISO()}.${formato}"`);
  res.send(buffer);
}

const emitido = (req) => `Emitido por ${req.usuario.nombre} ${req.usuario.apellido} el ${fechaHoraAR()}`;

// GET /api/reportes/turnos?formato=&desde=&hasta=&medico_id=&estado=
export async function turnos(req, res, next) {
  try {
    const { formato = 'pdf', desde = inicioMes(), hasta = hoyISO(), medico_id, estado } = req.query;
    const filtros = { desde, hasta, medico_id, estado };
    if (req.usuario.rol === 'MEDICO') filtros.medico_id = req.usuario.medico_id;

    const filas = (await turnoDAO.listar(filtros)).map((t) => ({ ...t, hora: t.hora.slice(0, 5) }));
    await enviarReporte(res, formato, 'turnos', {
      titulo: 'Reporte de Turnos',
      subtitulo: `Período ${desde} al ${hasta}${estado ? ' · Estado ' + estado : ''} · ${emitido(req)}`,
      horizontal: true,
      columnas: [
        { key: 'fecha', header: 'Fecha', width: 65 },
        { key: 'hora', header: 'Hora', width: 40 },
        { key: 'paciente', header: 'Paciente', width: 130 },
        { key: 'paciente_dni', header: 'DNI', width: 65 },
        { key: 'obra_social', header: 'Obra social', width: 90 },
        { key: 'medico', header: 'Médico', width: 120 },
        { key: 'especialidad', header: 'Especialidad', width: 95 },
        { key: 'estado', header: 'Estado', width: 75 },
      ],
      filas,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/pacientes?formato=&obra_social_id=
export async function pacientes(req, res, next) {
  try {
    const { formato = 'pdf', obra_social_id, activo = '1' } = req.query;
    const { data } = await pacienteDAO.listar({ obra_social_id, activo, limit: 100000, offset: 0 });
    const filas = data.map((p) => ({ ...p, nombre_completo: `${p.apellido}, ${p.nombre}`, obra_social: p.obra_social || 'Particular' }));
    await enviarReporte(res, formato, 'pacientes', {
      titulo: 'Padrón de Pacientes',
      subtitulo: emitido(req),
      horizontal: true,
      columnas: [
        { key: 'dni', header: 'DNI', width: 65 },
        { key: 'nombre_completo', header: 'Apellido y nombre', width: 140 },
        { key: 'edad', header: 'Edad', width: 35 },
        { key: 'sexo', header: 'Sexo', width: 35 },
        { key: 'telefono', header: 'Teléfono', width: 85 },
        { key: 'email', header: 'Email', width: 140 },
        { key: 'obra_social', header: 'Obra social', width: 100 },
        { key: 'nro_afiliado', header: 'N° afiliado', width: 80 },
      ],
      filas,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/productividad?formato=&desde=&hasta=
export async function productividad(req, res, next) {
  try {
    const { formato = 'pdf', desde = inicioMes(), hasta = hoyISO() } = req.query;
    const filas = (await turnoDAO.resumenPorMedico(desde, hasta)).map((f) => {
      const cerrados = Number(f.atendidos) + Number(f.ausentes);
      return { ...f, ausentismo: cerrados ? `${Math.round((f.ausentes / cerrados) * 100)}%` : '-' };
    });
    await enviarReporte(res, formato, 'productividad_medicos', {
      titulo: 'Productividad por Médico',
      subtitulo: `Período ${desde} al ${hasta} · ${emitido(req)}`,
      columnas: [
        { key: 'medico', header: 'Médico', width: 130 },
        { key: 'especialidad', header: 'Especialidad', width: 100 },
        { key: 'total', header: 'Turnos', width: 50 },
        { key: 'atendidos', header: 'Atendidos', width: 60 },
        { key: 'ausentes', header: 'Ausentes', width: 55 },
        { key: 'cancelados', header: 'Cancel.', width: 55 },
        { key: 'pendientes', header: 'Pend.', width: 50 },
        { key: 'ausentismo', header: '% Ausent.', width: 60 },
      ],
      filas,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/obras-sociales?formato=&desde=&hasta=
export async function obrasSociales(req, res, next) {
  try {
    const { formato = 'pdf', desde = inicioMes(), hasta = hoyISO() } = req.query;
    const filas = await turnoDAO.resumenPorObraSocial(desde, hasta);
    await enviarReporte(res, formato, 'obras_sociales', {
      titulo: 'Turnos por Obra Social',
      subtitulo: `Período ${desde} al ${hasta} · ${emitido(req)}`,
      columnas: [
        { key: 'obra_social', header: 'Obra social', width: 200 },
        { key: 'turnos', header: 'Turnos dados', width: 100 },
        { key: 'atendidos', header: 'Atendidos', width: 100 },
      ],
      filas,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/historia/:id?formato=  (solo médico y admin: es información sensible)
export async function historia(req, res, next) {
  try {
    const formato = req.query.formato || 'pdf';
    const paciente = await pacienteDAO.findDetalle(req.params.id);
    if (!paciente) throw AppError.notFound('Paciente');
    const consultas = await consultaDAO.historiaClinica(paciente.id);
    await auditoriaDAO.registrar(req.usuario.id, 'EXPORTA', 'historia', paciente.id, formato);

    if (formato === 'pdf') {
      const buffer = await generarHistoriaPDF(paciente, consultas);
      res.setHeader('Content-Type', TIPOS_MIME.pdf);
      res.setHeader('Content-Disposition', `attachment; filename="historia_${paciente.dni}.pdf"`);
      return res.send(buffer);
    }
    await enviarReporte(res, formato, `historia_${paciente.dni}`, {
      titulo: `Historia clínica - ${paciente.apellido}, ${paciente.nombre} (DNI ${paciente.dni})`,
      subtitulo: emitido(req),
      columnas: [
        { key: 'fecha', header: 'Fecha', width: 70 },
        { key: 'medico', header: 'Médico', width: 120 },
        { key: 'motivo_consulta', header: 'Motivo', width: 150 },
        { key: 'diagnostico', header: 'Diagnóstico', width: 180 },
        { key: 'tratamiento', header: 'Tratamiento', width: 180 },
      ],
      filas: consultas,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reportes/auditoria?formato=
export async function auditoria(req, res, next) {
  try {
    const filas = await auditoriaDAO.ultimos(1000);
    await enviarReporte(res, req.query.formato || 'pdf', 'auditoria', {
      titulo: 'Registro de Auditoría',
      subtitulo: `Últimas 1000 acciones · ${emitido(req)}`,
      horizontal: true,
      columnas: [
        { key: 'fecha', header: 'Fecha y hora', width: 110 },
        { key: 'usuario', header: 'Usuario', width: 120 },
        { key: 'accion', header: 'Acción', width: 80 },
        { key: 'entidad', header: 'Entidad', width: 100 },
        { key: 'entidad_id', header: 'ID', width: 40 },
        { key: 'detalle', header: 'Detalle', width: 200 },
      ],
      filas,
    });
  } catch (err) {
    next(err);
  }
}
