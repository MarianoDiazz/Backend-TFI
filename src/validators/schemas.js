import { z } from 'zod';

// Reglas de validación de cada formulario. Si algo no cumple, se corta antes del controlador.

const texto = (min, max, campo) =>
  z.string({ error: `${campo} es obligatorio` }).trim()
    .min(min, `${campo} debe tener al menos ${min} caracteres`)
    .max(max, `${campo} admite hasta ${max} caracteres`);

const textoOpcional = (max) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().nullable()
    .transform((v) => (v === '' ? null : v));

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email inválido'));

// Contraseña con un mínimo de seguridad
export const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(64, 'La contraseña es demasiado larga')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe tener al menos una minúscula')
  .regex(/[0-9]/, 'Debe tener al menos un número');

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora inválida (HH:MM)');
const idSchema = z.coerce.number().int().positive();
const idOpcional = z.union([idSchema, z.literal(''), z.null()]).optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

// ---------- Auth ----------
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá la contraseña'),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(20, 'Token inválido'),
  password: passwordSchema,
});

export const cambiarPasswordSchema = z.object({
  actual: z.string().min(1, 'Ingresá tu contraseña actual'),
  nueva: passwordSchema,
});

// ---------- Usuarios ----------
export const usuarioCreateSchema = z.object({
  nombre: texto(2, 60, 'El nombre'),
  apellido: texto(2, 60, 'El apellido'),
  email: emailSchema,
  password: passwordSchema,
  rol_id: z.coerce.number().int().min(1).max(3),
});

export const usuarioUpdateSchema = z.object({
  nombre: texto(2, 60, 'El nombre').optional(),
  apellido: texto(2, 60, 'El apellido').optional(),
  email: emailSchema.optional(),
  rol_id: z.coerce.number().int().min(1).max(3).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
  password: passwordSchema.optional().or(z.literal('').transform(() => undefined)),
});

// ---------- Catálogos ----------
export const especialidadSchema = z.object({
  nombre: texto(3, 80, 'El nombre'),
  descripcion: textoOpcional(200),
});

export const obraSocialSchema = z.object({
  nombre: texto(2, 80, 'El nombre'),
  codigo: textoOpcional(20),
  telefono: textoOpcional(30),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

// ---------- Médicos (crea usuario + médico juntos) ----------
export const medicoCreateSchema = z.object({
  nombre: texto(2, 60, 'El nombre'),
  apellido: texto(2, 60, 'El apellido'),
  email: emailSchema,
  password: passwordSchema,
  matricula: texto(3, 20, 'La matrícula'),
  especialidad_id: idSchema,
  telefono: textoOpcional(30),
});

export const medicoUpdateSchema = z.object({
  nombre: texto(2, 60, 'El nombre').optional(),
  apellido: texto(2, 60, 'El apellido').optional(),
  email: emailSchema.optional(),
  matricula: texto(3, 20, 'La matrícula').optional(),
  especialidad_id: idSchema.optional(),
  telefono: textoOpcional(30),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

// ---------- Pacientes ----------
export const pacienteSchema = z.object({
  dni: z.string().trim().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 números'),
  nombre: texto(2, 60, 'El nombre'),
  apellido: texto(2, 60, 'El apellido'),
  fecha_nacimiento: fecha.refine((f) => new Date(f) <= new Date(), 'La fecha de nacimiento no puede ser futura'),
  sexo: z.enum(['F', 'M', 'X'], { error: 'Sexo inválido' }),
  telefono: textoOpcional(30),
  email: z.union([emailSchema, z.literal(''), z.null()]).optional().transform((v) => v || null),
  direccion: textoOpcional(150),
  obra_social_id: idOpcional,
  nro_afiliado: textoOpcional(30),
}).refine((p) => !p.obra_social_id || p.nro_afiliado, {
  message: 'Si tiene obra social, cargá el número de afiliado',
  path: ['nro_afiliado'],
});

// ---------- Horarios ----------
export const horarioSchema = z.object({
  medico_id: idSchema,
  dia_semana: z.coerce.number().int().min(1, 'Día inválido').max(7, 'Día inválido'),
  hora_inicio: hora,
  hora_fin: hora,
  duracion_turno: z.coerce.number().int().min(5).max(120).default(20),
}).refine((h) => h.hora_fin > h.hora_inicio, {
  message: 'La hora de fin debe ser posterior a la de inicio',
  path: ['hora_fin'],
});

// ---------- Turnos ----------
export const turnoCreateSchema = z.object({
  paciente_id: idSchema,
  medico_id: idSchema,
  fecha,
  hora,
  motivo: textoOpcional(200),
});

export const turnoEstadoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'CONFIRMADO', 'AUSENTE', 'CANCELADO'], { error: 'Estado inválido' }),
});

export const turnoReprogramarSchema = z.object({ fecha, hora });

// ---------- Consultas ----------
export const consultaSchema = z.object({
  turno_id: idSchema,
  motivo_consulta: texto(3, 250, 'El motivo'),
  diagnostico: texto(3, 500, 'El diagnóstico'),
  tratamiento: textoOpcional(1000),
  indicaciones: textoOpcional(1000),
  peso_kg: z.union([z.coerce.number().min(0.5).max(400), z.literal(''), z.null()]).optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  presion: z.union([z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Presión inválida (ej: 120/80)'), z.literal(''), z.null()])
    .optional().transform((v) => v || null),
});

export const consultaUpdateSchema = consultaSchema.omit({ turno_id: true }).partial();
