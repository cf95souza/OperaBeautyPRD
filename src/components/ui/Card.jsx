import React from 'react';
import { Cartao } from './Cartao.jsx';

// Reexportação com adaptador para manter compatibilidade com componentes legados
export function Card({ className, children, ...props }) {
  return (
    <Cartao className={className} {...props}>
      {children}
    </Cartao>
  );
}

export default Card;
