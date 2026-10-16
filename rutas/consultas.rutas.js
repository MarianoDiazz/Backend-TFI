// ==============================================================
// RUTAS DE CONSULTAS MÉDICAS
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const {
    registrarConsulta,
    obtenerHistorialPaciente,
    obtenerConsultaPorTurno
} = require('../controladores/consultas.controlador');

const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');

// Historia clínica: solo el médico (secreto profesional)
enrutador.use(verificarToken, permitirRoles('Medico'));

// Registrar o actualizar consulta médica
enrutador.post('/', registrarConsulta);

// Obtener historia clínica de un paciente
enrutador.get('/paciente/:id_paciente', obtenerHistorialPaciente);

// Obtener la consulta de un turno en particular
enrutador.get('/turno/:id_turno', obtenerConsultaPorTurno);

module.exports = enrutador;
