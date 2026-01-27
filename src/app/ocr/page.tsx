import { redirect } from "next/navigation";

export default function OCRRootRedirect() {
  // Ensure that `/ocr` (used in browser/navigation) resolves to the actual app route.
  redirect("/app/ocr");
}

