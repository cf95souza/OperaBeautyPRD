import React from 'react';
import { Phone } from 'lucide-react';
import { CampoTexto } from './CampoTexto';

export function formatarTelefoneBR(valor) {
  let v = (valor || '').replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length > 10) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  } else if (v.length > 6) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  } else if (v.length > 2) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length > 0) {
    return `(${v}`;
  }
  return v;
}

export const CampoTelefone = React.forwardRef(
  ({ value, onChange, placeholder = '(00) 00000-0000', label = 'Seu telefone', ...props }, ref) => {
    const handleChange = (e) => {
      const formatado = formatarTelefoneBR(e.target.value);
      if (onChange) {
        // Envia evento com o valor formatado
        onChange({
          ...e,
          target: {
            ...e.target,
            value: formatado,
          },
        });
      }
    };

    return (
      <CampoTexto
        ref={ref}
        type="tel"
        inputMode="tel"
        label={label}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        iconeEsquerda={<Phone size={20} strokeWidth={1.8} />}
        {...props}
      />
    );
  }
);

CampoTelefone.displayName = 'CampoTelefone';
export default CampoTelefone;
