import type { NextRequest } from "next/server";
import { statsQuerySchema } from "@/lib/leads/validation";
import { handle, parseWith } from "@/lib/server/errors";
import { getLeadStats } from "@/lib/server/leads-service";

/**
 * GET /api/stats?dayStart=ISO&dayEnd=ISO — dashboard metrics.
 * The client passes its own local-day boundaries so "due today" respects the
 * viewer's timezone.
 */
export const GET = handle(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const { dayStart, dayEnd } = parseWith(statsQuerySchema, {
    dayStart: params.get("dayStart"),
    dayEnd: params.get("dayEnd"),
  });
  const stats = await getLeadStats(dayStart, dayEnd);
  return Response.json({ data: stats });
});
