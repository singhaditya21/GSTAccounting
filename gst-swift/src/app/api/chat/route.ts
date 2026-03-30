import OpenAI from 'openai';

// Force dynamic execution for database and API calls
export const dynamic = 'force-dynamic';

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: "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",
});

export async function POST(req: Request) {
  try {
    const { messages, orgId } = await req.json();

    // Context Injection Block: Fetch last 20 ledgers
    const { db } = await import("@/lib/db");
    const ledgers = await db.ledgerEntry.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    const serializedLedgers = JSON.stringify(ledgers.map(l => ({ dt: l.createdAt, acc: l.account, type: l.type, amt: l.amount })));

    const systemMessage = {
      role: "system",
      content: `You are GSTSwift AI, an expert agent handling Indian GST, accounting, and compliance built on NVIDIA GLM 4.7.
      You assist businesses with calculating HSN/SAC, understanding Place of Supply (PoS) for IGST vs CGST, and reconciling ledgers.
      Do not hallucinate. Provide crisp, professional accounting answers. 
      CRITICAL: You have explicit access to the user's live ledger entries. Use them to answer questions exactly. Here is the Live Data context representing double-entry accounting: ${serializedLedgers}`
    };

    // Make the streaming request directly to the NVIDIA integration using the user's explicit parameters
    const completion = await client.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      top_p: 1,
      max_tokens: 1024,
      stream: true,
    } as any);

    // Convert the OpenAI stream into a Vercel AI SDK compatible stream
    // to utilize format: '0:"hello"'
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            const reasoning = delta.reasoning_content;
            const content = delta.content;

            // Stream reasoning chunks (formatted differently if needed, but for chat UI we can just pipe it)
            if (reasoning) {
              // Vercel AI useChat accepts data stream chunks if prefixed with '0:'
              controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify("🤔 " + reasoning)}\n`));
            }
            if (content) {
              controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(content)}\n`));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
