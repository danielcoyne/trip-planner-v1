import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/proposals/[id]  — update title, description, sortOrder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, sortOrder } = body;

  const proposal = await prisma.tripProposal.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
    include: {
      stops: { orderBy: { sortOrder: "asc" } },
      ideas: { include: { photos: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(proposal);
}

// DELETE /api/proposals/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tripProposal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
