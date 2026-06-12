import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

type ExamType = "CSS" | "PMS";

type SubjectRow = {
  id: string;
  exam_type: ExamType;
  name: string;
  slug: string;
  subject_group: "compulsory" | "optional";
};

type QuestionRow = {
  id: string;
  subject_id: string;
  exam_type: ExamType;
  year: number;
  question_number: string;
  question_text: string;
  answer_text: string;
  marks: number | null;
  display_order: number;
  created_at: string;
};

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

  const { data: subjects, error: subjectsError } = await supabase
    .from("past_paper_subjects")
    .select("id, exam_type, name, slug, subject_group")
    .eq("exam_type", exam)
    .order("name", { ascending: true });

  if (subjectsError) {
    console.error("Failed to load past paper subjects", subjectsError);
    return NextResponse.json(
      { success: false, message: "Unable to load past paper subjects." },
      { status: 500 }
    );
  }

  const subjectRows = (subjects ?? []) as SubjectRow[];
  const subjectIds = subjectRows.map((subject) => subject.id);
  let questions: QuestionRow[] = [];

  if (subjectIds.length > 0) {
    const { data: questionRows, error: questionsError } = await supabase
      .from("past_paper_questions")
      .select(`
        id,
        subject_id,
        exam_type,
        year,
        question_number,
        question_text,
        answer_text,
        marks,
        display_order,
        created_at
      `)
      .eq("exam_type", exam)
      .in("subject_id", subjectIds)
      .order("year", { ascending: false })
      .order("display_order", { ascending: true })
      .order("question_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (questionsError) {
      console.error("Failed to load past paper questions", questionsError);
      return NextResponse.json(
        { success: false, message: "Unable to load past paper questions." },
        { status: 500 }
      );
    }

    questions = (questionRows ?? []) as QuestionRow[];
  }

  const questionsBySubject = questions.reduce<Record<string, QuestionRow[]>>((acc, question) => {
    if (!acc[question.subject_id]) {
      acc[question.subject_id] = [];
    }
    acc[question.subject_id].push(question);
    return acc;
  }, {});

  return NextResponse.json({
    success: true,
    subjects: subjectRows.map((subject) => ({
      ...subject,
      past_paper_questions: questionsBySubject[subject.id] ?? [],
    })),
  });
}
