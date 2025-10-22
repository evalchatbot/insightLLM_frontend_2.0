"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuizRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Replace the nested route with the canonical /quiz route
    router.replace("/quiz");
  }, [router]);

  return null;
}
