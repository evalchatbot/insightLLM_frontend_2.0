import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase with service role key for admin operations
// Note: We check env vars at runtime, not at module load time
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  
  return supabase;
}

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid messages" }, { status: 400 });
    }

    // Initialize OpenAI client at runtime (not at module load time)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "OpenAI API key not configured" }, { status: 500 });
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Get user's email from Clerk
    let userEmail: string | null = null;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      if (clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 0) {
        userEmail = clerkUser.emailAddresses[0].emailAddress;
      }
    } catch (e) {
      console.error('Failed to fetch Clerk user:', e);
      return NextResponse.json({ success: false, error: "Authentication error" }, { status: 401 });
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Email not found" }, { status: 400 });
    }

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Get Supabase user
    const { data: supUser, error: supUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (supUserError || !supUser) {
      console.error('Failed to find Supabase user:', supUserError);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Type assertion to ensure supUser has id property
    const supabaseUserId = (supUser as { id: string }).id;

    // Calculate input tokens (simple approximation: ~4 chars per token)
    const prompt = messages.map(m => m.content).join('\n');
    const inputTokens = Math.ceil(prompt.length / 4);

    // Record input tokens usage
    const { data: usageResult, error: usageError } = await supabase
      .rpc('record_usage', {
        p_user_id: supabaseUserId,
        p_input_tokens: inputTokens,
        p_output_tokens: 0
      } as any);

    if (usageError) {
      console.error('Failed to record input usage:', usageError);
      if (usageError.message.includes('limit exceeded')) {
        return NextResponse.json({ 
          success: false, 
          error: "Monthly token limit exceeded" 
        }, { status: 429 });
      }
      return NextResponse.json({ 
        success: false, 
        error: "Usage tracking failed" 
      }, { status: 500 });
    }

    // Create OpenAI completion with streaming
    let fullResponse = '';
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      })),
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          controller.enqueue(encoder.encode(content));
        }
        
        // Record output tokens after completion (simple approximation: ~4 chars per token)
        const outputTokens = Math.ceil(fullResponse.length / 4);
        
        // Update usage with output tokens
        const { error: outputUsageError } = await supabase
          .rpc('record_usage', {
            p_user_id: supabaseUserId,
            p_input_tokens: 0,
            p_output_tokens: outputTokens
          } as any);

        if (outputUsageError) {
          console.error('Failed to record output usage:', outputUsageError);
          controller.error(new Error(
            outputUsageError.message.includes('limit exceeded')
              ? "Monthly token limit exceeded"
              : "Failed to record usage"
          ));
          return;
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process chat"
    }, { status: 500 });
  }
}