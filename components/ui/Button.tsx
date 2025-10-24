import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out';
  
  const variantStyles = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-transparent disabled:bg-blue-400',
    secondary: 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500 border-transparent disabled:bg-blue-50',
    outline: 'text-blue-600 bg-white border-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:border-zinc-300',
  };

  const spinner = (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${isLoading ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && spinner}
      {children}
    </button>
  );
};

export default Button;
