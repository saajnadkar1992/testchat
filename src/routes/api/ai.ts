import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const payload = body as {
          messages?: unknown;
          model?: string;
          max_tokens?: number;
        };
        if (!Array.isArray(payload.messages)) {
          return new Response(JSON.stringify({ error: "messages[] required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          body: JSON.stringify({
            model: payload.model ?? "google/gemini-3-flash-preview",
            messages: payload.messages,
            max_tokens: payload.max_tokens ?? 600,
          }),
        });
        const text = await upstream.text();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const ra = upstream.headers.get("retry-after");
        if (ra) headers["Retry-After"] = ra;
        return new Response(text, { status: upstream.status, headers });
      },
    },
  },
});
