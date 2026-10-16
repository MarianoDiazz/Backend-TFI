// ==============================================================
// RUTAS DE OBRAS SOCIALES
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const { listarObrasSociales } = require('../controladores/obrasSociales.controlador');
const { verificarToken } = require('../middlewares/autenticacion');

// Ruta protegida para cargar obras sociales en formularios
enrutador.get('/', verificarToken, listarObrasSociales);

module.exports = enrutador;
