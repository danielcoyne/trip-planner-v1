import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/comments/[id]?type=trip|idea
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type");

  if (type === "trip") {
    await prisma.tripComment.delete({ where: { id } });
  } else {
    await prisma.ideaComment.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
