import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/proposals/[id]/stops/[stopId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;
  const body = await req.json();
  const { placeName, nightsCount, notes, sortOrder } = body;

  const stop = await prisma.proposalStop.update({
    where: { id: stopId },
    data: {
      ...(placeName !== undefined && { placeName }),
      ...(nightsCount !== undefined && { nightsCount }),
      ...(notes !== undefined && { notes }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(stop);
}

// DELETE /api/proposals/[id]/stops/[stopId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  const { stopId } = await params;
  await prisma.proposalStop.delete({ where: { id: stopId } });
  return NextResponse.json({ success: true });
}
