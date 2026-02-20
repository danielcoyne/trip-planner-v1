import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/proposals?tripId=xxx  — list all proposals for a trip
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "tripId required" }, { status: 400 });
  }

  const proposals = await prisma.tripProposal.findMany({
    where: { tripId },
    include: {
      stops: { orderBy: { sortOrder: "asc" } },
      ideas: {
        include: { photos: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(proposals);
}

// POST /api/proposals  — create a new proposal
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tripId, title, description } = body;

  if (!tripId || !title) {
    return NextResponse.json({ error: "tripId and title required" }, { status: 400 });
  }

  // Put new proposal at the end
  const count = await prisma.tripProposal.count({ where: { tripId } });

  const proposal = await prisma.tripProposal.create({
    data: {
      tripId,
      title,
      description: description ?? null,
      sortOrder: count,
    },
    include: {
      stops: true,
      ideas: true,
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
