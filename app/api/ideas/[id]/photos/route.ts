import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import prisma from '@/lib/prisma';

// Force Node.js runtime for file upload support
export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 4_500_000; // 4.5MB

// GET /api/ideas/[id]/photos - Fetch all photos for an idea
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const photos = await prisma.eventPhoto.findMany({
      where: { ideaId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

// POST /api/ideas/[id]/photos - Upload a photo for an idea
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Verify idea exists
    const idea = await prisma.tripIdea.findUnique({
      where: { id },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1_000_000}MB` },
        { status: 400 }
      );
    }

    // Determine next sortOrder
    const maxSortOrder = await prisma.eventPhoto.aggregate({
      where: { ideaId: id },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Upload to Vercel Blob
    const pathname = `event-photos/${id}/${file.name}`;

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    });

    // Create EventPhoto record
    const photo = await prisma.eventPhoto.create({
      data: {
        ideaId: id,
        url: blob.url,
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
