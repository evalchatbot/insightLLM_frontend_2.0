import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

type ExamType = "CSS" | "PMS";

function isExamType(value: string | null): value is ExamType {
  return value === "CSS" || value === "PMS";
}

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam")?.toUpperCase() ?? null;

  if (!isExamType(exam)) {
    return NextResponse.json(
      { success: false, message: "exam must be CSS or PMS." },
      { status: 400 }
    );
  }

  const { data: subjects, error } = await supabase
    .from("past_paper_subjects")
    .select(`
      id,
      exam_type,
      name,
      slug,
      subject_group,
      past_papers (
        id,
        year,
        title,
        public_url,
        file_path,
        file_size,
        created_at
      )
    `)
    .eq("exam_type", exam)
    .order("name", { ascending: true })
    .order("year", { referencedTable: "past_papers", ascending: false })
    .order("created_at", { referencedTable: "past_papers", ascending: false });

  if (error) {
    console.error("Failed to load past papers", error);
    return NextResponse.json(
      { success: false, message: "Unable to load past papers." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    subjects: subjects ?? [],
  });
}
