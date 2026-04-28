import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const DUTTYFY_URL = Deno.env.get("DUTTYFY_PIX_URL_ENCRYPTED");
    if (!DUTTYFY_URL) throw new Error("DUTTYFY_PIX_URL_ENCRYPTED ausente");

    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transaction_id");
    if (!transactionId) throw new Error("transaction_id obrigatório");

    const target = `${DUTTYFY_URL}?transactionId=${encodeURIComponent(transactionId)}`;
    const resp = await fetch(target, { method: "GET" });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error("Duttyfy status error", resp.status, data);
      return new Response(JSON.stringify({ error: data?.message || "Falha ao consultar", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normaliza para o formato que o front já consome
    const raw = String(data?.status || "").toUpperCase();
    let status: string = "pending";
    if (raw === "COMPLETED" || raw === "PAID" || raw === "APPROVED") status = "approved";
    else if (raw === "FAILED" || raw === "CANCELED" || raw === "CANCELLED" || raw === "EXPIRED") status = "failed";
    else if (raw === "REFUNDED") status = "refunded";

    return new Response(
      JSON.stringify({ status, raw_status: data?.status, paid_at: data?.paidAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("duttyfy-check-status:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
