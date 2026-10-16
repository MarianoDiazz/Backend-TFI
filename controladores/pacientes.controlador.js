// ==============================================================
// CONTROLADOR DE PACIENTES (Entidad Principal 1)
// Conecta con PacienteModelo
// ==============================================================
const PacienteModelo = require('../modelos/paciente.modelo');

// 1. Listar todos los pacientes activos (con opción de búsqueda)
async function listarPacientes(peticion, respuesta) {
    try {
        const { busqueda } = peticion.query;
        const pacientes = await PacienteModelo.obtenerTodos(busqueda);

        return respuesta.json({
            exito: true,
            total: pacientes.length,
            datos: pacientes
        });
    } catch (error) {
        console.error('Error al listar pacientes:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener el listado de pacientes.'
        });
    }
}

// 2. Obtener los datos de un paciente por su ID
async function obtenerPacientePorId(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const paciente = await PacienteModelo.obtenerPorId(id);

        if (!paciente) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Paciente no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            datos: paciente
        });
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener los datos del paciente.'
        });
    }
}

// 3. Crear un nuevo paciente
async function crearPaciente(peticion, respuesta) {
    try {
        const {
            dni,
            nombre,
            apellido,
            telefono,
            email,
            id_obra_social,
            numero_afiliado
        } = peticion.body;

        // Validaciones básicas de campos obligatorios
        if (!dni || !nombre || !apellido || !id_obra_social) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'DNI, Nombre, Apellido y Obra Social son datos obligatorios.'
            });
        }

        // Verificamos si ya existe un paciente con el mismo DNI
        const pacienteExistente = await PacienteModelo.buscarPorDni(dni);

        // Si está activo, es un duplicado real
        if (pacienteExistente && pacienteExistente.activo) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Ya existe un paciente activo con ese número de DNI.'
            });
        }

        // Si estaba dado de baja, lo reactivamos (conserva su historial)
        if (pacienteExistente) {
            await PacienteModelo.reactivar(pacienteExistente.id_paciente, {
                dni,
                nombre,
                apellido,
                telefono,
                email,
                id_obra_social,
                numero_afiliado
            });
            return respuesta.json({
                exito: true,
                mensaje: 'El paciente estaba dado de baja y se reactivó con los datos ingresados.',
                id_paciente: pacienteExistente.id_paciente
            });

        } const idInsertado = await PacienteModelo.crear({
            dni,
            nombre,
            apellido,
            telefono,
            email,
            id_obra_social,
            numero_afiliado
        });

        return respuesta.status(201).json({
            exito: true,
            mensaje: 'Paciente registrado exitosamente.',
            id_paciente: idInsertado
        });
    } catch (error) {
        console.error('Error al crear paciente:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al registrar el paciente en el sistema.'
        });
    }
}

// 4. Modificar un paciente existente
async function actualizarPaciente(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const {
            dni,
            nombre,
            apellido,
            telefono,
            email,
            id_obra_social,
            numero_afiliado
        } = peticion.body;

        if (!dni || !nombre || !apellido || !id_obra_social) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'DNI, Nombre, Apellido y Obra Social son datos obligatorios.'
            });
        }

        // Verificamos que el DNI no pertenezca a OTRO paciente distinto
        const dniRepetido = await PacienteModelo.buscarPorDni(dni, id);
        if (dniRepetido) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'El DNI ingresado ya pertenece a otro paciente registrado.'
            });
        }

        const modificado = await PacienteModelo.actualizar(id, {
            dni,
            nombre,
            apellido,
            telefono,
            email,
            id_obra_social,
            numero_afiliado
        });

        if (!modificado) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Paciente no encontrado para actualizar.'
            });
        }

        return respuesta.json({
            exito: true,
            mensaje: 'Datos del paciente actualizados con éxito.'
        });
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al actualizar los datos del paciente.'
        });
    }
}

// 5. Baja lógica de un paciente (activo = 0)
async function eliminarPaciente(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const dadoDeBaja = await PacienteModelo.darDeBaja(id);

        if (!dadoDeBaja) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Paciente no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            mensaje: 'Paciente dado de baja correctamente.'
        });
    } catch (error) {
        console.error('Error al dar de baja paciente:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al dar de baja el paciente.'
        });
    }
}

module.exports = {
    listarPacientes,
    obtenerPacientePorId,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
};
