import React from 'react';
import { Botao } from './Botao.jsx';

const mapVariants = {
  primary: 'primario',
  secondary: 'secundario',
  outline: 'contorno',
  ghost: 'texto',
  danger: 'danger',
};

// Reexportação com adaptador para manter compatibilidade com componentes legados
export const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'lg',
      isLoading = false,
      disabled,
      children,
      startIcon,
      endIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const iconeInicio =
      typeof startIcon === 'string' ? (
        <span className="material-symbols-outlined text-[1.2em]">{startIcon}</span>
      ) : (
        startIcon
      );

    const iconeFim =
      typeof endIcon === 'string' ? (
        <span className="material-symbols-outlined text-[1.2em]">{endIcon}</span>
      ) : (
        endIcon
      );

    return (
      <Botao
        ref={ref}
        tipo={type}
        variante={mapVariants[variant] || variant || 'primario'}
        tamanho={size}
        isLoading={isLoading}
        disabled={disabled}
        iconeInicio={iconeInicio}
        iconeFim={iconeFim}
        className={className}
        {...props}
      >
        {children}
      </Botao>
    );
  }
);

Button.displayName = 'Button';
export default Button;
