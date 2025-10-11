"use client";

import Link from "next/link";
import { AiOutlineFileText } from "react-icons/ai";

export default function OCRCard() {
  return (
    <Link href="/app/ocr">
      <div className="bg-card md:aspect-square hover:!bg-accent cursor-pointer rounded-xl relative p-4 font-light">
        <h3 className="font-medium text-card-foreground mb-2">
          Document OCR Analysis
        </h3>
        <AiOutlineFileText className="absolute text-4xl bottom-2 right-2 rounded-full p-2 aspect-square bg-background text-foreground" />
      </div>
    </Link>
  );
}