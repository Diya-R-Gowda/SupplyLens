export default function Input({
  label,
  error,
  className = '',
  labelClassName = 'grid gap-2 text-[0.92rem] font-semibold text-slate-800',
  ...props
}) {
  return (
    <label className={labelClassName}>
      {label}
      <input className={className} {...props} />
      {error ? <span className="text-red-700 text-[0.85rem] font-normal">{error}</span> : null}
    </label>
  );
}
