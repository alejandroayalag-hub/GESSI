// Distancia en metros entre dos coordenadas (haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// null si falta alguna coordenada (no se puede validar)
function dentroDeRadio(lat, lng, centroLat, centroLng, radio) {
  if ([lat, lng, centroLat, centroLng].some(v => v === null || v === undefined || v === '')) return { distancia: null, dentro: null };
  const distancia = distanciaMetros(+lat, +lng, +centroLat, +centroLng);
  return { distancia, dentro: distancia <= radio };
}

module.exports = { distanciaMetros, dentroDeRadio };
