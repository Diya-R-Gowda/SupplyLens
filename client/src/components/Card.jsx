export default function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`border border-slate-400/35 ${className}`} {...props}>
      {children}
    </Component>
  );
}
