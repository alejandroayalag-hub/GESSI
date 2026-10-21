const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    // Los tokens del celular de caseta solo sirven en /api/caseta
    if (req.user.tipo === 'dispositivo') return res.status(401).json({ error: 'No autorizado' });
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
