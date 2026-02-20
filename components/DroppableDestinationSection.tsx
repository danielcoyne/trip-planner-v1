'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableDestinationSectionProps {
  destination: string | null;
  children: React.ReactNode;
}

export default function DroppableDestinationSection({ destination, children }: DroppableDestinationSectionProps) {
  const droppableId = destination !== null ? `dest-${destination}` : 'dest-unassigned';

  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

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
