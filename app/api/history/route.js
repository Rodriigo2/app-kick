import { fetchKickHistoryBatch } from "@/lib/kickResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_PAGES = 10; // pages per round-trip to Puppeteer

export async function GET(request) {
  const url = new URL(request.url);
  const chatroomId = url.searchParams.get("chatroomId");
  const cursor     = url.searchParams.get("cursor") || null;

  if (!chatroomId || !/^\d+$/.test(chatroomId)) {
    return Response.json({ error: "chatroomId inválido" }, { status: 400 });
  }

  try {
    const data = await fetchKickHistoryBatch(chatroomId, cursor, BATCH_PAGES);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err?.message || "Error consultando historial" },
      { status: 502 }
    );
  }
}
