"use client";

import { useMemo } from "react";
import { BarChart2, CheckCircle2 } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

export default function Reports() {
  const { tasks, loading } = useTasks();

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
  }, []);

  const barChartData = useMemo(() => {
    return last7Days.map(date => {
      const completedOnDate = tasks.filter(t => t.status === 'done' && t.actual_end_time && isSameDay(new Date(t.actual_end_time), date));
      return {
        date: format(date, 'M/d', { locale: ja }),
        count: completedOnDate.length
      };
    });
  }, [tasks, last7Days]);

  const pieChartData = useMemo(() => {
    const categoryCounts: Record<string, { name: string, color: string, value: number }> = {};
    
    tasks.filter(t => t.status === 'done').forEach(t => {
      const catId = t.category_id || 'uncategorized';
      if (!categoryCounts[catId]) {
        categoryCounts[catId] = {
          name: t.categories ? t.categories.name : '未分類',
          color: t.categories ? t.categories.color : '#94a3b8',
          value: 0
        };
      }
      categoryCounts[catId].value += 1;
    });

    return Object.values(categoryCounts).sort((a, b) => b.value - a.value);
  }, [tasks]);

  const totalCompleted = tasks.filter(t => t.status === 'done').length;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 color="var(--success)" /> レポート・分析
        </h2>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: '50%' }}>
            <CheckCircle2 size={32} color="var(--success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>総完了タスク数</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{totalCompleted}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>過去7日間の完了数</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} 
                />
                <Bar dataKey="count" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>カテゴリ別完了割合 (全期間)</h3>
          <div style={{ height: '300px' }}>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>データがありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
