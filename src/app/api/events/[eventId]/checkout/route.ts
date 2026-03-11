import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Paid ticketing is not currently available. Please contact us for Enterprise plans with payment processing." },
    { status: 501 }
  );
}
