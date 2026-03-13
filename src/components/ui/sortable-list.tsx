"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────

export interface SortableItem {
  id: string;
}

export interface SortableListProps<T extends SortableItem> {
  /** Items to render in the sortable list */
  items: T[];
  /** Called with the new item order after a drag completes */
  onReorder: (items: T[]) => void;
  /** Render function for each item. Receives the item and a drag handle element. */
  renderItem: (item: T, dragHandle: React.ReactNode) => React.ReactNode;
  /** Optional render function for the drag overlay (the floating copy while dragging) */
  renderOverlay?: (item: T) => React.ReactNode;
  /** Additional className for the list container */
  className?: string;
  /** Additional className for each sortable item wrapper */
  itemClassName?: string;
  /** Whether the list is disabled (no drag allowed) */
  disabled?: boolean;
  /** Layout direction. Currently only vertical is supported. */
  direction?: "vertical";
  /** Grid layout classes (e.g. for a multi-column grid). If provided, wraps items in a grid container. */
  gridClassName?: string;
}

// ── Drag Handle ────────────────────────────────────────────────────

interface DragHandleProps {
  listeners: Record<string, Function> | undefined;
  attributes: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
}

function DragHandle({ listeners, attributes, className }: DragHandleProps) {
  return (
    <button
      type="button"
      className={cn(
        "touch-none cursor-grab active:cursor-grabbing",
        "inline-flex items-center justify-center",
        "w-8 h-8 rounded-lg",
        "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "shrink-0",
        className
      )}
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

// ── Sortable Item Wrapper ──────────────────────────────────────────

interface SortableItemWrapperProps<T extends SortableItem> {
  item: T;
  renderItem: SortableListProps<T>["renderItem"];
  itemClassName?: string;
  disabled?: boolean;
}

function SortableItemWrapper<T extends SortableItem>({
  item,
  renderItem,
  itemClassName,
  disabled,
}: SortableItemWrapperProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <DragHandle listeners={listeners} attributes={attributes} />
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "z-50 opacity-50",
        itemClassName
      )}
    >
      {renderItem(item, dragHandle)}
    </div>
  );
}

// ── Main SortableList Component ────────────────────────────────────

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  renderOverlay,
  className,
  itemClassName,
  disabled = false,
  gridClassName,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [items, activeId]
  );

  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(reordered);
    },
    [items, onReorder]
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveId(null);
  }, []);

  // Placeholder drag handle for overlay (non-functional, visual only)
  const overlayDragHandle = (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "w-8 h-8 rounded-lg",
        "text-muted-foreground",
        "shrink-0"
      )}
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={cn(gridClassName || "space-y-2", className)}>
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SortableItemWrapper
                  item={item}
                  renderItem={renderItem}
                  itemClassName={itemClassName}
                  disabled={disabled}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeItem ? (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.03, boxShadow: "0 12px 28px rgba(0,0,0,0.15)" }}
            className="rounded-xl"
          >
            {renderOverlay
              ? renderOverlay(activeItem)
              : renderItem(activeItem, overlayDragHandle)}
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
