const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const runMigrations = require('./db/migrate');
const { iniciarVigilancia } = require('./lib/vigilancia');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // detrás de nginx
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://62.238.3.136' }));
app.use(express.json());

// ponytail: solo imágenes públicas (fotos de perfil, <img> sin header auth).
// Los PDF/DOC (contratos, IMSS, finiquitos) NO se sirven aquí — solo por sus rutas /api/*/download autenticadas.
app.use('/uploads', (req, res, next) => {
  if (/\.(png|jpe?g|gif|webp)$/i.test(req.path)) return next();
  res.status(404).end();
}, express.static(path.join(__dirname, '..', 'uploads')));

// Rutas públicas
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Rutas protegidas
app.use('/api/empleados', authMiddleware, require('./routes/empleados'));
app.use('/api/documentos', authMiddleware, require('./routes/documentos'));
app.use('/api/contratos', authMiddleware, require('./routes/contratos'));
app.use('/api/pagos',     authMiddleware, require('./routes/pagos'));
app.use('/api/formatos',  authMiddleware, require('./routes/formatos'));
app.use('/api/salidas', authMiddleware, require('./routes/salidas'));
app.use('/api/documentosSalida', authMiddleware, require('./routes/documentosSalida'));
app.use('/api/culturas', authMiddleware, require('./routes/culturas'));
app.use('/api/servicios', authMiddleware, require('./routes/servicios'));
app.use('/api/guardias',  authMiddleware, require('./routes/guardias'));
app.use('/api/rondines',  authMiddleware, require('./routes/rondines'));
app.use('/api/jornadas',  authMiddleware, require('./routes/jornadas'));

// Celular de caseta: su propio token de dispositivo (ver routes/caseta.js)
app.use('/api/caseta', require('./routes/caseta'));

app.use(errorHandler);

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend GESSI corriendo en puerto ${PORT}`);
      iniciarVigilancia();
    });
  })
  .catch(err => {
    console.error('Error en migraciones:', err);
    process.exit(1);
  });
