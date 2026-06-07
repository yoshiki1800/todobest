import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single();
      
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    const { error } = await supabase.from('push_subscriptions').insert([{
      endpoint: subscription.endpoint,
      keys: subscription.keys
    }]);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
