export default function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]" onClick={onClose}>
      <div className={`bg-white rounded-xl w-full ${ancho} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-black">{titulo}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-black text-xl leading-none" aria-label="Cerrar">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
