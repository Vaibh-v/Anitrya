import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    landing_rows: 0,
    source_rows: 0,
    findings: [],
    readiness: "missing_data",
  });
}