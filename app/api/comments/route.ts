import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/comments?tripId=xxx        — trip-level comments
// GET /api/comments?ideaId=xxx        — comments on a specific idea
// GET /api/comments?proposalId=xxx    — comments on a specific proposal
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");
  const ideaId = req.nextUrl.searchParams.get("ideaId");
  const proposalId = req.nextUrl.searchParams.get("proposalId");

  if (tripId) {
    const comments = await prisma.tripComment.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  }

  if (ideaId || proposalId) {
    const comments = await prisma.ideaComment.findMany({
      where: {
        ...(ideaId ? { ideaId } : {}),
        ...(proposalId ? { proposalId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  }

  return NextResponse.json({ error: "tripId, ideaId, or proposalId required" }, { status: 400 });
}

// POST /api/comments
// Body: { tripId, author, text }            — trip-level comment
//       { ideaId, author, text }            — idea comment
//       { proposalId, author, text }        — proposal comment
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tripId, ideaId, proposalId, author, text } = body;

  if (!author || !text) {
    return NextResponse.json({ error: "author and text required" }, { status: 400 });
  }

  if (tripId) {
    const comment = await prisma.tripComment.create({
      data: { tripId, author, text },
    });
    return NextResponse.json(comment, { status: 201 });
  }

  if (ideaId || proposalId) {
    const comment = await prisma.ideaComment.create({
      data: {
        ideaId: ideaId ?? null,
        proposalId: proposalId ?? null,
        author,
        text,
      },
    });
    return NextResponse.json(comment, { status: 201 });
  }

  return NextResponse.json({ error: "tripId, ideaId, or proposalId required" }, { status: 400 });
}
