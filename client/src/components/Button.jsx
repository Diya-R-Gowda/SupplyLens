const VARIANT_CLASSES = {
  primary: 'border-none text-white bg-gradient-to-br from-blue-700 to-teal-700',
  secondary: 'border border-slate-300 bg-white/80',
  danger: 'border-none text-white bg-red-700',
};

export default function Button({
  variant = 'secondary',
  loading = false,
  loadingText,
  type = 'button',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingText ?? children : children}
    </button>
  );
}
