import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

// Force Node.js runtime for file upload support
export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 4_500_000; // 4.5MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    // TODO: Add authentication and trip ownership validation when auth is implemented
    // Example: await requireAuth(request); await ensureTripOwner(tripId, currentUser);

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
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

    // Determine file extension from MIME type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    };
    const ext = extensionMap[file.type];

    // Upload to Vercel Blob with a stable path
    const pathname = `trips/${tripId}/cover.${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    });

    // Update trip with new cover image URL
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        coverImageUrl: blob.url,
        coverImageUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    return NextResponse.json({ error: 'Failed to upload cover image' }, { status: 500 });
  }
}
