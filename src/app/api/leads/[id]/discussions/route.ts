import type { NextRequest } from "next/server";
import { createDiscussionSchema } from "@/lib/leads/validation";
import { handle, parseBody } from "@/lib/server/errors";
import { addDiscussion, listDiscussions } from "@/lib/server/leads-service";
import { leadIdFrom } from "@/lib/server/route-params";
type Ctx = RouteContext<"/api/leads/[id]/discussions">;


/** GET /api/leads/:id/discussions — discussion history, newest first. */
export const GET = handle(async (_request: NextRequest, ctx: Ctx) => {
  const discussions = await listDiscussions(await leadIdFrom(ctx));
  return Response.json({ data: discussions });
});

/** POST /api/leads/:id/discussions — log a discussion, optionally scheduling a follow-up. */
export const POST = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await leadIdFrom(ctx);
  const input = await parseBody(request, createDiscussionSchema);
  const discussion = await addDiscussion(id, input);
  return Response.json({ data: discussion }, { status: 201 });
});
