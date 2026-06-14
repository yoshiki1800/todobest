"use client";

import { useState } from "react";
import { KanbanSquare } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { supabase } from "@/lib/supabase";
import TaskModal from "@/components/TaskModal";

export default function Kanban() {
  const { tasks, fetchTasks, loading } = useTasks();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Simple column drop logic: id format is "column-todo" or "task-123"
    // Since we are moving between statuses, we need to update the status in DB.
    // Full dnd-kit implementation requires deeper state management, but for simplicity:
    const overStatus = String(over.data.current?.sortable?.containerId || over.id).replace('column-', '');
    
    if (['todo', 'in_progress', 'done'].includes(overStatus)) {
      const task = tasks.find(t => t.id === activeId);
      if (task && task.status !== overStatus) {
        await supabase.from('tasks').update({ 
          status: overStatus, 
          is_completed: overStatus === 'done' 
        }).eq('id', activeId);
        fetchTasks();
      }
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>;

  const columns = [
    { id: 'todo', title: '未着手 (ToDo)' },
    { id: 'in_progress', title: '進行中' },
    { id: 'done', title: '完了' }
  ];

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <KanbanSquare color="var(--accent-purple)" /> カンバンボード
        </h2>
      </header>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', flex: 1, paddingBottom: '1rem' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} id={`column-${col.id}`} style={{ flex: 1, minWidth: '300px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>{col.title} ({columnTasks.length})</h3>
                <SortableContext id={col.id} items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ flex: 1, minHeight: '100px' }}>
                    {columnTasks.map(task => (
                      <div key={task.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: '1px solid var(--border-glass)', cursor: 'grab' }}>
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        {task.categories && <div style={{ fontSize: '0.75rem', color: task.categories.color }}>{task.categories.name}</div>}
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </DndContext>
      </div>
      
      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        task={null} 
        categories={[]} 
        onSave={() => {}} 
      />
    </div>
  );
}
