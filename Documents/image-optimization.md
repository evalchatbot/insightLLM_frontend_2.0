Recommendation: Image optimization and Next.js Image usage

Why
- Large PNG/JPGs increase page weight. Convert to WebP or AVIF for better compression (lossless if you need perfect fidelity).
- Use Next.js <Image> to benefit from automatic responsive sizes, lazy loading, and priority/LCP handling.

Assets to convert (in public/assets)
- gemini-banner.png -> gemini-banner.webp (or .avif)
- gemini-features.png -> gemini-features.webp
- gemini-phone-banner.png -> gemini-phone-banner.webp
- readme-banner.png -> readme-banner.webp
- public/assets/projects-img/*.png -> public/assets/projects-img/*.webp

Notes on conversion (outside codebase)
- Use an image tool (avif/mozjpeg/webp) or an online converter.
- For lossless conversion (no quality loss): use cwebp with -lossless or avifenc with lossless options.
- Example (install libwebp on mac/linux):
  cwebp -lossless public/assets/gemini-banner.png -o public/assets/gemini-banner.webp

Next.js <Image> usage examples

// Critical LCP image (hero/banner)
import Image from "next/image";

<Image
  src="/assets/gemini-banner.webp"
  alt="Banner"
  width={1600}
  height={900}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>

// Non-critical images (default lazy)
<Image
  src="/assets/projects-img/1.webp"
  alt="Project"
  width={600}
  height={400}
  sizes="(max-width: 768px) 100vw, 600px"
/>

Tips
- Only mark one image as priority (the main LCP image).
- Keep other images lazy (default) and provide proper width/height and sizes to reduce CLS.
- If you host images on an external CDN, configure next.config.js accordingly.

Verification
- After converting assets, run a local production build and check Lighthouse/Chrome DevTools for LCP and image savings.

