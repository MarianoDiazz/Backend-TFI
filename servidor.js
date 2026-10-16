// ==============================================================
// SERVIDOR PRINCIPAL - BACKEND CONSULTORIO MÉDICO
// Node.js + Express + MySQL
// ==============================================================
require('dotenv').config();

// Sin clave secreta no se pueden firmar tokens: no arrancamos
if (!process.env.JWT_SECRETO) {
    console.error('❌ Falta JWT_SECRETO en el archivo .env. El servidor no puede iniciar.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');

// Importamos la conexión para que intente conectar al iniciar
require('./base_de_datos/conexion');

// Importamos los grupos de rutas
const rutasAutenticacion = require('./rutas/autenticacion.rutas');
const rutasPacientes = require('./rutas/pacientes.rutas');
const rutasTurnos = require('./rutas/turnos.rutas');
const rutasObrasSociales = require('./rutas/obrasSociales.rutas');
const rutasTiposTurno = require('./rutas/tiposTurno.rutas');
const rutasUsuarios = require('./rutas/usuarios.rutas');
const rutasPagos = require('./rutas/pagos.rutas');
const rutasConsultas = require('./rutas/consultas.rutas');
const rutasMedicamentos = require('./rutas/medicamentos.rutas');
const rutasReportes = require('./rutas/reportes.rutas');

// Inicializamos la aplicación de Express
const aplicacion = express();
const PUERTO = process.env.PUERTO || 3000;

// --------------------------------------------------------------
// MIDDLEWARES GLOBALES
// --------------------------------------------------------------
// Permite que el frontend (React / Vite) se comunique sin bloqueos de CORS
aplicacion.use(cors());

// Permite recibir datos en formato JSON en el cuerpo de las peticiones (req.body)
aplicacion.use(express.json());
// Si la petición llega sin cuerpo, dejamos un objeto vacío para que los controladores no fallen
aplicacion.use((peticion, respuesta, siguiente) => {
    if (!peticion.body) peticion.body = {};
    siguiente();
});

// --------------------------------------------------------------
// RUTA DE PRUEBA / BIENVENIDA
// --------------------------------------------------------------
aplicacion.get('/', (peticion, respuesta) => {
    respuesta.json({
        mensaje: 'Bienvenido a la API del Sistema de Consultorio Médico',
        estado: 'Servidor funcionando correctamente',
        documentacion: 'Todas las rutas inician en /api/...'
    });
});

// --------------------------------------------------------------
// REGISTRO DE RUTAS DE LA API
// --------------------------------------------------------------
aplicacion.use('/api/autenticacion', rutasAutenticacion);
aplicacion.use('/api/pacientes', rutasPacientes);
aplicacion.use('/api/turnos', rutasTurnos);
aplicacion.use('/api/obras-sociales', rutasObrasSociales);
aplicacion.use('/api/tipos-turno', rutasTiposTurno);
aplicacion.use('/api/usuarios', rutasUsuarios);
aplicacion.use('/api/pagos', rutasPagos);
aplicacion.use('/api/consultas', rutasConsultas);
aplicacion.use('/api/medicamentos', rutasMedicamentos);
aplicacion.use('/api/reportes', rutasReportes);

// --------------------------------------------------------------
// MANEJO DE RUTAS NO ENCONTRADAS (404)
// --------------------------------------------------------------
aplicacion.use((peticion, respuesta) => {
    respuesta.status(404).json({
        exito: false,
        mensaje: `La ruta "${peticion.originalUrl}" no existe en este servidor.`
    });
});

// --------------------------------------------------------------
// INICIAR EL SERVIDOR
// --------------------------------------------------------------
aplicacion.listen(PUERTO, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor iniciado con éxito en http://localhost:${PUERTO}`);
    console.log(`👉 Probá ingresar a http://localhost:${PUERTO}/`);
    console.log(`====================================================`);
});
