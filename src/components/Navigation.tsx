"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle, CalendarDays, KanbanSquare, BarChart2, Settings } from "lucide-react";
import styles from "./Navigation.module.css";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "今日", href: "/", icon: <CheckCircle size={24} /> },
    { name: "カレンダー", href: "/calendar", icon: <CalendarDays size={24} /> },
    { name: "カンバン", href: "/kanban", icon: <KanbanSquare size={24} /> },
    { name: "レポート", href: "/reports", icon: <BarChart2 size={24} /> },
    { name: "設定", href: "/settings", icon: <Settings size={24} /> },
  ];

  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav className={styles.mobileNav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className={`${styles.navItem} ${isActive ? styles.active : ""}`}>
              {item.icon}
              <span className={styles.navLabel}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar (Optional enhancement for later) */}
      <aside className={styles.desktopNav}>
        <div className={styles.sidebarHeader}>
          <CheckCircle size={28} color="var(--accent-blue)" />
          <h1 className={styles.sidebarTitle}>ToDoBEST</h1>
        </div>
        <div className={styles.navContainer}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className={`${styles.desktopNavItem} ${isActive ? styles.desktopActive : ""}`}>
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
