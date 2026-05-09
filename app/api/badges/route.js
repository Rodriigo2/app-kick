import { fetchGlobalBadges } from "@/lib/kickResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const chatroomId = searchParams.get("chatroomId");
  if (!chatroomId) return Response.json({ error: "chatroomId requerido" }, { status: 400 });

  try {
    const badges = await fetchGlobalBadges(Number(chatroomId));
    return Response.json({ badges: badges ?? {} });
  } catch (err) {
    return Response.json({ badges: {} });
  }
}
