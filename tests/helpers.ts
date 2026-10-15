import { NextRequest } from "next/server";
import { prisma } from "@/lib/server/db";

export const BASE = "http://localhost:3000";

export function jsonRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export async function resetDb() {
  await prisma.discussion.deleteMany();
  await prisma.lead.deleteMany();
}

export { prisma };
