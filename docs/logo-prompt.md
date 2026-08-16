# برومبت اللوجو — مدير المعلم

برومبت جاهز للاستخدام مع مولدات الصور بالذكاء الاصطناعي (Midjourney / DALL‑E /
Recraft / Ideogram). الاتجاه المختار: **أيقونة فقط + النيلي + قبعة تخرج مع دفتر**.

## البرومبت الأساسي (المقترح)

> Minimal app icon, flat vector style, on a rounded-square (squircle) badge
> with a smooth indigo gradient background (#4F46E5 → #6366F1 → #4338CA),
> subtle soft glow at top.
>
> Centered geometric mark combining a graduation cap and an open notebook:
> the mortarboard sits at a slight angle, its side edge flows into an open
> book/notebook below, and the cap's tassel curves down into a bold
> checkmark (✓) — implying attendance and completion.
>
> White/very-light indigo glyphs, flat shading with minimal highlights,
> generous negative space, crisp rounded corners, modern SaaS iconography,
> professional, clean, timeless.
>
> No text, no letters, no watermark. Perfectly legible at 16px favicon and
> 512px icon.

## البرومبت البديل (بدون خلفية)

> Flat minimal vector logo mark only, no background, no badge: a graduation
> cap flowing into an open notebook, tassel curving into a checkmark, solid
> deep indigo (#4338CA) glyph with a single #4F46E5 accent, clean geometric
> lines, rounded terminals, generous negative space, no text, scalable from
> 16px to 512px.

## إعدادات موصى بها عند التوليد

| الأداة    | الإعداد                                            |
| --------- | -------------------------------------------------- |
| Midjourney| `--ar 1:1 --v 6 --style raw` أو `--v 7`، ثم ارفع الجودة بـ `--upbeta` |
| DALL‑E / GPT‑4o | الصق البرومبت كما هو، اطلب "SVG-style, flat" |
| Recraft / Iconify | اختر preset "App icon / minimal"             |
| بعد الاختيار | نظّف النتيجة بحذف الخلفية وأعد تصديرها إلى `public/logo.png` (1024×1024) و `src-tauri/icons/` |

## لماذا هذا التصميم؟

- **قبعة + دفتر** = التعليم + الإدارة، يغطي الطلاب/الامتحانات/الحصص.
- **التسيلة كعلامة صح (✓)** = لمسة ذكية توحي بالحضور والإنجاز — وهي أبرز ميزة في البرنامج.
- **النيلي المتدرج** = مطابقة تامة لهوية `--primary` الحالية في
  `src/styles/globals.css` (oklch 0.5 0.17 262) حتى لا ينفصل اللوجو عن الواجهة.
- **مربع بزوايا دائرية** = يطابق «badge» السايدبار الحالي (`rounded-xl` + gradient).
- **بسيط ومسطّح** = ينجح في أي حجم، من الفافيكون 16px لأيقونة 512px.
