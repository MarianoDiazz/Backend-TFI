// ==============================================================
// RUTAS DE TURNOS
// Requieren token de autenticación (enviado desde el localStorage)
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const {
    listarTurnos,
    obtenerTurnoPorId,
    crearTurno,
    cambiarEstadoTurno,
    cancelarTurno
} = require('../controladores/turnos.controlador');

const { verificarToken } = require('../middlewares/autenticacion');

// Todas las rutas de turnos requieren estar autenticado
enrutador.use(verificarToken);

// Listar turnos (acepta filtros en query: ?fecha=YYYY-MM-DD o ?estado=...)
enrutador.get('/', listarTurnos);

// Obtener un turno por su ID
enrutador.get('/:id', obtenerTurnoPorId);

// Crear nuevo turno
enrutador.post('/', crearTurno);

// Cambiar estado del turno (Pendiente, En Espera, En Consulta, Atendido, Cancelado)
enrutador.patch('/:id/estado', cambiarEstadoTurno);
enrutador.put('/:id/estado', cambiarEstadoTurno);

// Cancelar un turno
enrutador.delete('/:id', cancelarTurno);

module.exports = enrutador;
