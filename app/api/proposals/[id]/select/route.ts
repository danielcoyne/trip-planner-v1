import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/proposals/[id]/select
// Marks one proposal as selected, unselects all others, transitions trip to PLANNING
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const proposal = await prisma.tripProposal.findUnique({
    where: { id },
    select: { tripId: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Deselect all other proposals for this trip, select this one, transition trip to PLANNING
  await prisma.$transaction([
    prisma.tripProposal.updateMany({
      where: { tripId: proposal.tripId },
      data: { selected: false },
    }),
    prisma.tripProposal.update({
      where: { id },
      data: { selected: true },
    }),
    prisma.trip.update({
      where: { id: proposal.tripId },
      data: { status: "PLANNING" },
    }),
  ]);

  const updated = await prisma.tripProposal.findUnique({
    where: { id },
    include: {
      stops: { orderBy: { sortOrder: "asc" } },
      ideas: { include: { photos: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
