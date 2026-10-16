// ==============================================================
// CONTROLADOR DE REPORTES Y MÉTRICAS
// Conecta con ReporteModelo
// ==============================================================
const ReporteModelo = require('../modelos/reporte.modelo');

// 1. Métricas para el panel visual de reportes (JSON)
async function obtenerMetricas(peticion, respuesta) {
    try {
        const turnosPorEstado = await ReporteModelo.obtenerTurnosPorEstado();
        const pacientesPorCobertura = await ReporteModelo.obtenerPacientesPorCobertura();
        const recaudacionPorMetodo = await ReporteModelo.obtenerRecaudacionPorMetodo();
        const totalRecaudado = await ReporteModelo.obtenerTotalRecaudado();

        return respuesta.json({
            exito: true,
            datos: {
                turnos_por_estado: turnosPorEstado,
                pacientes_por_cobertura: pacientesPorCobertura,
                recaudacion_por_metodo: recaudacionPorMetodo,
                total_recaudado: totalRecaudado
            }
        });

    } catch (error) {
        console.error('Error al generar métricas:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener los datos para los reportes.'
        });
    }
}

// 2. Exportación a archivo CSV (abrible directamente en Microsoft Excel)
async function exportarReporteCsv(peticion, respuesta) {
    try {
        const turnos = await ReporteModelo.obtenerDetalleParaExportar();

        // Armamos el archivo CSV usando ';' como separador estándar de Excel en español
        let contenidoCsv = 'ID Turno;Fecha y Hora;Estado Turno;Paciente;DNI;Cobertura;Médico;Tipo de Turno;Monto ($);Método de Pago;Estado Pago\r\n';

        for (const t of turnos) {
            contenidoCsv += `${t.id_turno};${t.fecha_hora};${t.estado_turno};"${t.paciente}";${t.dni_paciente};"${t.cobertura}";"${t.medico}";"${t.tipo_turno}";${t.monto_pagado};${t.metodo_pago};${t.estado_pago}\r\n`;
        }

        // Cabeceras HTTP para forzar la descarga en el navegador con codificación UTF-8
        respuesta.setHeader('Content-Type', 'text/csv; charset=utf-8');
        respuesta.setHeader('Content-Disposition', 'attachment; filename="reporte_consultorio.csv"');

        // \uFEFF es el BOM de UTF-8 necesario para que Excel en Windows muestre tildes y caracteres en español
        return respuesta.status(200).send('\uFEFF' + contenidoCsv);

    } catch (error) {
        console.error('Error al exportar CSV:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al generar el archivo de reporte CSV.'
        });
    }
}

module.exports = {
    obtenerMetricas,
    exportarReporteCsv
};
