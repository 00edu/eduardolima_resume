import { Suspense } from "react";
import EstimateClientInner from "./EstimateClientInner";

export default function EstimatePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-10 text-sm text-slate">Carregando orçamento…</div>
      }
    >
      <EstimateClientInner />
    </Suspense>
  );
}
