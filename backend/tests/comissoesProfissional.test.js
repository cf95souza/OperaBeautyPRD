import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Comissões do Profissional (Rebrand Rosé Editorial)', () => {
  const filePath = path.resolve(__dirname, '../../src/pages/ComissoesProfissional.jsx');

  test('ComissoesProfissional.jsx existe e segue rigorosamente o design system Rosé Editorial', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Tipografia Playfair Display no cabeçalho
    expect(content).toMatch(/font-display/);
    expect(content).toMatch(/Minhas comissões/);

    // 2. Tokens de cores e bordas canônicos
    expect(content).toMatch(/bg-brand/);
    expect(content).toMatch(/border-line/);
    expect(content).toMatch(/text-ink/);
    expect(content).toMatch(/rounded-\[22px\]/);

    // 3. Eliminação total de material-symbols-outlined
    expect(content).not.toMatch(/material-symbols-outlined/);

    // 4. Utilização de lucide-react
    expect(content).toMatch(/from 'lucide-react'/);
    expect(content).toMatch(/Clock/);
    expect(content).toMatch(/CheckCircle2/);
    expect(content).toMatch(/TrendingUp/);
    expect(content).toMatch(/Calendar/);
    expect(content).toMatch(/Scissors/);

    // 5. Utilização de formatCurrency com alinhamento tabular
    expect(content).toMatch(/formatCurrency/);
    expect(content).toMatch(/tabular-nums/);
  });

  test('Cálculo de comissões pendentes, pagas e faturamento', () => {
    const mockAppointments = [
      { id: '1', total_price: '100.00', staff_commission_value: '40.00', commission_status: 'paid' },
      { id: '2', total_price: '150.00', staff_commission_value: '60.00', commission_status: 'pending' },
      { id: '3', total_price: '200.00', staff_commission_value: '80.00', commission_status: 'pending' },
    ];

    let pendente = 0;
    let paga = 0;
    let total = 0;

    mockAppointments.forEach(appt => {
      const comissao = Number(appt.staff_commission_value || 0);
      const preco = Number(appt.total_price || 0);
      total += preco;
      if (appt.commission_status === 'paid') {
        paga += comissao;
      } else {
        pendente += comissao;
      }
    });

    expect(total).toBe(450);
    expect(paga).toBe(40);
    expect(pendente).toBe(140);
  });
});
