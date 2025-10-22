import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type MCQ = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  genre_id?: string;
};

const SAMPLE_MCQS: Record<string, MCQ[]> = {
  general: Array.from({ length: 24 }).map((_, i) => ({
    id: `g-${i}`,
    question: `Sample general question #${i + 1}`,
    option_a: `A${i + 1}`,
    option_b: `B${i + 1}`,
    option_c: `C${i + 1}`,
    option_d: `D${i + 1}`,
    correct_answer: `A${i + 1}`,
    genre_id: 'general',
  })),
};

const shuffle = <T,>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const genre_id = url.searchParams.get('genre_id') || 'general';
    const limit = Number(url.searchParams.get('limit') || '20');
    const random = url.searchParams.get('random') === 'true';

    // If the caller requests local sample data, use it even when a backend is configured
    const useLocal = url.searchParams.get('useLocal') === 'true' || url.searchParams.get('useLocal') === '1';

    // If a backend URL is configured and the caller did not request local data, proxy the request there
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backend && !useLocal) {
      const proxyUrl = `${backend.replace(/\/$/, '')}/quiz/mcqs?genre_id=${encodeURIComponent(genre_id)}&limit=${limit}&random=${random}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      // Ensure we return an array of MCQs and trim to requested limit
      const arr = Array.isArray(data) ? data.slice(0, limit) : [];
      return NextResponse.json(arr);
    }

    // If Supabase is configured, query the mcqs table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('mcqs')
        .select('*')
        .eq('genre_id', genre_id);

      if (error) {
        throw error;
      }

      let rows: MCQ[] = Array.isArray(data) ? (data as MCQ[]) : [];
      if (random) rows = shuffle(rows);
      rows = rows.slice(0, limit);
      return NextResponse.json(rows);
    }

    // Fallback: return sample data
    const sample = SAMPLE_MCQS[genre_id] || SAMPLE_MCQS['general'];
    const out = shuffle([...sample]).slice(0, limit);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch mcqs' }, { status: 500 });
  }
}
