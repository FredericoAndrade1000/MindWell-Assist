import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import GaugeChart from 'react-gauge-chart'; // Using react-gauge-chart for simplicity

// --- Button ---
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150';
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-neutral-dark hover:bg-secondary-dark focus:ring-secondary',
    danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger',
    outline: 'bg-white text-primary border border-primary hover:bg-primary/10 focus:ring-primary',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary',
  };
  const disabledStyle = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${ (disabled || loading) ? disabledStyle : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};

// --- Modal ---
export const Modal = ({ isOpen, onClose, title, children }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {title && (
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    {title}
                  </Dialog.Title>
                )}
                {children}
                 <div className="mt-4 text-right">
                  <Button variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// --- Gauge ---
// Using react-gauge-chart. Ensure it's installed: npm install react-gauge-chart
export const Gauge = ({ value, maxValue, label, id }) => {
  const percentage = value / maxValue;
  const colorRanges = [
    { limit: 0.2, color: '#5BE12C' }, // Green
    { limit: 0.4, color: '#F5CD19' }, // Yellow
    { limit: 0.6, color: '#F5CD19' }, // Yellow
    { limit: 0.8, color: '#FF7C0A' }, // Orange
    { limit: 1.0, color: '#FF0000' }, // Red
  ];

  const colors = colorRanges.map(range => range.color);
  const arcLimits = colorRanges.map(range => range.limit);


  return (
    <div className="text-center gauge-container">
       <GaugeChart
            id={`gauge-chart-${id}`}
            nrOfLevels={20} // Controls smoothness
            arcsLength={arcLimits}
            colors={colors}
            percent={percentage}
            arcPadding={0.02}
            textColor="#374151" // gray-700
            needleColor="#d1d5db" // gray-300
            needleBaseColor="#374151" // gray-700
            hideText={false}
            style={{ width: '80%', margin: '0 auto' }} // Adjust width as needed
        />
      <p className="mt-2 text-sm font-medium text-neutral-DEFAULT">{label}: {value}/{maxValue}</p>
    </div>
  );
};


// --- Input Fields (Basic example, integrate with React Hook Form) ---
export const Input = React.forwardRef(({ label, name, type = 'text', error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      id={name}
      name={name}
      type={type}
      ref={ref}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
));

export const Textarea = React.forwardRef(({ label, name, rows = 3, error, className = '', ...props }, ref) => (
 <div className="mb-4">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea
      id={name}
      name={name}
      rows={rows}
      ref={ref}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
      {...props}
     />
     {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
));

// Select needs more complex integration for RHF, basic structure:
export const Select = React.forwardRef(({ label, name, error, children, className = '', ...props }, ref) => (
 <div className="mb-4">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
        id={name}
        name={name}
        ref={ref}
        className={`block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
        {...props}
    >
        {children}
    </select>
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
 </div>
));


// --- Card ---
export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
};

// --- Spinner ---
export const Spinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  const colorStyles = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    danger: 'text-danger',
    white: 'text-white',
    neutral: 'text-neutral-DEFAULT',
  };
  return (
    <FontAwesomeIcon
      icon={faSpinner}
      spin
      className={`${sizeStyles[size]} ${colorStyles[color]} ${className}`}
    />
  );
};

// --- Alert ---
export const Alert = ({ type = 'info', title, message, className = '' }) => {
  const typeStyles = {
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    danger: 'bg-red-100 border-red-400 text-red-700', // Alias for error
  };

  if (!message && !title) return null;

  return (
    <div className={`border-l-4 p-4 ${typeStyles[type]} ${className}`} role="alert">
      {title && <p className="font-bold">{title}</p>}
      {message && <p>{message}</p>}
    </div>
  );
};
