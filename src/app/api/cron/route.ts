import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:your-email@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    const now = new Date();
    // 日本時間(UTC+9)に合わせて処理する場合、Vercelのサーバー時間はUTCの可能性がありますが、
    // Dateオブジェクトを使わずDBに保存されたISO文字列（JSTで登録されている）を元に現在時刻と比較します
    
    // DBからタスクを取得
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'done');

    if (tasksError) throw tasksError;

    // 1分前〜現在時刻までの間に開始予定のタスクを抽出
    const startingTasks = tasks.filter(task => {
      if (!task.planned_start_time) return false;
      const plannedTime = new Date(task.planned_start_time);
      
      // 同じ日かチェック
      if (plannedTime.getFullYear() !== now.getFullYear() || 
          plannedTime.getMonth() !== now.getMonth() || 
          plannedTime.getDate() !== now.getDate()) {
        return false;
      }
      
      // 時間と分が一致するかチェック
      return plannedTime.getHours() === now.getHours() && plannedTime.getMinutes() === now.getMinutes();
    });

    if (startingTasks.length === 0) {
      return NextResponse.json({ success: true, message: 'No tasks starting right now' });
    }

    const { data: subscriptions, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'Tasks found, but no subscriptions' });
    }

    const promises = [];
    for (const task of startingTasks) {
      const payload = JSON.stringify({
        title: '時間です！',
        body: `「${task.title}」の予定時刻になりました。`,
        icon: '/icons/icon-192x192.png'
      });

      for (const sub of subscriptions) {
        promises.push(
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          ).catch((e: any) => {
            console.error("Error sending to endpoint:", sub.endpoint, e);
            if (e.statusCode === 410 || e.statusCode === 404) {
              supabase.from('push_subscriptions').delete().eq('id', sub.id).then();
            }
          })
        );
      }
    }

    await Promise.all(promises);
    return NextResponse.json({ success: true, notifiedTasks: startingTasks.length });

  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
