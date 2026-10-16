# ObraCam

SaaS de documentação de obras e orçamento por áudio — MVP inspirado em fluxos de campo (estilo CompanyCam), com foco em GPS, fotos anotadas, chat da equipe e estimate por voz.

## O que já funciona

- Lista de obras **ordenada por proximidade GPS**
- **Novo projeto** com endereços próximos (Nominatim) + nome/telefone/e-mail do cliente
- Upload de **fotos e vídeos**, com **marcações e anotações** por foto
- **Chat interno** entre equipe e subcontratados
- **Criar orçamento por áudio** → itens, valores, notas, PDF, e-mail, follow-up
- Pagamento **Stripe** (ou demo) e **Square** (demo) + conversão para **invoice**
- **Agente por usuário** que conversa com o cliente (agendamentos / alterações)

## Rodar local

```bash
npm install
cp .env.example .env.local   # opcional — funciona em modo demo sem chaves
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Sem `OPENAI_API_KEY`, use **“Usar áudio de demonstração”** na tela de orçamento.

## Stack

Next.js 15 · React 19 · Tailwind · jsPDF · OpenAI · Stripe · Nominatim
