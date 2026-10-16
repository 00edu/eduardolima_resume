import type { Estimate } from "./types";

export function lineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

export function estimateSubtotal(estimate: Estimate): number {
  return estimate.items.reduce(
    (sum, item) => sum + lineTotal(item.quantity, item.unitPrice),
    0
  );
}

export function estimateTax(estimate: Estimate): number {
  return Math.round(estimateSubtotal(estimate) * estimate.taxRate * 100) / 100;
}

export function estimateTotal(estimate: Estimate): number {
  return Math.round((estimateSubtotal(estimate) + estimateTax(estimate)) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
