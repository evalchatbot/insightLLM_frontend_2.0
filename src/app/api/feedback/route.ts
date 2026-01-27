import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      user_id,
      user_email,
      page_url,
      feedback_type,
      subject,
      message,
      rating,
      user_agent,
    } = body;

    // Validate required fields
    if (!page_url || !feedback_type || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate feedback_type
    const validTypes = ["bug", "feature", "improvement", "general"];
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== null && rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
    }

    // Insert feedback into Supabase
    const { data, error } = await supabase
      .from("feedback")
      .insert([
        {
          user_id: user_id || null,
          user_email: user_email || null,
          page_url,
          feedback_type,
          subject: subject.trim(),
          message: message.trim(),
          rating: rating || null,
          user_agent: user_agent || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save feedback", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Feedback submitted successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in feedback API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve user's own feedback
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in feedback GET API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
