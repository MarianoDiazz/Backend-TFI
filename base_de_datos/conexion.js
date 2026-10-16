// ==============================================================
// CONEXIÓN A LA BASE DE DATOS MYSQL
// ==============================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos un grupo (pool) de conexiones para que sea rápido y eficiente
const conexion = mysql.createPool({
    host: process.env.BD_HOST || 'localhost',
    user: process.env.BD_USUARIO || 'root',
    password: process.env.BD_PASSWORD || '',
    database: process.env.BD_NOMBRE || 'consultorio_medico',
    port: process.env.BD_PUERTO || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función simple para verificar si la base de datos responde
async function probarConexion() {
    try {
        const [resultado] = await conexion.query('SELECT 1 + 1 AS resultado');
        console.log('✅ Conexión a la base de datos MySQL establecida correctamente.');
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos MySQL:');
        console.error(error.message);
        console.log('👉 Tip: Asegurate de haber importado el archivo "base_de_datos/esquema.sql" en tu MySQL / XAMPP / Workbench y que las credenciales del .env sean correctas.');
    }
}

probarConexion();

module.exports = conexion;
