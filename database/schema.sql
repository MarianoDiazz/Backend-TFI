-- =========================================================
--  Sistema de Gestión de Consultorio Médico - TFI UTN
--  Base de datos relacional normalizada (3FN)
--  Motor: MySQL / MariaDB (XAMPP)
-- =========================================================

DROP DATABASE IF EXISTS consultorio_db;
CREATE DATABASE consultorio_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE consultorio_db;

-- Roles del sistema (ADMIN, MEDICO, RECEPCIONISTA)
CREATE TABLE roles (
  id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(120) NULL
) ENGINE=InnoDB;

-- Usuarios que entran al sistema
CREATE TABLE usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(60)  NOT NULL,
  apellido       VARCHAR(60)  NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  rol_id         TINYINT UNSIGNED NOT NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_login   DATETIME NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tokens de recuperación de contraseña (guardo el hash, nunca el token plano)
CREATE TABLE password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expira_en   DATETIME NOT NULL,
  usado       TINYINT(1) NOT NULL DEFAULT 0,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resets_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Catálogo de especialidades
CREATE TABLE especialidades (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NULL
) ENGINE=InnoDB;

-- Catálogo de obras sociales / prepagas
CREATE TABLE obras_sociales (
  id        SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(80) NOT NULL UNIQUE,
  codigo    VARCHAR(20) NULL UNIQUE,
  telefono  VARCHAR(30) NULL,
  activo    TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Médicos: los datos personales están en usuarios (evito duplicar = 3FN)
CREATE TABLE medicos (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT UNSIGNED NOT NULL UNIQUE,
  matricula        VARCHAR(20) NOT NULL UNIQUE,
  especialidad_id  SMALLINT UNSIGNED NOT NULL,
  telefono         VARCHAR(30) NULL,
  CONSTRAINT fk_medicos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_medicos_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Pacientes del consultorio
CREATE TABLE pacientes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dni               VARCHAR(10)  NOT NULL UNIQUE,
  nombre            VARCHAR(60)  NOT NULL,
  apellido          VARCHAR(60)  NOT NULL,
  fecha_nacimiento  DATE NOT NULL,
  sexo              ENUM('F','M','X') NOT NULL,
  telefono          VARCHAR(30)  NULL,
  email             VARCHAR(120) NULL,
  direccion         VARCHAR(150) NULL,
  obra_social_id    SMALLINT UNSIGNED NULL,
  nro_afiliado      VARCHAR(30)  NULL,
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pacientes_os FOREIGN KEY (obra_social_id) REFERENCES obras_sociales(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_pacientes_apellido (apellido)
) ENGINE=InnoDB;

-- Horarios de atención de cada médico (1 = lunes ... 7 = domingo)
CREATE TABLE horarios_atencion (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medico_id        INT UNSIGNED NOT NULL,
  dia_semana       TINYINT UNSIGNED NOT NULL,
  hora_inicio      TIME NOT NULL,
  hora_fin         TIME NOT NULL,
  duracion_turno   SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  CONSTRAINT fk_horarios_medico FOREIGN KEY (medico_id) REFERENCES medicos(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_horario_dia   CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_horario_rango CHECK (hora_fin > hora_inicio),
  CONSTRAINT chk_horario_dur   CHECK (duracion_turno BETWEEN 5 AND 120),
  UNIQUE KEY uq_horario (medico_id, dia_semana, hora_inicio)
) ENGINE=InnoDB;

-- Turnos: el corazón del sistema
CREATE TABLE turnos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id  INT UNSIGNED NOT NULL,
  medico_id    INT UNSIGNED NOT NULL,
  fecha        DATE NOT NULL,
  hora         TIME NOT NULL,
  estado       ENUM('PENDIENTE','CONFIRMADO','ATENDIDO','AUSENTE','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  motivo       VARCHAR(200) NULL,
  creado_por   INT UNSIGNED NOT NULL,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- columna calculada: vale 1 si el turno ocupa el horario, NULL si está cancelado.
  -- Así la BD no deja dar dos turnos en el mismo horario, pero sí reusar uno cancelado.
  ocupa_slot   TINYINT GENERATED ALWAYS AS (IF(estado = 'CANCELADO', NULL, 1)) STORED,
  CONSTRAINT fk_turnos_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_turnos_medico FOREIGN KEY (medico_id) REFERENCES medicos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_turnos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY uq_turno_slot (medico_id, fecha, hora, ocupa_slot),
  INDEX idx_turnos_fecha (fecha)
) ENGINE=InnoDB;

-- Consultas (historia clínica): una por turno atendido.
-- El paciente y el médico salen del turno, por eso no los repito (3FN).
CREATE TABLE consultas (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  turno_id       INT UNSIGNED NOT NULL UNIQUE,
  motivo_consulta VARCHAR(250) NOT NULL,
  diagnostico    VARCHAR(500) NOT NULL,
  tratamiento    VARCHAR(1000) NULL,
  indicaciones   VARCHAR(1000) NULL,
  peso_kg        DECIMAL(5,2) NULL,
  presion        VARCHAR(10) NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consultas_turno FOREIGN KEY (turno_id) REFERENCES turnos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Auditoría: quién hizo qué y cuándo
CREATE TABLE auditoria (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NULL,
  accion      VARCHAR(20) NOT NULL,
  entidad     VARCHAR(40) NOT NULL,
  entidad_id  INT UNSIGNED NULL,
  detalle     VARCHAR(255) NULL,
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_auditoria_fecha (fecha)
) ENGINE=InnoDB;

-- Roles fijos
INSERT INTO roles (id, nombre, descripcion) VALUES
  (1, 'ADMIN',         'Administra usuarios, médicos y catálogos'),
  (2, 'MEDICO',        'Atiende turnos y carga historia clínica'),
  (3, 'RECEPCIONISTA', 'Gestiona pacientes y turnos');
