import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amountCents, currency = "brl", description, estimateId, successUrl, cancelUrl } =
    body as {
      amountCents: number;
      currency?: string;
      description: string;
      estimateId: string;
      successUrl: string;
      cancelUrl: string;
    };

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({
      provider: "demo",
      url: `${successUrl}?demo=1&estimateId=${estimateId}&provider=stripe`,
      message: "Stripe não configurado — usando pagamento demonstração.",
    });
  }

  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: description },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { estimateId },
  });

  return NextResponse.json({ provider: "stripe", url: session.url });
}
