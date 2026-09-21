import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { countPdfPages } from "@/utils/pdf-utils";

describe("cn (clsx + tailwind-merge)", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("px-2", false, null, undefined, 0 as any, "font-bold")).toBe("px-2 font-bold");
  });

  it("supports arrays and object syntax", () => {
    expect(cn(["a", ["b"]], { c: true, d: false })).toBe("a b c");
  });

  it("lets later Tailwind utilities win over conflicting earlier ones", () => {
    expect(cn("p-2 text-red-500", "p-4", "text-blue-600")).toBe("p-4 text-blue-600");
    expect(cn("px-2 py-1", "p-3")).toBe("p-3");
  });

  it("keeps non-conflicting utilities and variants", () => {
    expect(cn("hover:bg-red-500", "bg-red-500", "dark:bg-black")).toBe("hover:bg-red-500 bg-red-500 dark:bg-black");
  });
});

describe("countPdfPages", () => {
  const buf = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

  it("reads the page tree /Count", async () => {
    await expect(countPdfPages(buf("%PDF-1.4\n1 0 obj << /Type /Pages /Count 7 /Kids [] >>"))).resolves.toBe(7);
  });

  it("falls back to counting /Type /Page objects (not /Pages)", async () => {
    const pdf = "<< /Type /Pages >>\n<< /Type /Page /Parent 1 >>\n<< /Type/Page\n>>";
    await expect(countPdfPages(buf(pdf))).resolves.toBe(2);
  });

  it("assumes a single page when nothing can be detected", async () => {
    await expect(countPdfPages(buf("not a pdf"))).resolves.toBe(1);
    await expect(countPdfPages(new ArrayBuffer(0))).resolves.toBe(1);
  });
});
