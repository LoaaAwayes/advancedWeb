function Button({
  children,
  type = 'button',
  variant = 'primary', // primary, secondary, success, danger, warning
  size = 'md', // sm, md, lg
  fullWidth = false,
  onClick,
  disabled = false,
  className = '',
  ...rest
}) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none transition-colors';
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary/90 text-white',
    secondary: 'bg-secondary hover:bg-secondary/90 text-white',
    success: 'bg-success hover:bg-success/90 text-white',
    danger: 'bg-danger hover:bg-danger/90 text-white',
    warning: 'bg-warning hover:bg-warning/90 text-black',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
  };
  
  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    className
  ].join(' ');
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button; 