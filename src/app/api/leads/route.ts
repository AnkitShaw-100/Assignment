import type { NextRequest } from "next/server";
import { createLeadSchema, listLeadsQuerySchema } from "@/lib/leads/validation";
import { handle, parseBody, parseWith } from "@/lib/server/errors";
import { createLead, listLeads } from "@/lib/server/leads-service";

/** GET /api/leads?status=NEW&q=acme — leads with their latest discussion. */
export const GET = handle(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const filters = parseWith(listLeadsQuerySchema, {
    status: params.get("status") || undefined,
    q: params.get("q") || undefined,
  });
  const leads = await listLeads(filters);
  return Response.json({ data: leads });
});

/** POST /api/leads — create a lead. */
export const POST = handle(async (request: NextRequest) => {
  const input = await parseBody(request, createLeadSchema);
  const lead = await createLead(input);
  return Response.json({ data: lead }, { status: 201 });
});
