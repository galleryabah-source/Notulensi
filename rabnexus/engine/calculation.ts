export type Decimal = string;

export interface CostComponent {
  code: string;
  quantity: Decimal;
  coefficient: Decimal;
  unitPrice: Decimal;
}

export interface CostInput {
  quantity: Decimal;
  material: CostComponent[];
  labor: CostComponent[];
  equipment: CostComponent[];
  overheadRate: Decimal;
  contingencyRate: Decimal;
  taxRate: Decimal;
  profitRate: Decimal;
  discount: Decimal;
}

export interface CostBreakdown {
  material: Decimal;
  labor: Decimal;
  equipment: Decimal;
  direct: Decimal;
  overhead: Decimal;
  contingency: Decimal;
  tax: Decimal;
  profit: Decimal;
  discount: Decimal;
  total: Decimal;
}

/**
 * Phase-0 contract only.
 * Production implementation must use a decimal arithmetic library or
 * PostgreSQL NUMERIC semantics. Number arithmetic is deliberately avoided.
 */
export interface DecimalArithmetic {
  add(a: Decimal, b: Decimal): Decimal;
  sub(a: Decimal, b: Decimal): Decimal;
  mul(a: Decimal, b: Decimal): Decimal;
  div(a: Decimal, b: Decimal): Decimal;
  zero(): Decimal;
}

export function componentCost(
  arithmetic: DecimalArithmetic,
  component: CostComponent,
): Decimal {
  return arithmetic.mul(
    arithmetic.mul(component.quantity, component.coefficient),
    component.unitPrice,
  );
}

export function sumComponents(
  arithmetic: DecimalArithmetic,
  components: CostComponent[],
): Decimal {
  return components.reduce(
    (sum, component) => arithmetic.add(sum, componentCost(arithmetic, component)),
    arithmetic.zero(),
  );
}

export function calculateCost(
  arithmetic: DecimalArithmetic,
  input: CostInput,
): CostBreakdown {
  const material = sumComponents(arithmetic, input.material);
  const labor = sumComponents(arithmetic, input.labor);
  const equipment = sumComponents(arithmetic, input.equipment);
  const direct = arithmetic.add(arithmetic.add(material, labor), equipment);
  const overhead = arithmetic.mul(direct, input.overheadRate);
  const contingencyBase = arithmetic.add(direct, overhead);
  const contingency = arithmetic.mul(contingencyBase, input.contingencyRate);
  const taxableBase = arithmetic.add(contingencyBase, contingency);
  const tax = arithmetic.mul(taxableBase, input.taxRate);
  const profitBase = arithmetic.add(taxableBase, tax);
  const profit = arithmetic.mul(profitBase, input.profitRate);
  const gross = arithmetic.add(profitBase, profit);
  const total = arithmetic.sub(gross, input.discount);

  return {
    material,
    labor,
    equipment,
    direct,
    overhead,
    contingency,
    tax,
    profit,
    discount: input.discount,
    total,
  };
}
