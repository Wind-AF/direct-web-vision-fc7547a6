// Edge function: consulta CPF na apicpf.com
// Mantém o token (X-API-KEY) em segredo no servidor.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("APICPF_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "APICPF_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCpf = String(body?.cpf ?? "").replace(/\D/g, "");

    if (rawCpf.length !== 11) {
      return new Response(
        JSON.stringify({ error: "CPF inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = `https://apicpf.com/api/consulta?cpf=${rawCpf}`;
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!upstream.ok) {
      console.error("apicpf.com erro", upstream.status, text);
      return new Response(
        JSON.stringify({
          error: "Falha ao consultar CPF",
          status: upstream.status,
          details: data,
        }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // A API pode envelopar em { code, data: {...} } ou retornar direto.
    const payload = data?.data ?? data;

    // Heurística para extrair os campos independentemente do nome da chave.
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = payload?.[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          return String(v);
        }
      }
      return "";
    };

    const nome = pick("nome", "name", "nome_completo", "fullName");
    const nascimento = pick("data_nascimento", "nascimento", "dataNascimento", "birthDate");
    const sexo = pick("sexo", "genero", "sex", "gender");
    const mae = pick("nome_mae", "mae", "nomeMae", "motherName");

    if (!nome) {
      return new Response(
        JSON.stringify({ error: "CPF não encontrado", details: payload }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cpf: rawCpf,
        nome,
        nascimento,
        sexo,
        mae,
        raw: payload,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("consulta-cpf erro inesperado", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
