'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableIdeaCardProps {
  id: string;
  children: React.ReactNode;
}

export default function DraggableIdeaCard({ id, children }: DraggableIdeaCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch gap-0 ${isDragging ? 'opacity-50 ring-2 ring-blue-400 rounded-lg shadow-lg' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="w-6 flex-shrink-0 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
