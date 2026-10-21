-- ==============================================================
-- BASE DE DATOS: Sistema de Gestión para Consultorio Médico
-- Cumple con la Tercera Forma Normal (3FN)
-- ==============================================================

-- 1. Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS consultorio_medico
CHARACTER SET utf8mb4 
COLLATE utf8mb4_spanish_ci;

-- 2. Usar la base de datos
USE consultorio_medico;

-- --------------------------------------------------------------
-- Tabla 1: roles
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL
);

-- --------------------------------------------------------------
-- Tabla 2: usuarios
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    token_recuperacion VARCHAR(255) NULL,
    token_vencimiento DATETIME NULL,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE RESTRICT
);

-- --------------------------------------------------------------
-- Tabla 3: obras_sociales
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obras_sociales (
    id_obra_social INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    sigla VARCHAR(50) NULL,
    activa TINYINT(1) DEFAULT 1
);

-- --------------------------------------------------------------
-- Tabla 4: pacientes (Entidad Principal 1)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    id_obra_social INT NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    numero_afiliado VARCHAR(50) NULL, -- Si es particular, queda en NULL
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_obra_social) REFERENCES obras_sociales(id_obra_social) ON DELETE RESTRICT
);

-- --------------------------------------------------------------
-- Tabla 5: tipos_turno (Entidad Adicional 1)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_turno (
    id_tipo_turno INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL, -- 'Primera Consulta', 'Control', 'Apto Físico'
    duracion_estimada_min INT DEFAULT 30,
    activo TINYINT(1) DEFAULT 1
);

-- --------------------------------------------------------------
-- Tabla 6: turnos (Entidad Principal 2)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turnos (
    id_turno INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_medico INT NOT NULL,
    id_tipo_turno INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    motivo VARCHAR(255) NULL,
    estado ENUM('Pendiente', 'En Espera', 'En Consulta', 'Atendido', 'Cancelado') DEFAULT 'Pendiente',
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
    FOREIGN KEY (id_medico) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    FOREIGN KEY (id_tipo_turno) REFERENCES tipos_turno(id_tipo_turno) ON DELETE RESTRICT
);

-- --------------------------------------------------------------
-- Tabla 7: pagos (Entidad Adicional 2)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_turno INT NOT NULL UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Débito') NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Cobrado', 'Pendiente') DEFAULT 'Cobrado',
    FOREIGN KEY (id_turno) REFERENCES turnos(id_turno) ON DELETE RESTRICT
);

-- --------------------------------------------------------------
-- Tabla 8: consultas
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultas (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    id_turno INT NOT NULL UNIQUE,
    id_paciente INT NOT NULL,
    diagnostico TEXT NOT NULL,
    receta_indicaciones TEXT NULL,
    presion_arterial VARCHAR(20) NULL,
    peso_kg DECIMAL(5,2) NULL,
    fecha_atencion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_turno) REFERENCES turnos(id_turno) ON DELETE RESTRICT,
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE RESTRICT
);

-- --------------------------------------------------------------
-- Tabla 9: medicamentos (Entidad Adicional 3 - Vademécum)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicamentos (
    id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comercial VARCHAR(150) NOT NULL,
    droga_generico VARCHAR(150) NOT NULL,
    presentacion VARCHAR(100) NOT NULL, -- 'Comprimidos 500mg', 'Jarabe 250ml'
    activo TINYINT(1) DEFAULT 1
);

-- ==============================================================
-- DATOS INICIALES (SEMILLAS / SEEDS) PARA PROBAR EL SISTEMA
-- Nota: La contraseña para todos los usuarios de prueba es: 123456
-- ==============================================================

-- Roles
INSERT IGNORE INTO roles (id_rol, nombre_rol, descripcion) VALUES
(1, 'Admin', 'Administrador general del sistema'),
(2, 'Medico', 'Atención médica, historias clínicas y recetas'),
(3, 'Recepcion', 'Gestión de pacientes, turnos y cobros');

-- Usuarios iniciales (clave: 123456)
-- Hash bcrypt de '123456': $2b$10$MXsJE2qwbPYtmbzsyIjTbedkpgI7xpD7fYZe7Rs56/7Y7Ibs90WAe
INSERT IGNORE INTO usuarios (id_usuario, id_rol, nombre, apellido, email, password_hash, activo) VALUES
(1, 1, 'Administrador', 'General', 'admin@consultorio.com', '$2b$10$MXsJE2qwbPYtmbzsyIjTbedkpgI7xpD7fYZe7Rs56/7Y7Ibs90WAe', 1),
(2, 2, 'Carlos', 'Gómez', 'medico@consultorio.com', '$2b$10$MXsJE2qwbPYtmbzsyIjTbedkpgI7xpD7fYZe7Rs56/7Y7Ibs90WAe', 1),
(3, 3, 'Mariana', 'López', 'recepcion@consultorio.com', '$2b$10$MXsJE2qwbPYtmbzsyIjTbedkpgI7xpD7fYZe7Rs56/7Y7Ibs90WAe', 1);

-- Obras Sociales (incluye Particular)
INSERT IGNORE INTO obras_sociales (id_obra_social, nombre, sigla, activa) VALUES
(1, 'Particular', 'PART', 1),
(2, 'OSDE Binario', 'OSDE', 1),
(3, 'Swiss Medical', 'SMG', 1),
(4, 'PAMI', 'PAMI', 1),
(5, 'IOMA', 'IOMA', 1);

-- Tipos de Turno
INSERT IGNORE INTO tipos_turno (id_tipo_turno, nombre, duracion_estimada_min, activo) VALUES
(1, 'Primera Consulta', 45, 1),
(2, 'Control', 20, 1),
(3, 'Apto Físico', 30, 1);

-- Pacientes de prueba
INSERT IGNORE INTO pacientes (id_paciente, id_obra_social, dni, nombre, apellido, telefono, email, numero_afiliado, activo) VALUES
(1, 1, '30111222', 'Juan', 'Pérez', '1122334455', 'juan.perez@email.com', NULL, 1),
(2, 2, '35444555', 'Lucía', 'Fernández', '1199887766', 'lucia.f@email.com', 'OSDE-987654', 1),
(3, 3, '40777888', 'Martín', 'Rodríguez', '1144556677', 'martin.r@email.com', 'SMG-123456', 1);

-- Medicamentos de ejemplo
INSERT IGNORE INTO medicamentos (id_medicamento, nombre_comercial, droga_generico, presentacion, activo) VALUES
(1, 'Amoxidal 500', 'Amoxicilina', 'Comprimidos 500mg', 1),
(2, 'Ibupirac 600', 'Ibuprofeno', 'Comprimidos 600mg', 1),
(3, 'Tafirol 1g', 'Paracetamol', 'Comprimidos 1000mg', 1),
(4, 'Lotrial 10', 'Enalapril', 'Comprimidos 10mg', 1),
(5, 'Optamox Dúo', 'Amoxicilina + Ácido Clavulánico', 'Suspensión 70ml', 1);

-- Turnos de ejemplo
INSERT IGNORE INTO turnos (id_turno, id_paciente, id_medico, id_tipo_turno, fecha_hora, motivo, estado) VALUES
(1, 1, 2, 1, NOW() + INTERVAL 1 HOUR, 'Dolor de garganta y fiebre', 'En Espera'),
(2, 2, 2, 2, NOW() + INTERVAL 2 HOUR, 'Control de presión arterial', 'Pendiente'),
(3, 3, 2, 3, NOW() + INTERVAL 3 HOUR, 'Apto físico para gimnasio', 'Pendiente');
