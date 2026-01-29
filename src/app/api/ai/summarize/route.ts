<<<<<<< HEAD
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
=======
import { NextRequest, NextResponse } from "next/server";

// Ensure this matches the key in your .env.local file
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

// Updated URL to match your working curl command (removed '/v1')
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { scanData, toolName } = await req.json();

    // Debugging: Log the last 4 chars of the key being used to verify it's the correct one
    console.log("Using API Key ending in:", DEEPSEEK_API_KEY.slice(-4));

    if (!DEEPSEEK_API_KEY) {
      throw new Error("Missing DEEPSEEK_API_KEY in environment variables");
    }

    const jsonString = JSON.stringify(scanData).slice(0, 15000);

    const prompt = `
      You are a Senior Security Analyst. Summarize this ${toolName} scan result.
      Format: Markdown. Sections: Executive Summary, Critical Findings, Business Impact, Remediation.
      Raw Data: ${jsonString}
    `;

    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.3,
        stream: false, // Explicitly set stream to false as per your curl
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`DeepSeek API Failed (${res.status}): ${errText}`);

      // Fallback for UI
      return NextResponse.json({
        success: true,
        summary: generateMockSummary(
          toolName,
          `(Note: API returned ${res.status})`
        ),
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      summary: content,
    });
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({
      success: true,
      summary: generateMockSummary("Unknown"),
    });
  }
}

// ... keep your generateMockSummary function as is ...
function generateMockSummary(tool: string, note: string = "") {
  return `### ⚠️ AI Simulation Mode ${note}
  
### 1. Executive Overview
**${tool}** scan completed successfully. The simulation indicates the target is reachable. Several standard configuration files were detected, but no critical vulnerabilities were explicitly confirmed in this simulation mode.

### 2. Critical Findings
* **Open Ports/Services**: Standard web ports (80, 443) are open.
* **Information Disclosure**: Potential version disclosure in headers.
* **Misconfiguration**: Default error pages might be visible.

### 3. Business Impact
If these simulated findings were real, an attacker could potentially map the network topology or exploit unpatched services to gain unauthorized access.

### 4. Remediation Steps
1.  **Hardening**: Disable unused ports and services.
2.  **Patching**: Ensure the target software is updated to the latest version.
3.  **Review**: Manually inspect the "Raw Output" tab for specific details.
`;
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
}
