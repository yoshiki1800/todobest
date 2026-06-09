"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { CheckCircle, Clock, CalendarDays, Settings, Plus, Play, Square as StopSquare, X, Square, CheckSquare, ChevronDown, ChevronRight, Trash2, Tag, RefreshCw, Edit2, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, parseISO, differenceInMinutes, startOfDay, addMinutes } from "date-fns";

type Task = {
  id: string;
  parent_id: string | null;
  routine_id: string | null;
  task_type: 'task' | 'event';
  title: string;
  is_completed: boolean;
  category_id: string | null;
  categories?: { name: string; color: string } | null;
  subtasks?: Task[];
  target_count: number;
  current_count: number;
  tags: string[];
  planned_start_time: string | null;
  planned_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
};

type Routine = {
  id: string;
  title: string;
  category_id: string | null;
  schedule_type: string;
  subtasks_schema: string[];
  target_count: number;
  default_tags: string[];
};

// ヘルパー：HH:mm形式の時間を、今日の日付と結合してISO文字列にする
const combineTimeWithToday = (timeStr: string | null) => {
  if (!timeStr) return null;
  const today = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
};

// ヘルパー：ISO文字列からHH:mm形式の時間を抽出する
const extractTimeFromISO = (isoString: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return format(date, 'HH:mm');
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  
  // Task form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<'task' | 'event'>('task');
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");
  const [newTaskTargetCount, setNewTaskTargetCount] = useState(1);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [plannedStart, setPlannedStart] = useState(""); // HH:mm
  const [plannedEnd, setPlannedEnd] = useState(""); // HH:mm
  const [actualStart, setActualStart] = useState(""); // HH:mm
  const [actualEnd, setActualEnd] = useState(""); // HH:mm
  
  // Routine form state
  const [newRoutineTitle, setNewRoutineTitle] = useState("");
  const [newRoutineCategory, setNewRoutineCategory] = useState("");
  const [newRoutineTags, setNewRoutineTags] = useState("");
  const [newRoutineTargetCount, setNewRoutineTargetCount] = useState(1);
  const [newRoutineSubtasks, setNewRoutineSubtasks] = useState("");

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 80%, 70%)`;
  };

  useEffect(() => {
    fetchCategories();
    fetchTasks();
    fetchRoutines();

    const tasksSubscription = supabase
      .channel('tasks_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error("SW reg failed", err));
    }

    return () => {
      supabase.removeChannel(tasksSubscription);
      clearInterval(timer);
    };
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setNewTaskCategory(data[0].id);
        setNewRoutineCategory(data[0].id);
      }
    }
  }

  async function fetchRoutines() {
    const { data } = await supabase.from('routines').select('*');
    if (data) setRoutines(data);
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, parent_id, routine_id, task_type, title, is_completed, category_id, target_count, current_count, tags, planned_start_time, planned_end_time, actual_start_time, actual_end_time, categories(name, color)')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Fetch error:", error);
      return;
    }
    
    if (data && data.length >= 0) {
      const parentTasks = data.filter(t => !t.parent_id).map(t => ({...t, subtasks: []})) as unknown as Task[];
      const subTasks = data.filter(t => t.parent_id);
      
      subTasks.forEach(sub => {
        const parent = parentTasks.find(p => p.id === sub.parent_id);
        if (parent) parent.subtasks!.push(sub as unknown as Task);
      });
      
      setTasks(parentTasks);
    }
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tagsArray = newTaskTags.split(',').map(t => t.trim()).filter(t => t);

    const taskData = {
      title: newTaskTitle, 
      task_type: newTaskType,
      category_id: newTaskCategory || null,
      tags: tagsArray,
      target_count: newTaskTargetCount,
      planned_start_time: combineTimeWithToday(plannedStart),
      planned_end_time: combineTimeWithToday(plannedEnd),
      actual_start_time: combineTimeWithToday(actualStart),
      actual_end_time: combineTimeWithToday(actualEnd),
    };

    if (editingTaskId) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTaskId);
      if (error) alert("更新に失敗しました。");
    } else {
      const { error } = await supabase.from('tasks').insert([
        { ...taskData, parent_id: addingSubtaskTo, current_count: 0 }
      ]);
      if (error) alert("追加に失敗しました。");
    }

    setIsTaskModalOpen(false);
    fetchTasks();
  }

  async function handleAddRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    const tagsArray = newRoutineTags.split(',').map(t => t.trim()).filter(t => t);
    const subtasksArray = newRoutineSubtasks.split(',').map(t => t.trim()).filter(t => t);

    const { error } = await supabase.from('routines').insert([{
      title: newRoutineTitle,
      category_id: newRoutineCategory || null,
      schedule_type: 'daily',
      subtasks_schema: subtasksArray,
      target_count: newRoutineTargetCount,
      default_tags: tagsArray
    }]);

    if (error) alert("ルーティンの追加に失敗しました。");
    else setIsRoutineModalOpen(false);
    fetchRoutines();
  }

  async function executeRoutine(routine: Routine) {
    const { data: parentData, error: parentError } = await supabase.from('tasks').insert([{
      title: routine.title,
      task_type: 'task',
      category_id: routine.category_id,
      routine_id: routine.id,
      tags: routine.default_tags,
      target_count: routine.target_count,
      current_count: 0
    }]).select().single();

    if (parentError || !parentData) return alert("タスクの生成に失敗しました。");

    if (routine.subtasks_schema && routine.subtasks_schema.length > 0) {
      const subtaskInserts = routine.subtasks_schema.map(title => ({
        title, parent_id: parentData.id, task_type: 'task', category_id: routine.category_id, routine_id: routine.id, target_count: 1, current_count: 0
      }));
      await supabase.from('tasks').insert(subtaskInserts);
    }
    fetchTasks();
  }

  async function handleTaskClick(task: Task) {
    if (task.target_count > 1 && task.current_count < task.target_count) {
      const newCount = task.current_count + 1;
      const isNowCompleted = newCount >= task.target_count;
      await supabase.from('tasks').update({ current_count: newCount, is_completed: isNowCompleted }).eq('id', task.id);
    } else {
      await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
    }
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("本当にこのタスクを削除しますか？")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  async function toggleTimer(task: Task) {
    const now = new Date().toISOString();
    if (!task.actual_start_time || (task.actual_start_time && task.actual_end_time)) {
      await supabase.from('tasks').update({ actual_start_time: now, actual_end_time: null }).eq('id', task.id);
    } else {
      await supabase.from('tasks').update({ actual_end_time: now }).eq('id', task.id);
    }
    fetchTasks();
  }

  const openAddTaskModal = (parentId: string | null = null, defaultType: 'task' | 'event' = 'task', defaultStartHour?: number) => {
    setEditingTaskId(null);
    setAddingSubtaskTo(parentId);
    setNewTaskType(defaultType);
    setNewTaskTitle("");
    setNewTaskTags("");
    setNewTaskTargetCount(1);
    
    if (defaultStartHour !== undefined) {
      setPlannedStart(`${defaultStartHour.toString().padStart(2, '0')}:00`);
      setPlannedEnd(`${(defaultStartHour + 1).toString().padStart(2, '0')}:00`);
    } else {
      setPlannedStart(""); setPlannedEnd(""); 
    }
    setActualStart(""); setActualEnd("");
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTaskId(task.id);
    setAddingSubtaskTo(task.parent_id);
    setNewTaskType(task.task_type || 'task');
    setNewTaskTitle(task.title);
    setNewTaskTags(task.tags ? task.tags.join(', ') : "");
    setNewTaskCategory(task.category_id || "");
    setNewTaskTargetCount(task.target_count);
    
    // HH:mmに変換してセット
    setPlannedStart(extractTimeFromISO(task.planned_start_time));
    setPlannedEnd(extractTimeFromISO(task.planned_end_time));
    setActualStart(extractTimeFromISO(task.actual_start_time));
    setActualEnd(extractTimeFromISO(task.actual_end_time));
    setIsTaskModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedTasks(newSet);
  };

  const subscribeToPush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });
          
          await fetch('/api/push/subscribe', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription) 
          });
          alert("プッシュ通知をオンにしました！ホーム画面にもアプリとして追加可能です。");
        } else {
          alert("通知が許可されませんでした。");
        }
      } catch (err) {
        console.error("Subscription failed:", err);
      }
    } else {
      alert("お使いのブラウザはプッシュ通知に対応していません。");
    }
  };

  const testPush = async () => {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ToDoBEST', body: '通知テストが成功しました！' })
    });
  };

  const renderTask = (task: Task, isSubtask = false) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const completedSubtasksCount = task.subtasks?.filter(t => t.is_completed).length || 0;
    const isCounterTask = task.target_count > 1;
    const isTimerRunning = task.actual_start_time && !task.actual_end_time;
    
    const timeDisplay = task.planned_start_time && task.planned_end_time 
      ? `${format(new Date(task.planned_start_time), 'HH:mm')} - ${format(new Date(task.planned_end_time), 'HH:mm')}`
      : null;

    return (
      <div key={task.id} style={{ marginBottom: isSubtask ? '0.5rem' : '0.75rem', marginLeft: isSubtask ? '2rem' : '0' }}>
        <div className="glass-card" style={{ 
          padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          opacity: task.is_completed ? 0.6 : 1, 
          borderLeft: isTimerRunning ? '4px solid var(--danger)' : (task.routine_id ? '4px solid var(--accent-purple)' : '1px solid var(--border-glass)') 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasSubtasks && !isSubtask ? (
              <button onClick={() => toggleExpand(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
            ) : <div style={{ width: '20px' }}></div>}
            
            <button onClick={() => handleTaskClick(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.is_completed ? 'var(--success)' : 'var(--text-muted)' }}>
              {task.is_completed ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: isSubtask ? '0.9rem' : '1.1rem', fontWeight: 600, textDecoration: task.is_completed ? 'line-through' : 'none' }}>
                  {task.title}
                </h4>
                {timeDisplay && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Clock size={12} /> {timeDisplay}
                  </span>
                )}
                {isTimerRunning && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>計測中...</span>}
                {isCounterTask && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', background: task.current_count === task.target_count ? 'var(--success)' : 'var(--accent-blue)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {task.current_count} / {task.target_count}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
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

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

        {hasSubtasks && (isExpanded || !task.is_completed) && !isSubtask && (
          <div style={{ marginTop: '0.5rem', borderLeft: '2px solid var(--border-glass)', paddingLeft: '1rem', marginLeft: '1rem' }}>
            {task.subtasks!.map(sub => renderTask(sub, true))}
          </div>
        )}
      </div>
    );
  };

  // Timeline rendering logic
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
          if (hour < 6) return null; // 6時前の予定は表示しない（または上部に固定するなど）
          const top = (hour - 6) * 60 + pStart.getMinutes();
          const height = differenceInMinutes(pEnd, pStart);
          plannedBlock = (
            <div 
              key={`p-${task.id}`} 
              onClick={() => openEditTaskModal(task)}
              style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: isEvent ? '5%' : '10px', right: isEvent ? '5%' : '50%', background: isEvent ? `${bgColor}30` : 'rgba(255,255,255,0.1)', border: isEvent ? `1px solid ${bgColor}80` : '1px dashed rgba(255,255,255,0.3)', borderRadius: '4px', padding: '4px', fontSize: '0.75rem', color: isEvent ? bgColor : 'var(--text-secondary)', overflow: 'hidden', cursor: 'pointer', zIndex: isEvent ? 5 : 1 }}
            >
              <div style={{ fontWeight: 600 }}>{task.title}</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{format(pStart, 'HH:mm')} - {format(pEnd, 'HH:mm')}</div>
            </div>
          );
        }
      }

      let actualBlock = null;
      if (task.actual_start_time && !isEvent) { // イベントには「実績」という概念がない（枠だけ）
        const aStart = new Date(task.actual_start_time);
        const aEnd = task.actual_end_time ? new Date(task.actual_end_time) : currentTime;
        if (aStart >= today) {
          const hour = aStart.getHours();
          if (hour < 6) return null;
          const top = (hour - 6) * 60 + aStart.getMinutes();
          const height = Math.max(differenceInMinutes(aEnd, aStart), 15);
          actualBlock = (
            <div 
              key={`a-${task.id}`} 
              onClick={() => openEditTaskModal(task)}
              style={{ position: 'absolute', top: `${top}px`, height: `${height}px`, left: '50%', right: '10px', background: `${bgColor}80`, borderRadius: '4px', padding: '4px', fontSize: '0.75rem', color: 'white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10, cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 600 }}>{task.title}</div>
              <div style={{ fontSize: '0.65rem' }}>{format(aStart, 'HH:mm')} - {task.actual_end_time ? format(aEnd, 'HH:mm') : '計測中'}</div>
            </div>
          );
        }
      }
      
      return (
        <div key={`timeline-wrap-${task.id}`}>
          {plannedBlock}
          {actualBlock}
        </div>
      );
    });
  };

  const currentHourTop = currentTime.getHours() >= 6 ? (currentTime.getHours() - 6) * 60 + currentTime.getMinutes() : -100;

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <CheckCircle size={28} color="var(--accent-blue)" />
          <h1 className={styles.sidebarTitle}>ToDoBEST</h1>
        </div>
        
        <nav className={styles.navContainer}>
          <div className={`${styles.navItem} ${styles.active}`}><CheckCircle size={20} /><span>今日</span></div>
          <div className={styles.navItem}><CalendarDays size={20} /><span>スケジュール</span></div>
          <div className={styles.navItem}><Clock size={20} /><span>設定 / ルーティン管理</span></div>
        </nav>

        <div style={{ marginTop: 'auto', background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ルーティン実行</h4>
            <button className="btn btn-ghost" style={{ padding: '0.2rem' }} onClick={() => setIsRoutineModalOpen(true)}><Plus size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {routines.map(r => (
              <button key={r.id} onClick={() => executeRoutine(r)} className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: '0.875rem', background: 'rgba(255,255,255,0.05)' }}>
                <RefreshCw size={14} color="var(--accent-purple)" /> {r.title}
              </button>
            ))}
            {routines.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ルーティンなし</span>}
          </div>
        </div>

        <div style={{ marginTop: '1rem', background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>通知設定</h4>
          <button onClick={subscribeToPush} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <Bell size={16} /> 通知をオンにする
          </button>
          <button onClick={testPush} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem' }}>
            <Bell size={16} color="var(--accent-blue)" /> テスト送信
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>今日のタスク</h2>
          <button className="btn btn-primary" onClick={() => openAddTaskModal(null, 'task')}><Plus size={18} />単発タスク</button>
        </header>

        <div className={styles.contentWrapper}>
          <div className={styles.taskSection}>
            <h3 className={styles.sectionTitle} style={{ color: 'var(--accent-blue)' }}>⚡ 単発・突発タスク</h3>
            {tasks.filter(t => !t.is_completed && !t.routine_id && t.task_type !== 'event').map(task => renderTask(task))}
            {tasks.filter(t => !t.is_completed && !t.routine_id && t.task_type !== 'event').length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>タスクはありません</p>
            )}

            <h3 className={styles.sectionTitle} style={{ color: 'var(--accent-purple)', marginTop: '2rem' }}>🔁 進行中のルーティン</h3>
            {tasks.filter(t => !t.is_completed && t.routine_id && t.task_type !== 'event').map(task => renderTask(task))}
            {tasks.filter(t => !t.is_completed && t.routine_id && t.task_type !== 'event').length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>進行中のルーティンはありません</p>
            )}

            <h3 className={styles.sectionTitle} style={{ marginTop: '3rem', opacity: 0.7 }}><CheckSquare size={18} />完了済み</h3>
            {tasks.filter(t => t.is_completed && t.task_type !== 'event').map(task => renderTask(task))}
          </div>

          <div className={styles.timelineSection} style={{ overflowY: 'auto', position: 'relative', paddingRight: '1rem' }}>
            <h3 className={styles.sectionTitle} style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 20, paddingTop: '1rem', paddingBottom: '1rem' }}>
              <CalendarDays size={18} /> 今日のタイムライン (6:00〜)
            </h3>
            
            <div style={{ position: 'relative', height: '1140px', marginTop: '1rem' }}>
              {/* Timeline Grid (6:00 to 24:00) */}
              {[...Array(19)].map((_, idx) => {
                const i = idx + 6;
                if (i > 24) return null;
                return (
                  <div 
                    key={`hour-${i}`} 
                    onClick={() => openAddTaskModal(null, 'event', i === 24 ? 0 : i)}
                    style={{ position: 'absolute', top: `${idx * 60}px`, width: '100%', height: '60px', borderTop: '1px solid var(--border-glass)', cursor: 'pointer' }}
                    className="timeline-grid-cell"
                    title={i < 24 ? `${i}:00に予定を追加` : undefined}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'absolute', top: '-10px', background: 'var(--bg)', padding: '0 4px', pointerEvents: 'none' }}>
                      {i === 24 ? '00:00' : `${i.toString().padStart(2, '0')}:00`}
                    </span>
                  </div>
                );
              })}
              
              {/* Current Time Line */}
              {currentHourTop >= 0 && (
                <div style={{ position: 'absolute', top: `${currentHourTop}px`, width: '100%', borderTop: '2px solid var(--danger)', zIndex: 15, pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', left: '-5px', top: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)' }}></span>
                </div>
              )}

              {/* Render Task Blocks */}
              {renderTimelineBlocks()}
            </div>
          </div>
        </div>
      </main>

      {/* Add / Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{editingTaskId ? "編集" : "追加"}</h3>
              <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Type Toggle (Only for new items) */}
              {!editingTaskId && !addingSubtaskTo && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px' }}>
                  <button type="button" onClick={() => setNewTaskType('task')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', background: newTaskType === 'task' ? 'var(--accent-blue)' : 'transparent', color: newTaskType === 'task' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>タスク (ToDo)</button>
                  <button type="button" onClick={() => setNewTaskType('event')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', background: newTaskType === 'event' ? 'var(--accent-purple)' : 'transparent', color: newTaskType === 'event' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>スケジュール (予定)</button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{newTaskType === 'task' ? 'タスク名' : '予定名（食事・移動など）'}</label>
                <input type="text" className="input-field" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} autoFocus />
              </div>
              
              {!addingSubtaskTo && (
                <>
                  {newTaskType === 'task' && (
                    <>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>回数（目標）</label>
                          <input type="number" min="1" className="input-field" value={newTaskTargetCount} onChange={e => setNewTaskTargetCount(parseInt(e.target.value) || 1)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>カテゴリ</label>
                          <select className="input-field" value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)}>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>タグ（カンマ区切り）</label>
                        <input type="text" className="input-field" value={newTaskTags} onChange={e => setNewTaskTags(e.target.value)} />
                      </div>
                    </>
                  )}

                  {newTaskType === 'event' && (
                     <div style={{ flex: 1 }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>カテゴリ（タイムライン上の色）</label>
                     <select className="input-field" value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)}>
                       {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                     </select>
                   </div>
                  )}
                  
                  {/* Timeline Time Inputs */}
                  <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} />時間設定（自動的に本日の日付になります）</h4>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>開始時間</label>
                        <input type="time" className="input-field" value={plannedStart} onChange={e => setPlannedStart(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>終了時間</label>
                        <input type="time" className="input-field" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} />
                      </div>
                    </div>
                    
                    {newTaskType === 'task' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>実績 開始（手動）</label>
                          <input type="time" className="input-field" value={actualStart} onChange={e => setActualStart(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>実績 終了（手動）</label>
                          <input type="time" className="input-field" value={actualEnd} onChange={e => setActualEnd(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsTaskModalOpen(false)}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={!newTaskTitle.trim()}>{editingTaskId ? "更新する" : "追加する"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Routine Template Modal (Unchanged) */}
      {isRoutineModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRoutineModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>新しいルーティンの作成</h3>
              <button onClick={() => setIsRoutineModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ルーティン名</label>
                <input type="text" className="input-field" value={newRoutineTitle} onChange={e => setNewRoutineTitle(e.target.value)} placeholder="例: ポッドキャスト作成" autoFocus />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>タグ（カンマ区切り）</label>
                <input type="text" className="input-field" placeholder="例: Aアカウント" value={newRoutineTags} onChange={e => setNewRoutineTags(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>回数（目標）</label>
                <input type="number" min="1" className="input-field" value={newRoutineTargetCount} onChange={e => setNewRoutineTargetCount(parseInt(e.target.value) || 1)} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>工程（サブタスク）のテンプレート（カンマ区切り）</label>
                <input type="text" className="input-field" placeholder="例: 1.台本, 2.録音, 3.編集, 4.公開" value={newRoutineSubtasks} onChange={e => setNewRoutineSubtasks(e.target.value)} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>カテゴリ</label>
                <select className="input-field" value={newRoutineCategory} onChange={e => setNewRoutineCategory(e.target.value)}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsRoutineModalOpen(false)}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={!newRoutineTitle.trim()}>保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
