import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

function gerarCpfValido(): string {
  const n: number[] = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calcDV = (base: number[]) => {
    const factorStart = base.length + 1;
    const sum = base.reduce((acc, v, i) => acc + v * (factorStart - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calcDV(n);
  const d2 = calcDV([...n, d1]);
  return [...n, d1, d2].join("");
}

function isCpfValido(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calcDV = (base: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(base[i]) * (len + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calcDV(c, 9) === parseInt(c[9]) && calcDV(c, 10) === parseInt(c[10]);
}

function gerarCustomer(input?: CreatePixRequest["customer"]) {
  const nomes = ["Ana", "Carlos", "Maria", "Pedro", "Julia", "Lucas", "Fernanda", "Rafael", "Camila", "Bruno"];
  const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Ribeiro"];
  const ddds = ["11", "21", "31", "41", "51", "61", "71", "81", "85", "27"];

  const nome = input?.name || `${nomes[Math.floor(Math.random() * nomes.length)]} ${sobrenomes[Math.floor(Math.random() * sobrenomes.length)]}`;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const email = input?.email || `cliente_${timestamp}_${randomStr}@mail.com`;

  // CPF: usa o do input se válido, senão gera um válido
  const inputDoc = (input?.document || "").replace(/\D/g, "");
  const document = inputDoc && isCpfValido(inputDoc) ? inputDoc : gerarCpfValido();

  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const phone = (input?.phone || ddd + "9" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("")).replace(/\D/g, "");

  return { name: nome, email, document, phone };
}

function trackingToUtm(tracking?: Record<string, string>): string | undefined {
  if (!tracking || Object.keys(tracking).length === 0) return undefined;
  return Object.entries(tracking)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const DUTTYFY_URL = Deno.env.get("DUTTYFY_PIX_URL_ENCRYPTED");
    if (!DUTTYFY_URL) throw new Error("DUTTYFY_PIX_URL_ENCRYPTED ausente");

    const body = (await req.json()) as CreatePixRequest;
    if (!body?.amount || !Number.isFinite(body.amount) || body.amount < 100) {
      throw new Error("amount (centavos) inválido (mínimo 100)");
    }
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
    const amount = Math.round(body.amount);
    const title = body.description || `Bancred - ${body.stage}`;

    const payload: Record<string, unknown> = {
      amount,
      customer,
      item: {
        title,
        price: amount,
        quantity: 1,
      },
      paymentMethod: "PIX",
      description: title,
    };
    const utm = trackingToUtm(body.tracking);
    if (utm) payload.utm = utm;

    // Retry com backoff exponencial em 5xx/network
    let lastErr: unknown = null;
    let lastStatus = 0;
    let lastData: any = null;
    const delays = [0, 1000, 2000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
      try {
        const resp = await fetch(DUTTYFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        lastStatus = resp.status;
        const data = await resp.json().catch(() => ({}));
        lastData = data;

        if (resp.ok && data?.pixCode && data?.transactionId) {
          return new Response(
            JSON.stringify({
              transaction_id: data.transactionId,
              reference: data.transactionId,
              qr_code: data.pixCode,
              amount: amount / 100,
              expires_at: undefined,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // 4xx -> não retry
        if (resp.status >= 400 && resp.status < 500) break;
      } catch (e) {
        lastErr = e;
      }
    }

    console.error("Duttyfy create error", lastStatus, lastData, lastErr);
    return new Response(
      JSON.stringify({ error: lastData?.message || lastData?.error || "Falha ao criar PIX", details: lastData }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("duttyfy-create-pix:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
