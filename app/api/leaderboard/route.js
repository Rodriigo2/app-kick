import { fetchKickLeaderboard } from "@/lib/kickResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const slug      = searchParams.get("slug");

  if (!channelId && !slug) {
    return Response.json({ error: "channelId o slug requerido" }, { status: 400 });
  }

  try {
    const data = await fetchKickLeaderboard(channelId, slug);
    if (!data) return Response.json({ error: "No se pudo obtener el leaderboard" }, { status: 502 });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
