import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Si no hay credenciales en el .env, en vez de mandar el mail lo muestro por consola
const smtpConfigurado = Boolean(env.mail.user && env.mail.pass);

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: { user: env.mail.user, pass: env.mail.pass },
    })
  : null;

export async function enviarMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('\n========== MAIL (modo consola, SMTP sin configurar) ==========');
    console.log(`Para: ${to}\nAsunto: ${subject}\n\n${text}`);
    console.log('==============================================================\n');
    return { simulado: true };
  }
  await transporter.sendMail({ from: env.mail.from, to, subject, html, text });
  return { simulado: false };
}

export async function enviarMailRecuperacion(usuario, link) {
  const subject = 'Recuperación de contraseña - Consultorio Médico';
  const text = `Hola ${usuario.nombre}:\n\nPediste restablecer tu contraseña. Entrá a este link (vence en 30 minutos):\n${link}\n\nSi no fuiste vos, ignorá este mensaje.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
      <h2 style="color:#c13f72">Consultorio Médico</h2>
      <p>Hola <b>${usuario.nombre}</b>:</p>
      <p>Recibimos un pedido para restablecer tu contraseña. Hacé clic en el botón (el link vence en 30 minutos):</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#c13f72;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">Si no pediste el cambio, ignorá este correo; tu contraseña sigue igual.</p>
    </div>`;
  return enviarMail({ to: usuario.email, subject, html, text });
}

export async function enviarMailConfirmacionCambio(usuario) {
  return enviarMail({
    to: usuario.email,
    subject: 'Tu contraseña fue cambiada - Consultorio Médico',
    text: `Hola ${usuario.nombre}: te avisamos que tu contraseña se cambió correctamente. Si no fuiste vos, comunicate con el administrador.`,
    html: `<p>Hola <b>${usuario.nombre}</b>: te avisamos que tu contraseña se cambió correctamente.</p>
           <p style="color:#6b7280">Si no fuiste vos, comunicate con el administrador.</p>`,
  });
}

export const mailModo = () => (smtpConfigurado ? 'smtp' : 'consola');
