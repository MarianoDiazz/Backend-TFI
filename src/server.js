import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';

// Primero pruebo la base; si no conecta aviso claro en vez de explotar después
async function iniciar() {
  try {
    await testConnection();
    console.log(`✔ Conectado a MySQL (${env.db.database})`);
  } catch (err) {
    console.error('✘ No se pudo conectar a MySQL:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('  La base todavía no existe. Creala con: npm run db:reset');
    } else {
      console.error('  Revisá que MySQL esté iniciado en XAMPP y los datos del archivo .env');
    }
    process.exit(1);
  }

  const server = app.listen(env.port, (err) => {
    if (err) return; // el error lo maneja server.on('error') de abajo
    console.log(`✔ API escuchando en http://localhost:${env.port}/api`);
  });

  // Si el puerto ya está ocupado (por ejemplo, el backend quedó abierto en otra terminal) aviso claro
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✘ El puerto ${env.port} ya está en uso. ¿Tenés el backend abierto en otra terminal?`);
      console.error('  Cerrá esa terminal (o cambiá PORT en el .env) y volvé a ejecutar npm run dev');
    } else {
      console.error('✘ No se pudo iniciar el servidor:', err.message);
    }
    process.exit(1);
  });
}

// Si algo se escapa, lo registro y no dejo el proceso en un estado raro
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

iniciar();
