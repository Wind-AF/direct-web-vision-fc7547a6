import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const PARADISE_BASE = "https://multi.paradisepags.com";

interface CreatePixRequest {
  amount: number; // em centavos
  description: string;
  stage: string; // "seguro" | "iof" | "up2" | "up3"
  customer?: {
    name?: string;
    email?: string;
    document?: string;
    phone?: string;
  };
  tracking?: Record<string, string>;
}

function gerarCustomer(input?: CreatePixRequest["customer"]) {
  const nomes = ["Ana", "Carlos", "Maria", "Pedro", "Julia", "Lucas", "Fernanda", "Rafael", "Camila", "Bruno"];
  const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Ribeiro"];
  const ddds = ["11", "21", "31", "41", "51", "61", "71", "81", "85", "27"];

  const nome = input?.name || `${nomes[Math.floor(Math.random() * nomes.length)]} ${sobrenomes[Math.floor(Math.random() * sobrenomes.length)]}`;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const email = input?.email || `cliente_${timestamp}_${randomStr}@mail.com`;
  const document = (input?.document || Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("")).replace(/\D/g, "");
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const phone = (input?.phone || ddd + "9" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("")).replace(/\D/g, "");

  return { name: nome, email, document, phone };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PARADISE_SECRET_KEY = Deno.env.get("PARADISE_SECRET_KEY");
    const PARADISE_PRODUCT_HASH = Deno.env.get("PARADISE_PRODUCT_HASH");
    if (!PARADISE_SECRET_KEY) throw new Error("PARADISE_SECRET_KEY ausente");
    if (!PARADISE_PRODUCT_HASH) throw new Error("PARADISE_PRODUCT_HASH ausente");

    const body = (await req.json()) as CreatePixRequest;
    if (!body?.amount || !Number.isFinite(body.amount) || body.amount < 1) {
      throw new Error("amount (centavos) inválido");
    }
    // Cap amount at R$ 500,00 (50000 centavos) to prevent abuse
    if (body.amount > 50000) {
      throw new Error("amount excede o limite permitido");
    }
    const ALLOWED_STAGES = ["seguro", "iof", "up2", "up3"];
    if (!body?.stage || !ALLOWED_STAGES.includes(body.stage)) {
      throw new Error("stage inválido");
    }
    if (body.description && (typeof body.description !== "string" || body.description.length > 200)) {
      throw new Error("description inválida");
    }

    const customer = gerarCustomer(body.customer);
    const reference = `${body.stage}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const payload: Record<string, unknown> = {
      amount: Math.round(body.amount),
      description: body.description || `Bancred - ${body.stage}`,
      reference,
      productHash: PARADISE_PRODUCT_HASH,
      customer,
    };
    if (body.tracking && Object.keys(body.tracking).length > 0) {
      payload.tracking = body.tracking;
    }

    const resp = await fetch(`${PARADISE_BASE}/api/v1/transaction.php`, {
      method: "POST",
      headers: {
        "X-API-Key": PARADISE_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok || data?.status === "error") {
      console.error("Paradise create error", resp.status, data);
      return new Response(JSON.stringify({ error: data?.message || "Falha ao criar PIX", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        transaction_id: data.transaction_id,
        reference: data.id || reference,
        qr_code: data.qr_code,
        amount: data.amount,
        expires_at: data.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("paradise-create-pix:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
