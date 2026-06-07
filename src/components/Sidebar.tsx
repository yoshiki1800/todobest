"use client";

import Link from "next/link";
import { 
  CheckCircle, 
  CalendarDays, 
  Clock, 
  Settings, 
  BarChart3,
  ListTodo
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="glass-panel" style={{ 
      width: '260px', 
      height: 'calc(100vh - 40px)', 
      margin: '20px',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0'
    }}>
      <div style={{ padding: '0 24px', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <CheckCircle size={28} color="var(--accent-primary)" />
          ToDoBEST
        </h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
        <NavItem href="/" icon={<ListTodo size={20} />} label="タスク一覧" active />
        <NavItem href="/timeline" icon={<Clock size={20} />} label="タイムライン" />
        <NavItem href="/calendar" icon={<CalendarDays size={20} />} label="カレンダー" />
        <NavItem href="/reports" icon={<BarChart3 size={20} />} label="実績レポート" />
      </nav>

      <div style={{ padding: '0 16px', marginTop: 'auto' }}>
        <NavItem href="/settings" icon={<Settings size={20} />} label="設定" />
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      color: active ? '#fff' : 'var(--text-secondary)',
      background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      transition: 'all 0.2s',
      fontWeight: active ? 600 : 500,
      textDecoration: 'none'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }
    }}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
