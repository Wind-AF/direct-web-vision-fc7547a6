// Lógica única de cálculo da parcela mensal — usada em /oferta, /aprovado, /dashboard
// para garantir que o valor seja sempre consistente com o que o usuário escolheu.

const FATORES: Record<number, number> = {
  12: 0.0419325,
  24: 0.0223635, // referência do print
  36: 0.0158400,
  48: 0.0126200,
  60: 0.0107150,
  72: 0.0094700,
};

export function calcularParcelaMensal(valor: number, parcelas: number): number {
  const fator = FATORES[parcelas] ?? FATORES[24];
  return valor * fator;
}

export function calcularTotalPagar(valor: number, parcelas: number): number {
  return calcularParcelaMensal(valor, parcelas) * parcelas;
}
