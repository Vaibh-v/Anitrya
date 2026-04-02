import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    query_rows: 0,
    page_rows: 0,
    findings: [],
    readiness: "missing_data",
  });
}