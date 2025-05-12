import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error = '',
  className = '',
  ...rest
}, ref) => {
  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-darktext mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        className={`
          w-full rounded-md border-darkborder bg-darkcard text-darktext shadow-sm 
          focus:border-primary focus:ring focus:ring-primary/30 
          ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : 'border-darkborder'}
          ${disabled ? 'bg-darkheader cursor-not-allowed' : ''}
          ${className}
        `}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        {...rest}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});

export default Input;