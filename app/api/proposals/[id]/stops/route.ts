import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/proposals/[id]/stops
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stops = await prisma.proposalStop.findMany({
    where: { proposalId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(stops);
}

// POST /api/proposals/[id]/stops — add a stop to a proposal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;
  const body = await req.json();
  const { placeName, nightsCount, notes } = body;

  if (!placeName) {
    return NextResponse.json({ error: "placeName required" }, { status: 400 });
  }

  const count = await prisma.proposalStop.count({ where: { proposalId } });

  const stop = await prisma.proposalStop.create({
    data: {
      proposalId,
      placeName,
      nightsCount: nightsCount ?? null,
      notes: notes ?? null,
      sortOrder: count,
    },
  });

  return NextResponse.json(stop, { status: 201 });
}
