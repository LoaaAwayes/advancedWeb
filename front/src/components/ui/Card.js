function Card({ children, className = '', ...rest }) {
  return (
    <div 
      className={`bg-darkcard rounded-lg shadow-md overflow-hidden border border-darkborder ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-darkborder ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-darkborder ${className}`}>
      {children}
    </div>
  );
}

export default Card;
