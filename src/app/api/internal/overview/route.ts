import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ga4_source_rows: 0,
    ga4_landing_rows: 0,
    gsc_query_rows: 0,
    gsc_page_rows: 0,
    note: "Hook this to Sheets next",
  });
}