import { PrismaClient } from '@prisma/client';
import { fromYMD } from '../lib/dateOnly';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Find an existing trip to add segments to, or create a new one
  const existingTrip = await prisma.trip.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (existingTrip) {
    console.log(`Found existing trip: ${existingTrip.name} (${existingTrip.id})`);

    // Check if segments already exist
    const existingSegments = await prisma.tripSegment.count({
      where: { tripId: existingTrip.id },
    });

    if (existingSegments > 0) {
      console.log(`⚠️  Trip already has ${existingSegments} segment(s). Skipping seed.`);
      console.log('To re-seed, delete existing segments first.');
      return;
    }

    // Create sample segments for the existing trip
    // Example: Multi-segment trip
    const tripStart = new Date(existingTrip.startDate);
    const tripEnd = new Date(existingTrip.endDate);

    // Calculate midpoint for splitting into segments
    const tripDays =
      Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (tripDays >= 4) {
      // Create 2 segments
      const midPoint = Math.floor(tripDays / 2);
      const segment1End = new Date(tripStart);
      segment1End.setDate(segment1End.getDate() + midPoint - 1);

      const segment2Start = new Date(segment1End);
      segment2Start.setDate(segment2Start.getDate() + 1);

      await prisma.tripSegment.createMany({
        data: [
          {
            tripId: existingTrip.id,
            startDate: tripStart,
            endDate: segment1End,
            placeName: 'Rome',
            lat: 41.9028,
            lng: 12.4964,
            timezone: 'Europe/Rome',
          },
          {
            tripId: existingTrip.id,
            startDate: segment2Start,
            endDate: tripEnd,
            placeName: 'Lake Como',
            lat: 45.9931,
            lng: 9.2661,
            timezone: 'Europe/Rome',
          },
        ],
      });

      console.log('✅ Created 2 segments: Rome and Lake Como');
    } else {
      // Trip is too short for multiple segments, create single segment
      await prisma.tripSegment.create({
        data: {
          tripId: existingTrip.id,
          startDate: tripStart,
          endDate: tripEnd,
          placeName: 'Paris',
          lat: 48.8566,
          lng: 2.3522,
          timezone: 'Europe/Paris',
        },
      });

      console.log('✅ Created 1 segment: Paris');
    }
  } else {
    console.log('No existing trips found. Creating a sample trip with segments...');

    const sampleTrip = await prisma.trip.create({
      data: {
        name: 'Italian Adventure',
        destination: 'Italy',
        startDate: fromYMD('2026-06-01'),
        endDate: fromYMD('2026-06-10'),
        requirements:
          'A wonderful trip exploring Rome and Lake Como with a mix of history, culture, and natural beauty.',
        status: 'DRAFT',
        currentRound: 1,
        segments: {
          create: [
            {
              startDate: fromYMD('2026-06-01'),
              endDate: fromYMD('2026-06-05'),
              placeName: 'Rome',
              lat: 41.9028,
              lng: 12.4964,
              timezone: 'Europe/Rome',
              notes: 'Ancient history and incredible food',
            },
            {
              startDate: fromYMD('2026-06-06'),
              endDate: fromYMD('2026-06-10'),
              placeName: 'Lake Como',
              lat: 45.9931,
              lng: 9.2661,
              timezone: 'Europe/Rome',
              notes: 'Relaxing by the lake with stunning mountain views',
            },
          ],
        },
      },
    });

    console.log(`✅ Created sample trip: ${sampleTrip.name} (${sampleTrip.id})`);
    console.log('✅ Created 2 segments: Rome (Days 1-5) and Lake Como (Days 6-10)');
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
