export const runtime = "edge";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: Request) {
  const { scanData, toolName } = await req.json();

  // Enhanced System Prompt for Enterprise Clarity
  const prompt = `
    You are a Senior Security Analyst presenting to a Corporate Board. 
    Summarize this ${toolName} scan data for both technical staff and non-technical executives.
    
    Structure your report as follows:
    1. **Executive Summary**: A high-level overview in plain English. What is the "bottom line"?
    2. **Risk Level**: Assign a clear color-coded risk (Critical, High, Medium, Low).
    3. **Business Impact**: Explain in simple terms what happens if these issues aren't fixed (e.g., "Customer data could be stolen").
    4. **Top 3 Findings**: Bullet points of the most important issues.
    5. **Next Steps**: Clear, jargon-free instructions on what to do next.

    Avoid heavy jargon where possible. If you use a technical term, explain it briefly.
    
    Data to analyze: ${JSON.stringify(scanData)}
  `;

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
      temperature: 0.3, // Slightly higher for better prose
    }),
  });

  // ... (Rest of your streaming logic remains the same)
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
            // Wait for next chunk
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream);
}