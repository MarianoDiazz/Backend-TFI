/**
 * Prueba de humo de la API: recorre los casos principales y muestra OK / FALLA.
 * Uso: con el servidor levantado (npm run dev) ejecutar  npm run test:api
 * Ojo: crea datos de prueba; después conviene correr npm run db:reset.
 */
const BASE = process.env.API_URL || 'http://localhost:4000/api';
let ok = 0;
let fallas = 0;

async function api(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const tipo = res.headers.get('content-type') || '';
  const data = tipo.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data, tipo };
}

function check(nombre, condicion, extra = '') {
  if (condicion) { ok++; console.log(`  ✔ ${nombre}`); }
  else { fallas++; console.log(`  ✘ ${nombre} ${extra}`); }
}

const fechaISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

async function main() {
  console.log('\n== Autenticación ==');
  let r = await api('POST', '/auth/login', { email: 'admin@consultorio.com', password: 'mal' });
  check('login con clave incorrecta da 401', r.status === 401);
  r = await api('POST', '/auth/login', { email: 'no-es-mail', password: 'x' });
  check('login con email inválido da 400 (validación)', r.status === 400);

  const admin = (await api('POST', '/auth/login', { email: 'admin@consultorio.com', password: 'Admin123!' })).data.token;
  const medico = (await api('POST', '/auth/login', { email: 'marianod9797@gmail.com', password: 'Medico123!' })).data;
  const recep = (await api('POST', '/auth/login', { email: 'yayaburela08.ar@gmail.com', password: 'Recep123!' })).data.token;
  check('login de los 3 roles', admin && medico.token && recep);
  check('el médico trae su medico_id', medico.usuario?.medico_id === 1);

  r = await api('GET', '/usuarios');
  check('sin token da 401', r.status === 401);

  console.log('\n== Roles / permisos ==');
  r = await api('GET', '/usuarios', null, recep);
  check('recepcionista NO puede listar usuarios (403)', r.status === 403);
  r = await api('GET', '/pacientes/1/historia', null, recep);
  check('recepcionista NO ve historia clínica (403)', r.status === 403);
  r = await api('GET', '/usuarios', null, admin);
  check('admin lista usuarios', r.status === 200 && r.data.data.length >= 6);

  console.log('\n== ABM de usuarios ==');
  r = await api('POST', '/usuarios', { nombre: 'Test', apellido: 'Usuario', email: 'test@x.com', password: 'corta', rol_id: 3 }, admin);
  check('contraseña débil rechazada', r.status === 400);
  r = await api('POST', '/usuarios', { nombre: 'Test', apellido: 'Usuario', email: 'test@x.com', password: 'Prueba123', rol_id: 3 }, admin);
  check('alta de usuario', r.status === 201);
  const nuevoUser = r.data.data?.id;
  r = await api('POST', '/usuarios', { nombre: 'Test', apellido: 'Usuario', email: 'test@x.com', password: 'Prueba123', rol_id: 3 }, admin);
  check('email duplicado da 409', r.status === 409);
  r = await api('PUT', `/usuarios/${nuevoUser}`, { nombre: 'Testeado' }, admin);
  check('modificación de usuario', r.status === 200 && r.data.data.nombre === 'Testeado');
  r = await api('DELETE', `/usuarios/${nuevoUser}`, null, admin);
  check('baja lógica de usuario', r.status === 200);
  r = await api('POST', '/auth/login', { email: 'test@x.com', password: 'Prueba123' });
  check('usuario dado de baja no puede entrar', r.status === 403);
  r = await api('DELETE', '/usuarios/1', null, admin);
  check('admin no se puede dar de baja a sí mismo', r.status === 400);

  console.log('\n== Pacientes ==');
  r = await api('POST', '/pacientes', { dni: '12', nombre: 'A', apellido: 'B', fecha_nacimiento: '2090-01-01', sexo: 'Z' }, recep);
  check('paciente inválido devuelve lista de errores', r.status === 400 && r.data.errores.length >= 4);
  const pac = { dni: '40111222', nombre: 'Prueba', apellido: 'Paciente', fecha_nacimiento: '1990-05-10', sexo: 'F', obra_social_id: 3, nro_afiliado: '123' };
  r = await api('POST', '/pacientes', pac, recep);
  check('alta de paciente', r.status === 201);
  const pacId = r.data.data?.id;
  r = await api('POST', '/pacientes', pac, recep);
  check('DNI duplicado da 409', r.status === 409);
  r = await api('POST', '/pacientes', { ...pac, dni: '40111223', obra_social_id: 999, nro_afiliado: '1' }, recep);
  check('obra social inexistente rechazada', r.status === 400);
  r = await api('GET', '/pacientes?buscar=Prueba', null, recep);
  check('búsqueda de pacientes', r.data.data.some((p) => p.id === pacId));

  console.log('\n== Turnos ==');
  // busco el próximo lunes (Mariano atiende lunes 08 a 12)
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 1);
  d.setDate(d.getDate() + 14);
  const lunes = fechaISO(d);
  r = await api('GET', `/turnos/disponibles?medico_id=1&fecha=${lunes}`, null, recep);
  check('consulta de horarios disponibles', r.status === 200 && r.data.data.length === 12);
  r = await api('GET', '/turnos/primer-libre?medico_id=1', null, recep);
  check('busca el primer horario libre', r.status === 200 && r.data.data.fecha >= fechaISO(new Date()));
  r = await api('POST', '/turnos', { paciente_id: pacId, medico_id: 1, fecha: lunes, hora: '08:00' }, recep);
  check('alta de turno', r.status === 201);
  const turnoId = r.data.data?.id;
  r = await api('POST', '/turnos', { paciente_id: 1, medico_id: 1, fecha: lunes, hora: '08:00' }, recep);
  check('turno superpuesto da 409', r.status === 409);
  r = await api('POST', '/turnos', { paciente_id: 1, medico_id: 1, fecha: lunes, hora: '08:10' }, recep);
  check('hora fuera de la grilla rechazada', r.status === 400);
  r = await api('POST', '/turnos', { paciente_id: 1, medico_id: 1, fecha: '2020-01-06', hora: '08:00' }, recep);
  check('fecha pasada rechazada', r.status === 400);
  r = await api('PATCH', `/turnos/${turnoId}/estado`, { estado: 'AUSENTE' }, recep);
  check('no se marca ausente un turno futuro', r.status === 400);
  r = await api('PATCH', `/turnos/${turnoId}/reprogramar`, { fecha: lunes, hora: '08:20' }, recep);
  check('reprogramar turno', r.status === 200 || r.status === 409);
  r = await api('PATCH', `/turnos/${turnoId}/estado`, { estado: 'CANCELADO' }, recep);
  check('cancelar turno', r.status === 200);
  r = await api('PATCH', `/turnos/${turnoId}/estado`, { estado: 'CONFIRMADO' }, recep);
  check('un turno cancelado no vuelve a confirmarse', r.status === 400);

  console.log('\n== Consulta médica (transacción) ==');
  const hoy = fechaISO(new Date());
  const { data: agenda } = (await api('GET', `/turnos?desde=2000-01-01&hasta=${hoy}`, null, medico.token)).data;
  check('el médico solo ve sus turnos', agenda.every((t) => t.medico_id === 1));
  const pendiente = agenda.find((t) => ['PENDIENTE', 'CONFIRMADO'].includes(t.estado));
  if (pendiente) {
    r = await api('POST', '/consultas', { turno_id: pendiente.id, motivo_consulta: 'Control', diagnostico: 'Sano', presion: '120/80', peso_kg: 70 }, medico.token);
    check('registrar consulta', r.status === 201);
    r = await api('GET', `/turnos/${pendiente.id}`, null, medico.token);
    check('el turno quedó ATENDIDO', r.data.data.estado === 'ATENDIDO');
    r = await api('POST', '/consultas', { turno_id: pendiente.id, motivo_consulta: 'Control', diagnostico: 'Sano' }, medico.token);
    check('no se puede cargar dos veces la misma consulta', r.status === 400 || r.status === 409);
  } else {
    console.log('  (no hay turnos pendientes de hoy o pasados para probar la consulta)');
  }
  r = await api('POST', '/consultas', { turno_id: 1, motivo_consulta: 'x', diagnostico: 'y' }, recep);
  check('recepcionista no puede cargar consultas', r.status === 403);

  console.log('\n== Integridad referencial ==');
  r = await api('DELETE', '/especialidades/1', null, admin);
  check('no se borra una especialidad con médicos (409)', r.status === 409);
  r = await api('DELETE', '/obras-sociales/1', null, admin);
  check('no se borra una obra social con pacientes (409)', r.status === 409);

  console.log('\n== Reportes ==');
  for (const f of ['pdf', 'xlsx', 'csv']) {
    r = await api('GET', `/reportes/turnos?formato=${f}`, null, admin);
    check(`reporte de turnos en ${f.toUpperCase()}`, r.status === 200 && r.data.byteLength > 200);
  }
  r = await api('GET', '/reportes/productividad?formato=pdf', null, admin);
  check('reporte de productividad', r.status === 200);
  r = await api('GET', '/reportes/historia/1?formato=pdf', null, medico.token);
  check('historia clínica en PDF', r.status === 200 && r.tipo.includes('pdf'));
  r = await api('GET', '/reportes/turnos?formato=doc', null, admin);
  check('formato inválido rechazado', r.status === 400);

  console.log('\n== Recuperación de contraseña ==');
  r = await api('POST', '/auth/forgot-password', { email: 'noexiste@x.com' });
  check('mail inexistente responde igual (no revela usuarios)', r.status === 200);
  r = await api('POST', '/auth/reset-password', { token: 'a'.repeat(64), password: 'Nueva1234' });
  check('token inválido rechazado', r.status === 400);

  console.log(`\nResultado: ${ok} OK, ${fallas} con falla\n`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error('No se pudo conectar con la API. ¿Está corriendo el servidor?', e.message);
  process.exit(1);
});
