"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Layers, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; parent_id: string | null }[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#f97316");
  const [newCatParent, setNewCatParent] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (data) setCategories(data);
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const parentId = newCatParent === "" ? null : newCatParent;
    
    await supabase.from('categories').insert([{
      name: newCatName,
      color: newCatColor,
      parent_id: parentId
    }]);
    
    setNewCatName("");
    setNewCatParent("");
    fetchCategories();
  }

  async function deleteCategory(id: string) {
    if (!confirm("このカテゴリを削除しますか？紐づく子カテゴリも削除されます。")) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  }

  async function subscribeToNotifications() {
    setIsSubscribing(true);
    try {
      if (!('serviceWorker' in navigator)) {
        alert("お使いのブラウザは通知に対応していません。");
        setIsSubscribing(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("通知が許可されませんでした。");
        setIsSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const response = await fetch('/api/push/subscribe');
      const { publicKey } = await response.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      alert("通知の設定が完了しました！\n「テスト通知を送信」ボタンを押して届くか確認してください。");
    } catch (e) {
      console.error(e);
      alert("通知の設定に失敗しました。");
    }
    setIsSubscribing(false);
  }

  async function sendTestNotification() {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'ToDoBEST', body: 'テスト通知です！正常に届いています。' })
      });
      if (res.ok) {
        alert("テスト通知を送信しました。");
      } else {
        alert("送信に失敗しました。");
      }
    } catch (e) {
      alert("エラーが発生しました。");
    }
  }

  const parentCats = categories.filter(c => !c.parent_id);
  const childCats = categories.filter(c => c.parent_id);

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon color="var(--text-secondary)" /> 設定
        </h2>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--accent-purple)" /> プッシュ通知
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            タスクの予定時刻に通知を受け取ることができます。スマートフォンで「ホーム画面に追加」してから設定することをおすすめします。
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={subscribeToNotifications} 
              disabled={isSubscribing}
            >
              {isSubscribing ? "設定中..." : "通知をオンにする"}
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={sendTestNotification} 
              style={{ border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)' }}
            >
              テスト通知を送信
            </button>
          </div>
        </section>

        <section className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--accent-blue)" /> カテゴリ管理
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {parentCats.map(parent => (
              <div key={parent.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: parent.color }}></span>
                    {parent.name}
                  </div>
                  <button onClick={() => deleteCategory(parent.id)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                </div>
                
                <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {childCats.filter(c => c.parent_id === parent.id).map(child => (
                    <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>└ {child.name}</span>
                      <button onClick={() => deleteCategory(child.id)} className="btn btn-ghost" style={{ padding: '2px', color: 'var(--danger)' }}><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>新しいカテゴリを追加</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>カテゴリ名</label>
                <input type="text" className="input-field" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              </div>
              <div style={{ width: '80px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>カラー</label>
                <input type="color" className="input-field" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} style={{ padding: '0.25rem', height: '42px' }} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>親カテゴリ (大分類)</label>
                <select className="input-field" value={newCatParent} onChange={e => setNewCatParent(e.target.value)}>
                  <option value="">なし（大分類として追加）</option>
                  {parentCats.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={addCategory} disabled={!newCatName.trim()}><Plus size={18}/> 追加</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
