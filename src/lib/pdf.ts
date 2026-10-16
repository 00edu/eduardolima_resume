import { jsPDF } from "jspdf";
import type { Estimate, Project } from "./types";
import { estimateSubtotal, estimateTax, estimateTotal, formatBRL } from "./money";

export function buildEstimatePdf(project: Project, estimate: Estimate): Blob {
  const doc = new jsPDF();
  const margin = 18;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ObraCam — Orçamento", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Projeto: ${project.placeName || project.address}`, margin, y);
  y += 6;
  doc.text(`Endereço: ${project.address}`, margin, y);
  y += 6;
  doc.text(`Cliente: ${project.client.name}`, margin, y);
  y += 6;
  doc.text(`E-mail: ${project.client.email}  ·  Tel: ${project.client.phone}`, margin, y);
  y += 6;
  doc.text(`Data: ${new Date(estimate.createdAt).toLocaleString("pt-BR")}`, margin, y);
  y += 6;
  if (estimate.invoiceNumber) {
    doc.text(`Fatura: ${estimate.invoiceNumber}`, margin, y);
    y += 6;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Itens", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of estimate.items) {
    const line = `${item.quantity} ${item.unit} × ${item.description} — ${formatBRL(item.unitPrice)} = ${formatBRL(item.quantity * item.unitPrice)}`;
    const lines = doc.splitTextToSize(line, 174);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
    if (item.notes) {
      doc.setTextColor(90);
      const n = doc.splitTextToSize(`  Nota: ${item.notes}`, 170);
      doc.text(n, margin, y);
      y += n.length * 5 + 2;
      doc.setTextColor(0);
    }
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Subtotal: ${formatBRL(estimateSubtotal(estimate))}`, margin, y);
  y += 6;
  doc.text(`Impostos (${(estimate.taxRate * 100).toFixed(0)}%): ${formatBRL(estimateTax(estimate))}`, margin, y);
  y += 6;
  doc.setFontSize(13);
  doc.text(`Total: ${formatBRL(estimateTotal(estimate))}`, margin, y);
  y += 12;

  if (estimate.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const n = doc.splitTextToSize(estimate.notes, 174);
    doc.text(n, margin, y);
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
