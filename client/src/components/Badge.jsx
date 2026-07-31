export default function Badge({ className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${className}`} {...props}>
      {children}
    </span>
  );
}
