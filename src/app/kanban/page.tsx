"use client";

import { useState } from "react";
import { KanbanSquare, FileText, GripVertical } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";
import TaskModal from "@/components/TaskModal";

// ドラッグ可能なタスクコンポーネント
function SortableTask({ task, onClick, isOverlay = false }: { task: Task, onClick?: () => void, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // 元の場所は薄くする
  };

  const overlayStyle = {
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    transform: 'scale(1.05) rotate(2deg)',
    cursor: 'grabbing',
    opacity: 1,
    zIndex: 9999,
  };

  return (
    <div 
      ref={setNodeRef} 
      onClick={!isDragging ? onClick : undefined}
      className="glass-card"
      style={{ 
        ...(isOverlay ? overlayStyle : style),
        padding: '1rem', 
        marginBottom: '0.5rem', 
        borderLeft: task.status === 'in_progress' ? '4px solid var(--accent-blue)' : (task.status === 'done' ? '4px solid var(--success)' : '1px solid var(--border-glass)'),
        cursor: isOverlay ? 'grabbing' : 'grab',
        touchAction: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: isOverlay ? 'var(--bg-glass-hover)' : 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '2px', color: 'var(--text-muted)' }}>
          <GripVertical size={16} />
        </div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: task.status === 'done' ? 'line-through' : 'none', flex: 1 }}>{task.title}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1.5rem' }}>
        {task.categories ? (
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: `${task.categories.color}20`, color: task.categories.color, borderRadius: 'var(--radius-full)' }}>
            {task.categories.name}
          </span>
        ) : <span></span>}
        {task.notes && <FileText size={12} color="var(--text-muted)" />}
      </div>
    </div>
  );
}

// ドロップ可能なカラムコンポーネント
function DroppableColumn({ id, title, tasks, onTaskClick }: { id: string, title: string, tasks: Task[], onTaskClick: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${id}` });

  return (
    <div 
      ref={setNodeRef}
      style={{ 
        flex: '0 0 300px', 
        scrollSnapAlign: 'start', 
        background: isOver ? 'rgba(255, 255, 255, 0.1)' : 'var(--bg-glass)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        height: 'calc(100vh - 200px)', 
        overflowY: 'auto',
        transition: 'background 0.2s ease',
        border: isOver ? '2px dashed var(--accent-blue)' : '2px solid transparent'
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'transparent', zIndex: 10, paddingBottom: '0.5rem' }}>{title} ({tasks.length})</h3>
      <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, minHeight: '100px' }}>
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
          {tasks.length === 0 && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
              ここにドロップ
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Kanban() {
  const { tasks, fetchTasks, loading } = useTasks();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    let overStatus = '';
    const overId = String(over.id);

    if (overId.startsWith('column-')) {
      overStatus = overId.replace('column-', '');
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) overStatus = overTask.status;
    }
    
    if (['todo', 'in_progress', 'done'].includes(overStatus)) {
      const task = tasks.find(t => t.id === activeId);
      if (task && task.status !== overStatus) {
        // Optimistic UI update could be done here, but for simplicity we rely on real-time DB fetch
        await supabase.from('tasks').update({ 
          status: overStatus, 
          is_completed: overStatus === 'done' 
        }).eq('id', activeId);
        fetchTasks();
      }
    }
  }

  const openTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>※スマホは左端の「三」のようなグリップ部分を0.2秒長押しして移動</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', flex: 1, paddingBottom: '1rem', scrollSnapType: 'x mandatory' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id && !t.parent_id); // parent tasks only for now, or all tasks?
            return <DroppableColumn key={col.id} id={col.id} title={col.title} tasks={columnTasks} onTaskClick={openTaskModal} />;
          })}
          
          <DragOverlay>
            {activeTask ? <SortableTask task={activeTask} isOverlay={true} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        task={editingTask} 
        categories={[]} 
        onSave={() => fetchTasks()} 
      />
    </div>
  );
}
