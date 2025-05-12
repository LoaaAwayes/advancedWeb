import { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  id,
  name,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...rest
}, ref) => {
  return (
    <div className="flex items-center mb-4">
      <input
        ref={ref}
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`
          h-4 w-4 rounded border-darkborder bg-darkcard text-primary focus:ring-primary/30
          ${disabled ? 'cursor-not-allowed' : ''}
          ${className}
        `}
        disabled={disabled}
        {...rest}
      />
      {label && (
        <label
          htmlFor={id}
          className={`ml-2 block text-sm text-darktext ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        >
          {label}
        </label>
      )}
    </div>
  );
});

export default Checkbox;
