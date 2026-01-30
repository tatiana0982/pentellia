export const runtime = "edge";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: Request) {
  const { scanData, toolName } = await req.json();

  const prompt = `You are a Senior Security Analyst. Summarize this ${toolName} scan. Use markdown. \n\n Data: ${JSON.stringify(scanData)}`;

  const dsRes = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.2,
    }),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const reader = dsRes.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleaned = line.replace(/^data: /, "").trim();
          if (cleaned === "" || cleaned === "[DONE]") continue;

          try {
            const json = JSON.parse(cleaned);
            const content = json.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch (e) {
            // Partial JSON in buffer, skip until line is complete
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream);
}
