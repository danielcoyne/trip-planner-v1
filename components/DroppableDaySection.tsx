'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableDaySectionProps {
  dayNumber: number | null;
  children: React.ReactNode;
}

export default function DroppableDaySection({ dayNumber, children }: DroppableDaySectionProps) {
  const droppableId = dayNumber !== null ? `day-${dayNumber}` : 'day-unassigned';

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] rounded-lg transition-colors ${
        isOver ? 'border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {children}
    </div>
  );
}
