import { resolveKickChannel } from "@/lib/kickResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request, { params }) {
  const { slug } = params;
  if (!slug || typeof slug !== "string") {
    return Response.json({ error: "Invalid channel slug" }, { status: 400 });
  }

  // Always bypass cache so stream title/category/viewers are fresh on each connect.
  const { searchParams } = new URL(_request.url);
  if (searchParams.get("fresh") === "1") {
    const G = globalThis;
    if (G.__kickCache) G.__kickCache.delete(slug.trim().toLowerCase());
  }

  try {
    const info = await resolveKickChannel(slug);
    return Response.json(info);
  } catch (err) {
    return Response.json(
      { error: err?.message || "No se pudo resolver el canal" },
      { status: 502 }
    );
  }
}
