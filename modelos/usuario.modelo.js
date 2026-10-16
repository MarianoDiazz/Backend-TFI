// ==============================================================
// MODELO: USUARIO (POO - Consultas SQL directas sin ORM)
// Encapsula las operaciones en la base de datos para la tabla usuarios
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class UsuarioModelo {

    // Buscar un usuario por su email (utilizado para el Login)
    static async buscarPorEmail(email) {
        const consultaSql = `
            SELECT u.id_usuario, u.id_rol, u.nombre, u.apellido, u.email, u.password_hash, u.activo, r.nombre_rol AS rol
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.email = ?
        `;
        const [filas] = await conexion.query(consultaSql, [email]);
        return filas[0] || null;
    }

    // Buscar usuario por su ID (para obtener perfil)
    static async buscarPorId(idUsuario) {
        const consultaSql = `
            SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.id_rol, r.nombre_rol AS rol
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ? AND u.activo = 1
        `;
        const [filas] = await conexion.query(consultaSql, [idUsuario]);
        return filas[0] || null;
    }

    // Listar solo médicos activos (para los selectores al dar un turno)
    static async obtenerMedicos() {
        const consultaSql = `
            SELECT u.id_usuario, u.nombre, u.apellido, u.email
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE r.nombre_rol = 'Medico' AND u.activo = 1
            ORDER BY u.apellido ASC
        `;
        const [filas] = await conexion.query(consultaSql);
        return filas;
    }

    // Listar todos los usuarios del sistema (para ABM de usuarios)
    static async obtenerTodos() {
        const consultaSql = `
            SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.id_rol, r.nombre_rol AS rol
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario ASC
        `;
        const [filas] = await conexion.query(consultaSql);
        return filas;
    }

    // Crear un nuevo usuario en la base de datos
    static async crear(datos) {
        const { nombre, apellido, email, password_hash, id_rol } = datos;
        const consultaSql = `
            INSERT INTO usuarios (nombre, apellido, email, password_hash, id_rol, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        `;
        const [resultado] = await conexion.query(consultaSql, [nombre, apellido, email, password_hash, id_rol]);
        return resultado.insertId;
    }

    // Actualizar datos de un usuario (Nombre, Apellido, Email, Rol)
    static async actualizar(idUsuario, datos) {
        const { nombre, apellido, email, id_rol } = datos;
        const consultaSql = `
            UPDATE usuarios 
            SET nombre = ?, apellido = ?, email = ?, id_rol = ?
            WHERE id_usuario = ?
        `;
        const [resultado] = await conexion.query(consultaSql, [nombre, apellido, email, id_rol, idUsuario]);
        return resultado.affectedRows > 0;
    }

    // Verificar si el email pertenece a otro usuario
    static async emailEnUsoPorOtro(email, idUsuario) {
        const [filas] = await conexion.query(
            'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?',
            [email, idUsuario]
        );
        return filas.length > 0;
    }

    // Actualizar la contraseña de un usuario
    static async actualizarClave(email, nuevoPasswordHash) {
        const [resultado] = await conexion.query(
            'UPDATE usuarios SET password_hash = ? WHERE email = ?',
            [nuevoPasswordHash, email]
        );
        return resultado.affectedRows > 0;
    }

    // Activar o desactivar usuario (baja lógica)
    static async cambiarEstado(idUsuario, activo) {
        const [resultado] = await conexion.query(
            'UPDATE usuarios SET activo = ? WHERE id_usuario = ?',
            [activo ? 1 : 0, idUsuario]
        );
        return resultado.affectedRows > 0;
    }
}

module.exports = UsuarioModelo;
