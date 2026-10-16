import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, agent, history = [] } = body as {
    message: string;
    agent: {
      name: string;
      tone: string;
      businessName: string;
      availability: string;
      phone: string;
      email: string;
    };
    history: { from: string; text: string }[];
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é ${agent.name}, assistente virtual de ${agent.businessName}.
Tom: ${agent.tone}.
Disponibilidade: ${agent.availability}. Contato: ${agent.phone} / ${agent.email}.
Você agenda visitas, confirma alterações de orçamento, responde dúvidas de clientes e registra pedidos.
Responda em português do Brasil, curto e claro. Quando agendar, confirme data/hora e diga que a equipe receberá o aviso.`,
          },
          ...history.slice(-8).map((h) => ({
            role: (h.from === "client" ? "user" : "assistant") as "user" | "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ],
      });
      const text =
        completion.choices[0]?.message?.content ||
        "Posso ajudar com agendamento ou dúvidas do orçamento.";
      return NextResponse.json({ reply: text, source: "openai" });
    } catch (err) {
      console.error(err);
    }
  }

  // Heuristic demo agent
  const lower = message.toLowerCase();
  let reply = `Olá! Sou ${agent.name}, da ${agent.businessName}. Como posso ajudar com seu projeto?`;
  if (/(sexta|sábado|sabado|segunda|terça|terca|quarta|quinta|domingo|amanhã|amanha)/.test(lower)) {
    reply = `Perfeito — anotei o pedido de visita. Nossa disponibilidade é ${agent.availability}. Confirmei o interesse e avisei a equipe. Se quiser outro horário, é só falar.`;
  } else if (/orçamento|orcamento|preço|preco|valor/.test(lower)) {
    reply = `Posso reenviar o orçamento por e-mail ou PDF. Quer que eu peça um ajuste de algum item?`;
  } else if (/cancel|remarcar|adiar|alterar/.test(lower)) {
    reply = `Sem problema. Me diga a nova data/hora preferida que eu atualizo o agendamento e notifico a equipe.`;
  } else if (/pagar|pagamento|boleto|cartão|cartao|pix/.test(lower)) {
    reply = `O link de pagamento (Stripe/Square) está no orçamento. Se preferir PIX ou fatura, posso solicitar à equipe agora.`;
  }

  return NextResponse.json({ reply, source: "demo" });
}
