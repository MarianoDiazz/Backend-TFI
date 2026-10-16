// ==============================================================
// RUTAS DE REPORTES Y EXPORTACIÓN
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const { obtenerMetricas, exportarReporteCsv } = require('../controladores/reportes.controlador');
const { verificarToken } = require('../middlewares/autenticacion');

enrutador.use(verificarToken);

// Obtener todas las métricas para los gráficos y tablas de reportes (JSON)
enrutador.get('/metricas', obtenerMetricas);

// Descargar reporte completo en formato CSV (compatible directo con Excel)
enrutador.get('/exportar/csv', exportarReporteCsv);

module.exports = enrutador;
