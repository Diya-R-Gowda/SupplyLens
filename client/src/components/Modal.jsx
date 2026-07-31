export default function Modal({ open, onClose, title, children, className = '' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-[20px] p-5 bg-white/95 border border-slate-400/35 shadow-[0_24px_80px_rgba(31,59,128,0.25)] ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
