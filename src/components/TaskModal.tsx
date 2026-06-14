import { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Task } from "@/hooks/useTasks";
import { format } from "date-fns";

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  parentId?: string | null;
  defaultType?: 'task' | 'event';
  defaultStartHour?: number;
  defaultEndHour?: number;
  onSave: () => void;
  categories: { id: string; name: string; color: string; parent_id: string | null }[];
};

const combineTimeWithToday = (timeStr: string | null) => {
  if (!timeStr) return null;
  const today = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
};

const extractTimeFromISO = (isoString: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return format(date, 'HH:mm');
};

export default function TaskModal({ isOpen, onClose, task, parentId, defaultType = 'task', defaultStartHour, defaultEndHour, onSave, categories }: TaskModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<'task' | 'event'>(defaultType);
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");
  const [newTaskTargetCount, setNewTaskTargetCount] = useState(1);
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setNewTaskTitle(task.title);
        setNewTaskType(task.task_type || 'task');
        setNewTaskCategory(task.category_id || "");
        setNewTaskTags(task.tags ? task.tags.join(', ') : "");
        setNewTaskTargetCount(task.target_count);
        setNewTaskNotes(task.notes || "");
        setNewTaskStatus(task.status || (task as any).is_completed ? 'done' : 'todo');
        setPlannedStart(extractTimeFromISO(task.planned_start_time));
        setPlannedEnd(extractTimeFromISO(task.planned_end_time));
        setActualStart(extractTimeFromISO(task.actual_start_time));
        setActualEnd(extractTimeFromISO(task.actual_end_time));
      } else {
        setNewTaskTitle("");
        setNewTaskType(defaultType);
        setNewTaskCategory(categories.length > 0 ? categories[0].id : "");
        setNewTaskTags("");
        setNewTaskTargetCount(1);
        setNewTaskNotes("");
        setNewTaskStatus("todo");
        if (defaultStartHour !== undefined) {
          setPlannedStart(`${defaultStartHour.toString().padStart(2, '0')}:00`);
          const endHour = defaultEndHour !== undefined ? defaultEndHour : defaultStartHour + 1;
          setPlannedEnd(`${endHour.toString().padStart(2, '0')}:00`);
        } else {
          setPlannedStart(""); setPlannedEnd(""); 
        }
        setActualStart(""); setActualEnd("");
      }
    }
  }, [isOpen, task, defaultType, defaultStartHour, defaultEndHour, categories]);

  if (!isOpen) return null;

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
      notes: newTaskNotes,
      status: newTaskStatus,
      is_completed: newTaskStatus === 'done', // Fallback for legacy
      planned_start_time: combineTimeWithToday(plannedStart),
      planned_end_time: combineTimeWithToday(plannedEnd),
      actual_start_time: combineTimeWithToday(actualStart),
      actual_end_time: combineTimeWithToday(actualEnd),
    };

    if (task) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', task.id);
      if (error) alert("更新に失敗しました。");
    } else {
      const { error } = await supabase.from('tasks').insert([
        { ...taskData, parent_id: parentId, current_count: 0 }
      ]);
      if (error) alert("追加に失敗しました。");
    }

    onSave();
    onClose();
  }

  // Categories Dropdown logic: group by parent
  const parentCats = categories.filter(c => !c.parent_id);
  const childCats = categories.filter(c => c.parent_id);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{task ? "編集" : "追加"}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!task && !parentId && (
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px' }}>
              <button type="button" onClick={() => setNewTaskType('task')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', background: newTaskType === 'task' ? 'var(--accent-blue)' : 'transparent', color: newTaskType === 'task' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>タスク (ToDo)</button>
              <button type="button" onClick={() => setNewTaskType('event')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', background: newTaskType === 'event' ? 'var(--accent-purple)' : 'transparent', color: newTaskType === 'event' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>スケジュール (予定)</button>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{newTaskType === 'task' ? 'タスク名' : '予定名（食事・移動など）'}</label>
            <input type="text" className="input-field" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {newTaskType === 'task' && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ステータス</label>
                <select className="input-field" value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value)}>
                  <option value="todo">未着手 (ToDo)</option>
                  <option value="in_progress">進行中 (In Progress)</option>
                  <option value="done">完了 (Done)</option>
                </select>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>カテゴリ</label>
              <select className="input-field" value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)}>
                <option value="">なし</option>
                {parentCats.map(parent => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {childCats.filter(c => c.parent_id === parent.id).map(child => (
                      <option key={child.id} value={child.id}>　└ {child.name}</option>
                    ))}
                  </optgroup>
                ))}
                {/* 階層がない既存カテゴリ用 */}
                {categories.filter(c => !c.parent_id && !parentCats.includes(c)).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {!parentId && newTaskType === 'task' && (
            <>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>回数（目標）</label>
                  <input type="number" min="1" className="input-field" value={newTaskTargetCount} onChange={e => setNewTaskTargetCount(parseInt(e.target.value) || 1)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>タグ（カンマ区切り）</label>
                  <input type="text" className="input-field" value={newTaskTags} onChange={e => setNewTaskTags(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {newTaskType === 'task' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>メモ (Markdown対応)</label>
              <textarea 
                className="input-field" 
                style={{ minHeight: '100px', resize: 'vertical' }} 
                value={newTaskNotes} 
                onChange={e => setNewTaskNotes(e.target.value)} 
                placeholder="- チェックリスト&#10;- 備考など"
              />
            </div>
          )}
          
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn btn-primary" disabled={!newTaskTitle.trim()}>{task ? "更新する" : "追加する"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
