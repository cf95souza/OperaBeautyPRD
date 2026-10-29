import React from 'react';
import { CampoTexto } from './CampoTexto.jsx';

// Reexportação com adaptador para manter compatibilidade com componentes legados
export const Input = React.forwardRef(
  ({ className, type = 'text', label, error, helperText, startIcon, endIcon, ...props }, ref) => {
    const iconeEsquerda =
      typeof startIcon === 'string' ? (
        <span className="material-symbols-outlined text-[20px]">{startIcon}</span>
      ) : (
        startIcon
      );

    const iconeDireita =
      typeof endIcon === 'string' ? (
        <span className="material-symbols-outlined text-[20px]">{endIcon}</span>
      ) : (
        endIcon
      );

    return (
      <CampoTexto
        ref={ref}
        type={type}
        label={label}
        error={error}
        textoAjuda={helperText}
        iconeEsquerda={iconeEsquerda}
        iconeDireita={iconeDireita}
        className={className}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
export default Input;
