"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { CheckCircle, Clock, Plus, Play, Square as StopSquare, Square, CheckSquare, ChevronDown, ChevronRight, Trash2, Tag, Edit2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, differenceInMinutes, startOfDay } from "date-fns";
import { useTasks, Task } from "@/hooks/useTasks";
import TaskModal from "@/components/TaskModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const { tasks, fetchTasks, loading } = useTasks();
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; parent_id: string | null }[]>([]);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<'task' | 'event'>('task');
  const [defaultStartHour, setDefaultStartHour] = useState<number | undefined>(undefined);

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchCategories();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error("SW reg failed", err));
    }
    return () => clearInterval(timer);
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  }

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 80%, 70%)`;
  };

  async function handleTaskClick(task: Task) {
    if (task.target_count > 1 && task.current_count < task.target_count) {
      const newCount = task.current_count + 1;
      const isNowCompleted = newCount >= task.target_count;
      await supabase.from('tasks').update({ current_count: newCount, status: isNowCompleted ? 'done' : 'in_progress', is_completed: isNowCompleted }).eq('id', task.id);
    } else {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await supabase.from('tasks').update({ status: newStatus, is_completed: newStatus === 'done' }).eq('id', task.id);
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("本当にこのタスクを削除しますか？")) return;
    await supabase.from('tasks').delete().eq('id', id);
  }

  async function toggleTimer(task: Task) {
    const now = new Date().toISOString();
    if (!task.actual_start_time || (task.actual_start_time && task.actual_end_time)) {
      await supabase.from('tasks').update({ actual_start_time: now, actual_end_time: null, status: 'in_progress' }).eq('id', task.id);
    } else {
      await supabase.from('tasks').update({ actual_end_time: now }).eq('id', task.id);
    }
  }

  const openAddTaskModal = (parentId: string | null = null, defaultT: 'task' | 'event' = 'task', defaultSHour?: number) => {
    setEditingTask(null);
    setAddingSubtaskTo(parentId);
    setDefaultType(defaultT);
    setDefaultStartHour(defaultSHour);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setAddingSubtaskTo(task.parent_id);
    setIsTaskModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedTasks(newSet);
  };

  const renderTask = (task: Task, isSubtask = false) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const completedSubtasksCount = task.subtasks?.filter(t => t.status === 'done').length || 0;
    const isCounterTask = task.target_count > 1;
    const isTimerRunning = task.actual_start_time && !task.actual_end_time;
    const isDone = task.status === 'done';
    
    const timeDisplay = task.planned_start_time && task.planned_end_time 
      ? `${format(new Date(task.planned_start_time), 'HH:mm')} - ${format(new Date(task.planned_end_time), 'HH:mm')}`
      : null;

    return (
      <div key={task.id} style={{ marginBottom: isSubtask ? '0.5rem' : '0.75rem', marginLeft: isSubtask ? '2rem' : '0' }}>
        <div className="glass-card" style={{ 
          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
          opacity: isDone ? 0.6 : 1, 
          borderLeft: isTimerRunning ? '4px solid var(--danger)' : (task.status === 'in_progress' ? '4px solid var(--accent-blue)' : '1px solid var(--border-glass)') 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {hasSubtasks && !isSubtask ? (
                <button onClick={() => toggleExpand(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              ) : <div style={{ width: '20px' }}></div>}
              
              <button onClick={() => handleTaskClick(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDone ? 'var(--success)' : 'var(--text-muted)' }}>
                {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: isSubtask ? '0.9rem' : '1.1rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none' }}>
                    {task.title}
                  </h4>
                  {timeDisplay && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Clock size={12} /> {timeDisplay}
                    </span>
                  )}
                  {task.status === 'in_progress' && !isTimerRunning && <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>進行中</span>}
                  {isTimerRunning && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>計測中...</span>}
                  {isCounterTask && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', background: task.current_count === task.target_count ? 'var(--success)' : 'var(--accent-blue)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', color: 'white' }}>
                      {task.current_count} / {task.target_count}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {hasSubtasks && !isSubtask && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>工程: {completedSubtasksCount}/{task.subtasks!.length}</span>}
                  {task.tags && task.tags.length > 0 && task.tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return (
                      <span key={tag} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', background: `${tagColor}20`, border: `1px solid ${tagColor}40`, padding: '2px 8px', borderRadius: 'var(--radius-full)', color: tagColor, fontWeight: 500 }}>
                        <Tag size={10} /> {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!isSubtask && task.categories && (
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: `${task.categories.color}20`, color: task.categories.color, borderRadius: 'var(--radius-full)' }}>{task.categories.name}</span>
              )}
              <button className="btn btn-ghost" style={{ padding: '0.4rem', color: isTimerRunning ? 'var(--danger)' : 'var(--text-secondary)' }} onClick={() => toggleTimer(task)} title={isTimerRunning ? "停止" : "タイマー開始"}>
                {isTimerRunning ? <StopSquare size={16} /> : <Play size={16} />}
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => openEditTaskModal(task)} title="編集"><Edit2 size={16} /></button>
              {!isSubtask && <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => openAddTaskModal(task.id)} title="サブタスク"><Plus size={16} /></button>}
              <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => deleteTask(task.id)} title="削除"><Trash2 size={16} /></button>
            </div>
          </div>
          
          {/* Notes display */}
          {task.notes && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: 'var(--text-muted)' }}><FileText size={12}/> メモ</div>
              <div className="markdown-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.notes}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {hasSubtasks && (isExpanded || !isDone) && !isSubtask && (
          <div style={{ marginTop: '0.5rem', borderLeft: '2px solid var(--border-glass)', paddingLeft: '1rem', marginLeft: '1rem' }}>
            {task.subtasks!.map(sub => renderTask(sub, true))}
          </div>
        )}
      </div>
    );
  };

  const renderTimelineBlocks = () => {
    const today = startOfDay(new Date());
    const timelineTasks = tasks.flatMap(t => [t, ...(t.subtasks || [])]).filter(t => 
      t.planned_start_time || (t.actual_start_time && t.actual_end_time) || (t.actual_start_time && !t.actual_end_time)
    );

    return timelineTasks.map(task => {
      const isEvent = task.task_type === 'event';
      const bgColor = task.categories ? `${task.categories.color}` : 'var(--accent-blue)';
      
      let plannedBlock = null;
      if (task.planned_start_time && task.planned_end_time) {
        const pStart = new Date(task.planned_start_time);
        const pEnd = new Date(task.planned_end_time);
        if (pStart >= today) {
          const hour = pStart.getHours();
          if (hour >= 6) {
            const top = (hour - 6) * 60 + pStart.getMinutes();
            const height = differenceInMinutes(pEnd, pStart);
            plannedBlock = (
              <div 
                key={`p-${task.id}`} onClick={() => openEditTaskModal(task)}
                style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: isEvent ? '5%' : '10px', right: isEvent ? '5%' : '50%', background: isEvent ? `${bgColor}30` : 'rgba(255,255,255,0.1)', border: isEvent ? `1px solid ${bgColor}80` : '1px dashed rgba(255,255,255,0.3)', borderRadius: '4px', padding: '4px', fontSize: '0.75rem', color: isEvent ? bgColor : 'var(--text-secondary)', overflow: 'hidden', cursor: 'pointer', zIndex: isEvent ? 5 : 1 }}
              >
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{format(pStart, 'HH:mm')} - {format(pEnd, 'HH:mm')}</div>
              </div>
            );
          }
        }
      }

      let actualBlock = null;
      if (task.actual_start_time && !isEvent) {
        const aStart = new Date(task.actual_start_time);
        const aEnd = task.actual_end_time ? new Date(task.actual_end_time) : currentTime;
        if (aStart >= today) {
          const hour = aStart.getHours();
          if (hour >= 6) {
            const top = (hour - 6) * 60 + aStart.getMinutes();
            const height = Math.max(differenceInMinutes(aEnd, aStart), 15);
            actualBlock = (
              <div 
                key={`a-${task.id}`} onClick={() => openEditTaskModal(task)}
                style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '50%', right: '10px', background: `${bgColor}80`, borderRadius: '4px', padding: '4px', fontSize: '0.75rem', color: 'white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10, cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: '0.65rem' }}>{format(aStart, 'HH:mm')} - {task.actual_end_time ? format(aEnd, 'HH:mm') : '計測中'}</div>
              </div>
            );
          }
        }
      }
      return <div key={`timeline-wrap-${task.id}`}>{plannedBlock}{actualBlock}</div>;
    });
  };

  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline'>('tasks');
  const [dragSelection, setDragSelection] = useState<{ start: number, end: number } | null>(null);

  const currentHourTop = currentTime.getHours() >= 6 ? (currentTime.getHours() - 6) * 60 + currentTime.getMinutes() : -100;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / 60) + 6;
    setDragSelection({ start: hour, end: hour });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSelection) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - rect.top);
    const hour = Math.floor(y / 60) + 6;
    setDragSelection(prev => prev ? { ...prev, end: hour } : null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSelection) return;
    const startHour = Math.min(dragSelection.start, dragSelection.end);
    let endHour = Math.max(dragSelection.start, dragSelection.end) + 1;
    if (endHour > 24) endHour = 24;
    
    setDragSelection(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Open modal with pre-filled times
    setEditingTask(null);
    setAddingSubtaskTo(null);
    setDefaultType('event');
    setIsTaskModalOpen(true);
    
    // Pass the selected hours to the modal by temporarily storing them in the component state
    // We already have defaultStartHour, but we also need defaultEndHour. Let's pass an object instead.
    setDefaultTimeRange({ start: startHour, end: endHour });
  };
  
  const [defaultTimeRange, setDefaultTimeRange] = useState<{start: number, end: number} | null>(null);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>;

  return (
    <>
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle color="var(--accent-blue)" /> 今日のタスク
          </h2>
          <button className="btn btn-primary" onClick={() => { setDefaultTimeRange(null); openAddTaskModal(null, 'task'); }}><Plus size={18} />単発追加</button>
        </header>

        {/* Mobile Tabs */}
        <div className="mobile-only-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: 'var(--radius-lg)' }}>
          <button 
            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: activeTab === 'tasks' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'tasks' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('tasks')}
          >
            📋 タスクリスト
          </button>
          <button 
            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: activeTab === 'timeline' ? 'var(--accent-purple)' : 'transparent', color: activeTab === 'timeline' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('timeline')}
          >
            ⏰ タイムライン
          </button>
        </div>

        <div className={styles.contentWrapper} style={{ flex: 1, overflow: 'hidden' }}>
          <div className={`${styles.taskSection} ${activeTab === 'timeline' ? 'mobile-hidden' : ''}`} style={{ paddingBottom: '2rem' }}>
            <h3 className={styles.sectionTitle} style={{ color: 'var(--accent-blue)' }}>⚡ ToDo / 進行中</h3>
            {tasks.filter(t => t.status !== 'done' && !t.routine_id && t.task_type !== 'event').map(task => renderTask(task))}
            {tasks.filter(t => t.status !== 'done' && !t.routine_id && t.task_type !== 'event').length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>タスクはありません</p>
            )}

            <h3 className={styles.sectionTitle} style={{ color: 'var(--accent-purple)', marginTop: '2rem' }}>🔁 ルーティン</h3>
            {tasks.filter(t => t.status !== 'done' && t.routine_id && t.task_type !== 'event').map(task => renderTask(task))}
            {tasks.filter(t => t.status !== 'done' && t.routine_id && t.task_type !== 'event').length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>進行中のルーティンはありません</p>
            )}

            <h3 className={styles.sectionTitle} style={{ marginTop: '3rem', opacity: 0.7 }}><CheckSquare size={18} />完了済み</h3>
            {tasks.filter(t => t.status === 'done' && t.task_type !== 'event').map(task => renderTask(task))}
          </div>

          <div className={`${styles.timelineSection} ${activeTab === 'tasks' ? 'mobile-hidden' : ''}`} style={{ overflowY: 'auto', position: 'relative', paddingRight: '1rem', paddingBottom: '2rem' }}>
            <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 20, paddingTop: '0.5rem', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                <Clock size={18} /> タイムライン (6:00〜)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>※長押し＆なぞって予定追加</p>
            </div>
            
            <div 
              style={{ position: 'relative', height: '1140px', marginTop: '1rem', touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setDragSelection(null)}
            >
              {[...Array(19)].map((_, idx) => {
                const i = idx + 6;
                if (i > 24) return null;
                return (
                  <div 
                    key={`hour-${i}`} 
                    style={{ position: 'absolute', top: `${idx * 60}px`, width: '100%', height: '60px', borderTop: '1px solid var(--border-glass)' }}
                    className="timeline-grid-cell"
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'absolute', top: '-10px', background: 'var(--bg)', padding: '0 4px', pointerEvents: 'none' }}>
                      {i === 24 ? '00:00' : `${i.toString().padStart(2, '0')}:00`}
                    </span>
                  </div>
                );
              })}
              
              {/* Drag Selection Preview */}
              {dragSelection && (
                <div style={{ 
                  position: 'absolute', 
                  left: '10%', right: '10%', 
                  top: `${(Math.min(dragSelection.start, dragSelection.end) - 6) * 60}px`, 
                  height: `${(Math.abs(dragSelection.end - dragSelection.start) + 1) * 60}px`, 
                  background: 'rgba(168, 85, 247, 0.3)', 
                  border: '2px dashed var(--accent-purple)',
                  borderRadius: '8px',
                  zIndex: 30,
                  pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                }}>
                  {Math.min(dragSelection.start, dragSelection.end)}:00 - {Math.max(dragSelection.start, dragSelection.end) + 1}:00
                </div>
              )}

              {currentHourTop >= 0 && (
                <div style={{ position: 'absolute', top: `${currentHourTop}px`, width: '100%', borderTop: '2px solid var(--danger)', zIndex: 15, pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', left: '-5px', top: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }}></span>
                </div>
              )}

              {renderTimelineBlocks()}
            </div>
          </div>
        </div>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        task={editingTask} 
        parentId={addingSubtaskTo} 
        defaultType={defaultType} 
        defaultStartHour={defaultTimeRange ? defaultTimeRange.start : defaultStartHour} 
        defaultEndHour={defaultTimeRange ? defaultTimeRange.end : undefined}
        categories={categories} 
        onSave={() => {}} 
      />
    </>
  );
}
