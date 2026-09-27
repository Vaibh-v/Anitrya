import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/email/weekly-digest";

export const maxDuration = 300;

/** Vercel Cron (Mondays). Protected by CRON_SECRET, which Vercel sends as a bearer token. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await sendWeeklyDigests()) });
}
