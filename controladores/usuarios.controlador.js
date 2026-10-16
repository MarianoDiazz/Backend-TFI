// ==============================================================
// CONTROLADOR DE USUARIOS (ABM Completo)
// Conecta con UsuarioModelo
// ==============================================================
const UsuarioModelo = require('../modelos/usuario.modelo');
const bcrypt = require('bcrypt');

// 1. Listar médicos (para el selector de la agenda de turnos)
async function listarMedicos(peticion, respuesta) {
    try {
        const medicos = await UsuarioModelo.obtenerMedicos();
        return respuesta.json({
            exito: true,
            datos: medicos
        });
    } catch (error) {
        console.error('Error al listar médicos:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener la lista de médicos.'
        });
    }
}

// 2. Listar todos los usuarios (para ABM de usuarios)
async function listarUsuarios(peticion, respuesta) {
    try {
        const usuarios = await UsuarioModelo.obtenerTodos();
        return respuesta.json({
            exito: true,
            datos: usuarios
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener usuarios.'
        });
    }
}

// 3. Obtener un usuario por su ID
async function obtenerUsuarioPorId(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const usuario = await UsuarioModelo.buscarPorId(id);

        if (!usuario) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Usuario no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            datos: usuario
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener el usuario.'
        });
    }
}

// 4. Crear un nuevo usuario (Alta)
async function crearUsuario(peticion, respuesta) {
    try {
        const { nombre, apellido, email, password, id_rol } = peticion.body;

        if (!nombre || !apellido || !email || !password || !id_rol) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Todos los campos son obligatorios.'
            });
        }

        const usuarioExistente = await UsuarioModelo.buscarPorEmail(email);
        if (usuarioExistente) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Ya existe un usuario con ese correo electrónico.'
            });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const idInsertado = await UsuarioModelo.crear({
            nombre,
            apellido,
            email,
            password_hash,
            id_rol
        });

        return respuesta.status(201).json({
            exito: true,
            mensaje: 'Usuario creado exitosamente.',
            id_usuario: idInsertado
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al registrar el usuario.'
        });
    }
}

// 5. Modificar un usuario existente (Modificación de ABM)
async function actualizarUsuario(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const { nombre, apellido, email, id_rol } = peticion.body;

        if (!nombre || !apellido || !email || !id_rol) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Nombre, apellido, email y rol son requeridos.'
            });
        }

        // Verificamos que el email no pertenezca a OTRO usuario
        const emailRepetido = await UsuarioModelo.emailEnUsoPorOtro(email, id);
        if (emailRepetido) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'El correo electrónico ya está en uso por otro usuario.'
            });
        }

        const modificado = await UsuarioModelo.actualizar(id, {
            nombre,
            apellido,
            email,
            id_rol
        });

        if (!modificado) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Usuario no encontrado para actualizar.'
            });
        }

        return respuesta.json({
            exito: true,
            mensaje: 'Usuario actualizado exitosamente.'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al actualizar el usuario.'
        });
    }
}

// 6. Cambiar estado activo/inactivo (Baja lógica de ABM)
async function cambiarEstadoUsuario(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const { activo } = peticion.body;

        await UsuarioModelo.cambiarEstado(id, activo);

        return respuesta.json({
            exito: true,
            mensaje: 'Estado del usuario actualizado correctamente.'
        });
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al actualizar el usuario.'
        });
    }
}

module.exports = {
    listarMedicos,
    listarUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario
};
