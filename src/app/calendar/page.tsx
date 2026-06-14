"use client";

import { useState, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import TaskModal from "@/components/TaskModal";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export default function Calendar() {
  const { tasks, fetchTasks, loading } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const openTaskModal = (task: Task | null = null, date: Date | null = null) => {
    setEditingTask(task);
    if (date) setSelectedDate(date);
    setIsTaskModalOpen(true);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // カレンダーの日付セルを生成
  const calendarCells = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // 月曜始まり
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }
    return rows;
  }, [currentDate]);

  // タスクを日付ごとに整理
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      // 予定された開始時間、または実際の開始時間、または作成日を使用
      let taskDateStr = task.planned_start_time || task.actual_start_time || task.created_at;
      if (taskDateStr) {
        const d = format(parseISO(taskDateStr), 'yyyy-MM-dd');
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDate.get(selectedDateStr) || [];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays color="var(--accent-blue)" /> カレンダー
        </h2>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* 左側：カレンダー本体 */}
        <div style={{ flex: '1 1 400px', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronLeft /></button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{format(currentDate, 'yyyy年 M月', { locale: ja })}</h3>
            <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: '0.5rem' }}><ChevronRight /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
            {['月', '火', '水', '木', '金', '土', '日'].map(d => (
              <div key={d} style={{ fontSize: '0.85rem', fontWeight: 600, color: d === '日' ? 'var(--danger)' : d === '土' ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>

          <div>
            {calendarCells.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {row.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDate.get(dayStr) || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div 
                      key={dayStr}
                      onClick={() => setSelectedDate(day)}
                      style={{ 
                        aspectRatio: '1', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'flex-start',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-blue)' : (isToday ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'),
                        opacity: isCurrentMonth ? 1 : 0.3
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent-blue)' : 'var(--text)' }}>
                        {format(day, 'd')}
                      </span>
                      {dayTasks.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px', marginTop: 'auto', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {dayTasks.slice(0, 3).map((t, idx) => (
                            <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: t.categories?.color || 'var(--accent-blue)' }}></div>
                          ))}
                          {dayTasks.length > 3 && <span style={{ fontSize: '10px', lineHeight: '4px' }}>+</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 右側：選択した日のタスク一覧 */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{format(selectedDate, 'M月d日')}の予定</h3>
            <button className="btn btn-ghost" onClick={() => openTaskModal(null, selectedDate)} style={{ padding: '0.4rem', color: 'var(--accent-blue)' }}>
              <Plus size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
            {selectedTasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>予定はありません</p>
            ) : (
              selectedTasks.map(task => (
                <div key={task.id} onClick={() => openTaskModal(task)} className="glass-card" style={{ padding: '1rem', cursor: 'pointer', borderLeft: task.status === 'done' ? '4px solid var(--success)' : `4px solid ${task.categories?.color || 'var(--accent-blue)'}`, opacity: task.status === 'done' ? 0.6 : 1 }}>
                  <div style={{ fontWeight: 600, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {task.planned_start_time && <span>{format(parseISO(task.planned_start_time), 'HH:mm')} ~</span>}
                    {task.categories && <span style={{ color: task.categories.color }}>{task.categories.name}</span>}
                    <span>{task.status === 'done' ? '✅完了' : (task.status === 'in_progress' ? '⏳進行中' : '未着手')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
