import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { title, body, url } = await request.json();

    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:your-email@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
    
    const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'ToDoBEST',
      body: body || '新しい通知があります！',
      icon: '/icons/icon-192x192.png'
    });

    const sendPromises = subscriptions.map(sub => 
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

    await Promise.all(sendPromises);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send notification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
