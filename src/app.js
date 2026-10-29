import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { mailModo } from './services/mailService.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Para chequear rápido si la API está viva
app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'consultorio-api', mail: mailModo() }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
