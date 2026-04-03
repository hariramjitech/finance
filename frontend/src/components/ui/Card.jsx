// src/components/ui/Card.jsx
export const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6 ${className}`} {...props}>
    {children}
  </div>
);