import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base";
    
    const variants = {
      primary: "bg-brand-600 text-white hover:bg-brand-700 hover:translate-y-[1px] hover:shadow-hard active:translate-y-[2px] active:bg-brand-800 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
      secondary: "bg-bg-soft ring-1 ring-stroke-subtle text-text-secondary hover:ring-brand-400/40 hover:translate-y-[1px] hover:shadow-soft active:translate-y-[2px] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:hover:translate-y-0",
      ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-soft/50 active:bg-bg-soft disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
    };
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-pill",
      md: "px-4 py-2 text-sm rounded-md",
      lg: "px-6 py-3 text-base rounded-lg"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
