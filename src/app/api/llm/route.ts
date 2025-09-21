import { NextRequest } from "next/server";

// IMPORTANT: prefer a SERVER-ONLY env (e.g., GEMINI_API_KEY) instead of NEXT_PUBLIC_API_KEY.
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { prompt, image } = await req.json();

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500 });
    }

    // Lazy import on server so it never touches client bundles
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parts: any[] = [{ text: String(prompt || "") }];
    if (image?.data && image?.mimeType) {
      parts.push({
        inlineData: { data: image.data, mimeType: image.mimeType },
      });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const text = await result.response.text();

    return new Response(JSON.stringify({ text }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "LLM error" }), { status: 500 });
  }
}
