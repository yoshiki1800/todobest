"use client";

import { useState } from "react";
import { KanbanSquare, FileText } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";
import TaskModal from "@/components/TaskModal";

// ドラッグ可能なタスクコンポーネント
function SortableTask({ task, onClick }: { task: Task, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className="glass-card"
      style={{ 
        ...style,
        padding: '1rem', 
        marginBottom: '0.5rem', 
        borderLeft: task.status === 'in_progress' ? '4px solid var(--accent-blue)' : (task.status === 'done' ? '4px solid var(--success)' : '1px solid var(--border-glass)'),
        cursor: 'grab',
        touchAction: 'none' // スマホでの誤作動を防ぐ
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
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

export default function Kanban() {
  const { tasks, fetchTasks, loading } = useTasks();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // スマホでの長押し（TouchSensor）と、PCでのマウスクリック（MouseSensor）を両立
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px動かしたらドラッグ開始
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 0.25秒長押しでドラッグ開始
        tolerance: 5, // 長押し中に5px指がズレても許容
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    
    // 移動先のカラム（ステータス）を特定
    let overStatus = '';
    const overId = String(over.id);
    if (overId.startsWith('column-')) {
      overStatus = overId.replace('column-', '');
    } else {
      // タスクの上にドロップされた場合、そのタスクのステータスを取得
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) overStatus = overTask.status;
    }
    
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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>※スマホではタスクを「長押し」してから移動できます。</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', flex: 1, paddingBottom: '1rem', scrollSnapType: 'x mandatory' }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} id={`column-${col.id}`} style={{ flex: '0 0 300px', scrollSnapAlign: 'start', background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--bg-glass)', zIndex: 10, paddingBottom: '0.5rem' }}>{col.title} ({columnTasks.length})</h3>
                <SortableContext id={col.id} items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ flex: 1, minHeight: '200px' }}>
                    {columnTasks.map(task => (
                      <SortableTask key={task.id} task={task} onClick={() => openTaskModal(task)} />
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
        task={editingTask} 
        categories={[]} 
        onSave={() => fetchTasks()} 
      />
    </div>
  );
}
