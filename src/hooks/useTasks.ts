import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type Task = {
  id: string;
  parent_id: string | null;
  routine_id: string | null;
  task_type: 'task' | 'event';
  title: string;
  status: string; // 'todo', 'in_progress', 'done'
  category_id: string | null;
  categories?: { name: string; color: string; parent_id: string | null } | null;
  subtasks?: Task[];
  target_count: number;
  current_count: number;
  tags: string[];
  notes: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at?: string;
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('id, parent_id, routine_id, task_type, title, status, is_completed, category_id, target_count, current_count, tags, notes, planned_start_time, planned_end_time, actual_start_time, actual_end_time, created_at, categories(name, color, parent_id)')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Fetch error:", error);
      setLoading(false);
      return;
    }
    
    if (data) {
      // Migrate legacy is_completed to status locally if database hasn't been updated yet
      const mappedData = data.map(t => ({
        ...t,
        status: t.status ? t.status : (t.is_completed ? 'done' : 'todo')
      }));

      const parentTasks = mappedData.filter(t => !t.parent_id).map(t => ({...t, subtasks: []})) as unknown as Task[];
      const subTasks = mappedData.filter(t => t.parent_id);
      
      subTasks.forEach(sub => {
        const parent = parentTasks.find(p => p.id === sub.parent_id);
        if (parent) parent.subtasks!.push(sub as unknown as Task);
      });
      
      setTasks(parentTasks);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();

    const tasksSubscription = supabase
      .channel('tasks_channel_shared')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(tasksSubscription);
    };
  }, []);

  return { tasks, fetchTasks, loading };
}
