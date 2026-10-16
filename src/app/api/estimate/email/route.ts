import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, clientName, projectAddress, total, estimateId } = body as {
    to: string;
    clientName: string;
    projectAddress: string;
    total: string;
    estimateId: string;
  };

  if (!to) {
    return NextResponse.json({ error: "e-mail obrigatório" }, { status: 400 });
  }

  // Resend / SMTP can be wired via env; MVP logs and returns success payload
  const payload = {
    to,
    subject: `Orçamento ObraCam — ${projectAddress}`,
    preview: `Olá ${clientName}, seu orçamento ${estimateId} no valor de ${total} está pronto.`,
    sentAt: new Date().toISOString(),
    provider: process.env.RESEND_API_KEY ? "resend" : "demo",
  };

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ObraCam <onboarding@resend.dev>",
          to: [to],
          subject: payload.subject,
          html: `<p>Olá ${clientName},</p>
            <p>Seu orçamento para <strong>${projectAddress}</strong> está pronto.</p>
            <p>Total: <strong>${total}</strong></p>
            <p>ID: ${estimateId}</p>
            <p>— Equipe ObraCam</p>`,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return NextResponse.json({ ok: true, ...payload });
}
