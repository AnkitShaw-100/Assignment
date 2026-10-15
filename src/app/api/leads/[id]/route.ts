import type { NextRequest } from "next/server";
import { updateLeadSchema } from "@/lib/leads/validation";
import { handle, parseBody } from "@/lib/server/errors";
import { getLead, updateLead } from "@/lib/server/leads-service";
import { leadIdFrom } from "@/lib/server/route-params";

/** GET /api/leads/:id — lead with full discussion history (newest first). */
export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) => {
  const lead = await getLead(await leadIdFrom(ctx));
  return Response.json({ data: lead });
});

/** PATCH /api/leads/:id — update status, contact details or the current follow-up. */
export const PATCH = handle(async (request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) => {
  const id = await leadIdFrom(ctx);
  const input = await parseBody(request, updateLeadSchema);
  const lead = await updateLead(id, input);
  return Response.json({ data: lead });
});
