/**
 * Crea la base desde cero (schema.sql) y la llena con datos de prueba realistas.
 * Uso: npm run db:reset
 * Las fechas de los turnos se calculan a partir de HOY, así la demo siempre se ve actual.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Random con semilla (algoritmo mulberry32): siempre genera los mismos datos, así la demo es repetible
let semilla = 20261021;
const rnd = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];

const fmt = (d) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};
const diaSemana = (d) => (d.getDay() === 0 ? 7 : d.getDay());

async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    multipleStatements: true,
  });

  console.log('→ Creando estructura...');
  await conn.query(fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8'));
  await conn.changeUser({ database: env.db.database });

  console.log('→ Cargando catálogos...');
  await conn.query(`INSERT INTO especialidades (nombre, descripcion) VALUES
    ('Clínica Médica', 'Atención integral del adulto'),
    ('Cardiología', 'Enfermedades del corazón y sistema circulatorio'),
    ('Pediatría', 'Atención de niños y adolescentes'),
    ('Traumatología', 'Lesiones del sistema músculo-esquelético'),
    ('Kinesiología', 'Rehabilitación física y motora'),
    ('Dermatología', 'Enfermedades de la piel')`);

  await conn.query(`INSERT INTO obras_sociales (nombre, codigo, telefono) VALUES
    ('PAMI', 'PAMI', '138'),
    ('Subsidio de Salud Tucumán', 'SST', '0381-4502700'),
    ('OSDE', 'OSDE', '0810-555-6733'),
    ('Swiss Medical', 'SWISS', '0810-333-8876'),
    ('OSECAC', 'OSECAC', '0800-345-0200'),
    ('Sancor Salud', 'SANCOR', '0800-777-4673')`);

  console.log('→ Creando usuarios...');
  const hAdmin = await bcrypt.hash('Admin123!', 10);
  const hMed = await bcrypt.hash('Medico123!', 10);
  const hRec = await bcrypt.hash('Recep123!', 10);

  await conn.query(`INSERT INTO usuarios (id, nombre, apellido, email, password_hash, rol_id) VALUES
    (1, 'Administrador', 'Sistema', 'admin@consultorio.com', ?, 1),
    (2, 'Mariano', 'Diaz', 'marianod9797@gmail.com', ?, 2),
    (3, 'Isaias', 'Burela', 'yayaburela08.ar@gmail.com', ?, 3),
    (4, 'Lucía', 'Fernández', 'lucia.fernandez@consultorio.com', ?, 2),
    (5, 'Javier', 'Medina', 'javier.medina@consultorio.com', ?, 2),
    (6, 'Carolina', 'Ruiz', 'carolina.ruiz@consultorio.com', ?, 2)`,
  [hAdmin, hMed, hRec, hMed, hMed, hMed]);

  await conn.query(`INSERT INTO medicos (id, usuario_id, matricula, especialidad_id, telefono) VALUES
    (1, 2, 'MP-10458', 1, '3865-401122'),
    (2, 4, 'MP-8821', 2, '3865-415500'),
    (3, 5, 'MP-12030', 4, '3865-438877'),
    (4, 6, 'MP-9764', 3, '3865-422190')`);

  // dia_semana: 1 lunes ... 6 sábado
  const horarios = [
    // Dr. Mariano Diaz (clínica): lunes, miércoles y viernes de mañana; martes y jueves de tarde
    [1, 1, '08:00', '12:00', 20], [1, 3, '08:00', '12:00', 20], [1, 5, '08:00', '12:00', 20],
    [1, 2, '16:00', '20:00', 20], [1, 4, '16:00', '20:00', 20],
    // Dra. Fernández (cardiología): turnos de 30 minutos
    [2, 1, '15:00', '19:00', 30], [2, 3, '15:00', '19:00', 30], [2, 5, '09:00', '13:00', 30],
    // Dr. Medina (traumatología)
    [3, 2, '08:00', '12:00', 20], [3, 4, '08:00', '12:00', 20],
    // Dra. Ruiz (pediatría)
    [4, 1, '09:00', '13:00', 20], [4, 3, '09:00', '13:00', 20], [4, 5, '15:00', '18:00', 20],
  ];
  await conn.query(
    'INSERT INTO horarios_atencion (medico_id, dia_semana, hora_inicio, hora_fin, duracion_turno) VALUES ?',
    [horarios]
  );

  console.log('→ Cargando pacientes...');
  const nombresF = ['María', 'Ana', 'Laura', 'Sofía', 'Valentina', 'Rosa', 'Graciela', 'Camila', 'Florencia', 'Norma',
    'Silvia', 'Julieta', 'Mercedes', 'Lucía', 'Paula', 'Elena', 'Agustina', 'Marta', 'Inés', 'Carolina'];
  const nombresM = ['José', 'Juan', 'Carlos', 'Luis', 'Martín', 'Diego', 'Ramón', 'Hugo', 'Facundo', 'Matías',
    'Pedro', 'Sergio', 'Benjamín', 'Tomás', 'Raúl', 'Ricardo', 'Gustavo', 'Nicolás', 'Alberto', 'Julio'];
  const apellidos = ['González', 'Rodríguez', 'López', 'Pérez', 'Gómez', 'Sosa', 'Romano', 'Paz', 'Juárez', 'Herrera',
    'Villagra', 'Ledesma', 'Coronel', 'Albornoz', 'Figueroa', 'Toledo', 'Acosta', 'Robles', 'Ibáñez', 'Navarro',
    'Medina', 'Bustos', 'Carrizo', 'Guerrero', 'Lazarte', 'Nieva', 'Orellana', 'Palavecino', 'Quiroga', 'Soria'];
  const localidades = ['Aguilares', 'Concepción', 'Monteros', 'Juan B. Alberdi', 'Simoca', 'Famaillá'];
  const anioActual = new Date().getFullYear();

  // 100 pacientes, sin nombres repetidos: 20% chicos (pediatría), 50% adultos, 30% mayores (casi todos PAMI)
  const pacientes = [];
  const usados = new Set();
  while (pacientes.length < 100) {
    const sexo = rnd() < 0.55 ? 'F' : 'M';
    const nombre = sexo === 'F' ? elegir(nombresF) : elegir(nombresM);
    const apellido = elegir(apellidos);
    if (usados.has(nombre + apellido)) continue;
    usados.add(nombre + apellido);
    const r = rnd();
    const edad = r < 0.2 ? 1 + Math.floor(rnd() * 14) : r < 0.7 ? 18 + Math.floor(rnd() * 46) : 65 + Math.floor(rnd() * 25);
    const anio = anioActual - edad - 1;
    const fn = `${anio}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;
    // el DNI argentino va más o menos de la mano con el año de nacimiento
    const dni = String(4000000 + (anio - 1920) * 620000 + Math.floor(rnd() * 600000));
    if (usados.has(dni)) continue;
    usados.add(dni);
    const os = edad >= 65 ? (rnd() < 0.85 ? 1 : 2 + Math.floor(rnd() * 5)) : (rnd() < 0.2 ? null : 2 + Math.floor(rnd() * 5));
    const adulto = edad >= 18;
    pacientes.push([
      dni, nombre, apellido, fn, sexo,
      `3865-${String(400000 + Math.floor(rnd() * 99999))}`,
      adulto && rnd() < 0.6 ? `${nombre}.${apellido}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@mail.com' : null,
      `Calle ${Math.floor(rnd() * 900) + 100}, ${elegir(localidades)}`,
      os, os ? String(Math.floor(rnd() * 900000000) + 100000000) : null,
    ]);
  }
  await conn.query(
    `INSERT INTO pacientes (dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email, direccion, obra_social_id, nro_afiliado) VALUES ?`,
    [pacientes]
  );

  // fecha de alta repartida en los últimos 2 años (unos pocos son nuevos de este mes)
  const [filasPac] = await conn.query('SELECT id, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad FROM pacientes');
  for (const { id } of filasPac) {
    const dias = rnd() < 0.1 ? Math.floor(rnd() * 15) : 40 + Math.floor(rnd() * 690);
    await conn.query('UPDATE pacientes SET creado_en = DATE_SUB(NOW(), INTERVAL ? DAY) WHERE id = ?', [dias, id]);
  }

  console.log('→ Generando turnos y consultas...');
  // Motivos y diagnósticos según la especialidad, así la historia clínica tiene sentido
  const POR_ESPECIALIDAD = {
    1: { // clínica médica
      motivos: ['Control de rutina', 'Control de presión', 'Fiebre y tos', 'Resultados de laboratorio', 'Control de diabetes', 'Dolor de cabeza', 'Certificado de aptitud física'],
      diag: [
        ['Hipertensión arterial controlada', 'Continuar enalapril 10 mg/día', 'Dieta hiposódica, caminatas de 30 min'],
        ['Cefalea tensional', 'Ibuprofeno 400 mg cada 8 h por 3 días', 'Descanso, hidratación'],
        ['Infección respiratoria alta', 'Paracetamol 500 mg cada 6 h', 'Reposo 48 h, abundante líquido'],
        ['Diabetes tipo 2 en control', 'Metformina 850 mg con almuerzo y cena', 'Control de glucemia en 3 meses'],
        ['Paciente sano, apto físico', null, 'Control anual'],
        ['Dislipemia', 'Atorvastatina 10 mg por la noche', 'Repetir perfil lipídico en 3 meses'],
      ],
    },
    2: { // cardiología
      motivos: ['Control cardiológico', 'Palpitaciones', 'Control de presión', 'Riesgo quirúrgico', 'Dolor de pecho al esfuerzo'],
      diag: [
        ['Hipertensión arterial estadio 1', 'Losartán 50 mg/día', 'Control de presión domiciliario'],
        ['Extrasístoles benignas', null, 'Evitar cafeína; volver si aumentan'],
        ['Riesgo quirúrgico bajo', null, 'ECG normal; apto para cirugía programada'],
        ['Fibrilación auricular en control', 'Continuar anticoagulación', 'Control en 30 días con laboratorio'],
      ],
    },
    3: { // traumatología
      motivos: ['Dolor lumbar', 'Dolor de rodilla', 'Esguince de tobillo', 'Control post fractura', 'Dolor de hombro'],
      diag: [
        ['Lumbalgia mecánica', 'Diclofenac 75 mg + kinesiología 10 sesiones', 'Evitar levantar peso'],
        ['Gonartrosis leve', 'Antiinflamatorio tópico y kinesiología', 'Bajar de peso, bicicleta fija'],
        ['Esguince de tobillo grado I', 'Vendaje y hielo 48 h', 'Volver en 10 días'],
        ['Consolidación de fractura de radio', null, 'Retirar yeso; iniciar rehabilitación'],
        ['Tendinitis del manguito rotador', 'Ibuprofeno 600 mg cada 12 h por 5 días', 'Kinesiología 10 sesiones'],
      ],
    },
    4: { // pediatría
      motivos: ['Control de niño sano', 'Fiebre', 'Tos y mocos', 'Vacunación', 'Dolor de oído', 'Certificado escolar'],
      diag: [
        ['Niño sano, crecimiento adecuado', null, 'Próximo control en 6 meses'],
        ['Faringitis viral', 'Paracetamol según peso', 'Abundante líquido; volver si sigue con fiebre a las 72 h'],
        ['Bronquiolitis leve', 'Lavados nasales, nebulizaciones con solución fisiológica', 'Control en 48 h'],
        ['Otitis media aguda', 'Amoxicilina según peso por 7 días', 'Control al terminar el tratamiento'],
        ['Apto para actividad física escolar', null, 'Certificado entregado'],
      ],
    },
  };
  // cada especialidad atiende solo a los pacientes que le corresponden
  const atiende = (medicoId, edad) => (medicoId === 4 ? edad < 16 : medicoId === 2 ? edad >= 40 : edad >= 16);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const minutosAhora = new Date().getHours() * 60 + new Date().getMinutes();
  const turnos = [];
  // Reglas para que la agenda sea creíble:
  // - con el mismo médico, un paciente vuelve recién a las 3 semanas
  // - con cualquier médico, deja al menos 6 días entre turnos
  const ultimaVisita = new Map();      // paciente -> fecha (ms) del último turno
  const ultimaConMedico = new Map();   // "paciente|médico" -> fecha (ms)
  const DIA = 86400000;

  for (let offset = -35; offset <= 14; offset++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + offset);
    const fecha = fmt(d);
    const ocupadosHoy = new Set();
    for (const [medicoId, dia, ini, fin, dur] of horarios) {
      if (dia !== diaSemana(d)) continue;
      const [h1, m1] = ini.split(':').map(Number);
      const [h2, m2] = fin.split(':').map(Number);
      for (let m = h1 * 60 + m1; m + dur <= h2 * 60 + m2; m += dur) {
        // los días pasados se llenaron más; los próximos días se van llenando de a poco
        const ocupacion = offset <= 0 ? 0.45 : Math.max(0.1, 0.5 - offset * 0.03);
        if (rnd() > ocupacion) continue;
        const candidatos = filasPac.filter((p) => atiende(medicoId, p.edad) && !ocupadosHoy.has(p.id)
          && (!ultimaVisita.has(p.id) || d - ultimaVisita.get(p.id) >= 6 * DIA)
          && (!ultimaConMedico.has(`${p.id}|${medicoId}`) || d - ultimaConMedico.get(`${p.id}|${medicoId}`) >= 21 * DIA));
        if (candidatos.length === 0) continue;
        const pac = elegir(candidatos);
        ocupadosHoy.add(pac.id);
        ultimaVisita.set(pac.id, d.getTime());
        ultimaConMedico.set(`${pac.id}|${medicoId}`, d.getTime());
        const hora = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;

        // estado según si el turno ya pasó (hoy cuenta la hora actual)
        const yaPaso = offset < 0 || (offset === 0 && m + dur <= minutosAhora);
        let estado;
        if (yaPaso) {
          const r = rnd();
          estado = r < 0.8 ? 'ATENDIDO' : r < 0.92 ? 'AUSENTE' : 'CANCELADO';
        } else {
          estado = offset <= 2 && rnd() < 0.7 ? 'CONFIRMADO' : 'PENDIENTE';
        }
        turnos.push([pac.id, medicoId, fecha, hora, estado, elegir(POR_ESPECIALIDAD[medicoId].motivos), rnd() < 0.85 ? 3 : 1]);
      }
    }
  }
  await conn.query(
    'INSERT INTO turnos (paciente_id, medico_id, fecha, hora, estado, motivo, creado_por) VALUES ?',
    [turnos]
  );
  // los turnos se dieron entre 1 y 15 días antes de la fecha del turno
  await conn.query('UPDATE turnos SET creado_en = DATE_SUB(TIMESTAMP(fecha, hora), INTERVAL 1 + FLOOR(RAND(7) * 15) DAY)');

  // Una consulta por cada turno ATENDIDO, coherente con la especialidad y la edad
  const [atendidos] = await conn.query(`
    SELECT t.id, t.motivo, t.medico_id, TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, t.fecha) AS edad
    FROM turnos t JOIN pacientes p ON p.id = t.paciente_id WHERE t.estado = 'ATENDIDO'`);
  const consultas = atendidos.map((t) => {
    const [diag, trat, ind] = elegir(POR_ESPECIALIDAD[t.medico_id].diag);
    const peso = t.edad < 14 ? 4 + t.edad * 3 + rnd() * 4 : 55 + rnd() * 40;
    const presion = t.edad < 14 ? null : `${110 + Math.floor(rnd() * 40)}/${70 + Math.floor(rnd() * 20)}`;
    return [t.id, t.motivo, diag, trat, ind, peso.toFixed(1), presion];
  });
  if (consultas.length) {
    await conn.query(
      `INSERT INTO consultas (turno_id, motivo_consulta, diagnostico, tratamiento, indicaciones, peso_kg, presion) VALUES ?`,
      [consultas]
    );
  }

  // Últimos ingresos y una auditoría con movimiento real de los últimos días
  await conn.query(`UPDATE usuarios SET ultimo_login = DATE_SUB(NOW(), INTERVAL FLOOR(RAND(3) * 72) HOUR) WHERE id IN (1, 2, 3, 4, 6)`);
  await conn.query(`INSERT INTO auditoria (usuario_id, accion, entidad, detalle, fecha) VALUES (1, 'SEED', 'sistema', 'Carga inicial de datos de prueba', DATE_SUB(NOW(), INTERVAL 40 DAY))`);
  await conn.query(`
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, fecha)
    SELECT creado_por, 'ALTA', 'turnos', id, CONCAT(fecha, ' ', LEFT(hora, 5)), creado_en
    FROM turnos WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 5 DAY) AND creado_en <= NOW()`);
  await conn.query(`
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, fecha)
    SELECT u.id, 'ALTA', 'consultas', c.id, CONCAT('Turno ', t.id), TIMESTAMP(t.fecha, t.hora) + INTERVAL 15 MINUTE
    FROM consultas c JOIN turnos t ON t.id = c.turno_id JOIN medicos m ON m.id = t.medico_id JOIN usuarios u ON u.id = m.usuario_id
    WHERE t.fecha >= DATE_SUB(CURDATE(), INTERVAL 5 DAY)`);

  const [[r]] = await conn.query(`SELECT
    (SELECT COUNT(*) FROM pacientes) p, (SELECT COUNT(*) FROM turnos) t, (SELECT COUNT(*) FROM consultas) c`);
  console.log(`✔ Listo: ${r.p} pacientes, ${r.t} turnos, ${r.c} consultas.`);
  console.log('\n  Usuarios de prueba:');
  console.log('  ADMIN          admin@consultorio.com      / Admin123!');
  console.log('  MÉDICO         marianod9797@gmail.com     / Medico123!');
  console.log('  RECEPCIONISTA  yayaburela08.ar@gmail.com  / Recep123!\n');
  await conn.end();
}

main().catch((err) => {
  console.error('✘ Error al resetear la base:', err.message);
  process.exit(1);
});
