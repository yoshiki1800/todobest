"use client";

import { Clock, Calendar, Plus, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

export default function TimelinePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate hours array (06:00 to 24:00)
  const hours = Array.from({ length: 19 }, (_, i) => i + 6);

  // Example tasks for the timeline
  const tasks = [
    { id: 1, title: "朝のストレッチ", category: "健康・運動", color: "var(--cat-health)", start: 7, duration: 0.5, completed: true },
    { id: 2, title: "メール対応", category: "仕事", color: "var(--cat-work)", start: 9, duration: 1, completed: true },
    { id: 3, title: "UIデザイン作成", category: "仕事", color: "var(--cat-work)", start: 10, duration: 2.5, isActive: true },
    { id: 4, title: "チームミーティング", category: "仕事", color: "var(--cat-work)", start: 14, duration: 1 },
    { id: 5, title: "英語学習", category: "自己研鑽", color: "var(--cat-learning)", start: 18, duration: 1 },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        marginTop: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>タイムライン</h1>
          <p style={{ color: 'var(--text-secondary)' }}>1日のスケジュールと予実管理</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-primary)',
            padding: '10px 16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}>
            <Calendar size={18} />
            今日
          </button>
          <button style={{
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          }}>
            <Plus size={18} />
            予定追加
          </button>
        </div>
      </header>

      {/* Timeline Container */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', overflowY: 'auto', marginBottom: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: 'var(--text-secondary)' }}>
          <Clock size={20} />
          <span>スケジュールの空き時間は {24 - 6 - tasks.reduce((acc, curr) => acc + curr.duration, 0)} 時間です</span>
        </div>

        <div style={{ position: 'relative', marginTop: '20px' }}>
          {/* Time Grid */}
          {hours.map(hour => (
            <div key={hour} style={{ display: 'flex', height: '60px' }}>
              {/* Time Label */}
              <div style={{ width: '60px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'right', paddingRight: '16px', position: 'relative', top: '-10px' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              {/* Grid Line */}
              <div style={{ flex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}></div>
            </div>
          ))}

          {/* Current Time Indicator Line */}
          {currentTime.getHours() >= 6 && (
            <div style={{
              position: 'absolute',
              top: `${(currentTime.getHours() - 6 + currentTime.getMinutes() / 60) * 60}px`,
              left: '60px',
              right: 0,
              height: '2px',
              backgroundColor: 'var(--danger)',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                left: '-6px',
                top: '-4px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)'
              }}></div>
            </div>
          )}

          {/* Task Blocks */}
          {tasks.map(task => (
            <div key={task.id} className="glass-card" style={{
              position: 'absolute',
              top: `${(task.start - 6) * 60 + 2}px`,
              left: '76px',
              right: '20px',
              height: `${task.duration * 60 - 4}px`,
              backgroundColor: task.isActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              borderLeft: `4px solid ${task.color}`,
              border: task.isActive ? `1px solid var(--accent-primary)` : undefined,
              borderLeftWidth: '4px',
              borderLeftStyle: 'solid',
              borderLeftColor: task.color,
              padding: '8px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              opacity: task.completed ? 0.6 : 1,
              zIndex: 5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    marginBottom: '4px'
                  }}>
                    {task.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>
                      {Math.floor(task.start).toString().padStart(2, '0')}:
                      {((task.start % 1) * 60).toString().padStart(2, '0')} 
                      - 
                      {Math.floor(task.start + task.duration).toString().padStart(2, '0')}:
                      {(((task.start + task.duration) % 1) * 60).toString().padStart(2, '0')}
                    </span>
                    <span style={{ color: task.color }}>{task.category}</span>
                  </div>
                </div>
                
                {task.isActive && (
                  <span className="pulse-dot" style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--accent-primary)',
                    marginTop: '4px'
                  }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
