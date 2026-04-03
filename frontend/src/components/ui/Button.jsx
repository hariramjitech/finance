import { Loader2 } from "lucide-react";

export const Button = ({ children, variant = "primary", size = "md", className = "", isLoading = false, disabled, ...props }) => {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200/50",
    outline: "border-2 border-gray-200 text-gray-700 hover:border-indigo-600 hover:text-indigo-600 bg-transparent",
    ghost: "text-gray-600 hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5",
    lg: "px-8 py-3.5 text-lg",
  };

  return (
    <button
      className={`
        relative font-semibold rounded-xl transition-all duration-200 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin w-5 h-5" />}
      {children}
    </button>
  );
};