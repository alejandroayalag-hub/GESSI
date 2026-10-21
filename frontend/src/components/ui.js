// Clases compartidas de la marca GESSI (blanco y negro)
export const btn = 'bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50';
export const btnSec = 'border border-neutral-300 text-neutral-800 rounded-lg px-3 py-1.5 text-sm hover:border-black hover:bg-neutral-50 disabled:opacity-50';
export const input = 'w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black';
export const label = 'block text-xs font-medium text-neutral-600 mb-1 uppercase tracking-wide';
export const card = 'bg-white border border-neutral-200 rounded-xl';
export const th = 'text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2 border-b border-neutral-200';
export const td = 'px-4 py-2 text-sm text-neutral-800 border-b border-neutral-100';
export const titulo = 'text-2xl font-semibold text-black';
// Etiqueta de estado: sólida = atención, contorno = normal
export const chip = (alerta) => alerta
  ? 'inline-block text-xs font-semibold px-2 py-0.5 rounded bg-black text-white'
  : 'inline-block text-xs px-2 py-0.5 rounded border border-neutral-300 text-neutral-600';
