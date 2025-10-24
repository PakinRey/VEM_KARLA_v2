import React from 'react';

// Actualizado para aceptar un 'icon' opcional y 'className'
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, id, className, ...props }, ref) => {
    return (
      <div className={className}>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
        <div className="relative rounded-md shadow-sm">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              {React.cloneElement(icon as React.ReactElement, {
                className: "h-5 w-5 text-slate-400"
              })}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`block w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              icon ? 'pl-10' : 'px-3'
            } py-2`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;