require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

const EMAIL = process.env.ADMIN_EMAIL || 'admin@solucionesenseguridad.com.mx';

async function main() {
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO usuarios (email, password, nombre, role) VALUES ($1, $2, $3, 'admin') ON CONFLICT (email) DO NOTHING",
    [EMAIL, hash, 'Administrador']
  );
  console.log(`Usuario admin creado: ${EMAIL} / ${password}`);
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
