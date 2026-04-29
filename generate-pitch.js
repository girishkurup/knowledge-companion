const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "Knowledge Companion Pitch";
pres.author = "Girish Kurup";

// Colors (no # prefix)
const BG = "111827";
const BLUE = "2563EB";
const WHITE = "FFFFFF";
const GRAY = "9CA3AF";
const CARD_BG = "1F2937";
const BLUE_LIGHT = "3B82F6";

// Slide dimensions: 10" x 5.625"
const W = 10;
const H = 5.625;

// Helper: slide number bottom-right
function addSlideNum(slide, num) {
  slide.addText(String(num), {
    x: 9.4, y: 5.2, w: 0.4, h: 0.3,
    fontSize: 9, color: "4B5563", align: "right", fontFace: "Calibri"
  });
}

// ─── SLIDE 1: TITLE ───────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  // Blue accent bar left
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  // Brain emoji circle
  slide.addShape(pres.shapes.OVAL, {
    x: 4.25, y: 0.6, w: 1.5, h: 1.5,
    fill: { color: CARD_BG }, line: { color: BLUE, width: 2 }
  });
  slide.addText("🧠", {
    x: 4.25, y: 0.62, w: 1.5, h: 1.5,
    fontSize: 40, align: "center", valign: "middle"
  });

  // Main title
  slide.addText("Knowledge Companion", {
    x: 0.5, y: 2.3, w: 9, h: 1.0,
    fontSize: 52, bold: true, color: WHITE, align: "center",
    fontFace: "Calibri", margin: 0
  });

  // Tagline
  slide.addText("Your Digital Twin Expert", {
    x: 0.5, y: 3.35, w: 9, h: 0.55,
    fontSize: 26, color: BLUE, align: "center",
    fontFace: "Calibri", bold: false, margin: 0
  });

  // Author
  slide.addText("Girish Kurup  ·  AI Architect", {
    x: 0.5, y: 4.9, w: 9, h: 0.4,
    fontSize: 14, color: GRAY, align: "center",
    fontFace: "Calibri", charSpacing: 2
  });

  addSlideNum(slide, 1);
}

// ─── SLIDE 2: THE PROBLEM ─────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  // Label
  slide.addText("THE PROBLEM", {
    x: 0.5, y: 0.45, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  // Main headline
  slide.addText("Every knowledge interview\nneeds a human expert in the room.", {
    x: 0.5, y: 1.05, w: 9, h: 2.5,
    fontSize: 40, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.2
  });

  // Divider
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.7, w: 1.2, h: 0.05,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  // Sub text
  slide.addText("Scheduling.  Inconsistency.  No structured output.  Doesn't scale.", {
    x: 0.5, y: 3.9, w: 9, h: 0.55,
    fontSize: 20, color: GRAY, align: "left",
    fontFace: "Calibri"
  });

  addSlideNum(slide, 2);
}

// ─── SLIDE 3: THE COST ────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("THE COST", {
    x: 0.5, y: 0.45, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  // Big stat
  slide.addText("1 expert.  1 conversation.  1 memory.", {
    x: 0.5, y: 1.1, w: 9, h: 1.4,
    fontSize: 42, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri"
  });

  // 4 pain points in a row
  const pains = ["HR Screening", "CXO Debriefs", "Architecture Reviews", "Lessons Learned"];
  pains.forEach((p, i) => {
    const x = 0.5 + i * 2.3;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.8, w: 2.1, h: 1.5,
      fill: { color: CARD_BG }, line: { color: "374151", width: 1 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.8, w: 2.1, h: 0.06,
      fill: { color: BLUE }, line: { color: BLUE }
    });
    slide.addText(p, {
      x: x + 0.1, y: 2.95, w: 1.9, h: 1.2,
      fontSize: 16, color: WHITE, align: "left",
      fontFace: "Calibri", bold: true, valign: "middle"
    });
  });

  slide.addText("All bottlenecked by human availability.", {
    x: 0.5, y: 4.55, w: 9, h: 0.4,
    fontSize: 16, color: GRAY, align: "left",
    fontFace: "Calibri", italic: true
  });

  addSlideNum(slide, 3);
}

// ─── SLIDE 4: THE SOLUTION ────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("THE SOLUTION", {
    x: 0.5, y: 0.45, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  slide.addText("Knowledge Companion\nconducts the interview.", {
    x: 0.5, y: 1.05, w: 9, h: 2.3,
    fontSize: 46, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.15
  });

  // Blue highlight box
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.5, w: 8.5, h: 1.4,
    fill: { color: "1E3A5F" }, line: { color: BLUE, width: 1 }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.5, w: 0.06, h: 1.4,
    fill: { color: BLUE }, line: { color: BLUE }
  });
  slide.addText("Admin sends a link.  AI does the rest.  No human needed.", {
    x: 0.7, y: 3.55, w: 8.1, h: 1.3,
    fontSize: 24, color: WHITE, align: "left",
    fontFace: "Calibri", valign: "middle", bold: true
  });

  addSlideNum(slide, 4);
}

// ─── SLIDE 5: HOW IT WORKS ────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("HOW IT WORKS", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  const steps = [
    { num: "01", title: "Admin registers", desc: "Sets topic, depth & duration. Adds candidate." },
    { num: "02", title: "Email invite sent", desc: "Candidate receives a unique secure link." },
    { num: "03", title: "AI interviews", desc: "Companion agent conducts the full chat interview." },
    { num: "04", title: "PDF report ready", desc: "Structured output generated the moment it ends." },
  ];

  steps.forEach((s, i) => {
    const x = 0.3 + i * 2.4;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 0.95, w: 2.2, h: 4.2,
      fill: { color: CARD_BG }, line: { color: "374151", width: 1 }
    });
    // Top blue accent
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 0.95, w: 2.2, h: 0.06,
      fill: { color: BLUE }, line: { color: BLUE }
    });
    // Number
    slide.addText(s.num, {
      x: x + 0.1, y: 1.1, w: 2.0, h: 0.8,
      fontSize: 36, bold: true, color: BLUE, align: "left",
      fontFace: "Calibri"
    });
    // Title
    slide.addText(s.title, {
      x: x + 0.1, y: 2.0, w: 2.0, h: 0.65,
      fontSize: 17, bold: true, color: WHITE, align: "left",
      fontFace: "Calibri"
    });
    // Desc
    slide.addText(s.desc, {
      x: x + 0.1, y: 2.7, w: 2.0, h: 1.8,
      fontSize: 13, color: GRAY, align: "left",
      fontFace: "Calibri", lineSpacingMultiple: 1.3
    });

    // Arrow between cards
    if (i < 3) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: x + 2.22, y: 2.8, w: 0.18, h: 0.04,
        fill: { color: BLUE }, line: { color: BLUE }
      });
    }
  });

  addSlideNum(slide, 5);
}

// ─── SLIDE 6: THE 4 AI AGENTS ─────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("4 AI AGENTS", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  const agents = [
    { icon: "💬", title: "Companion Agent", desc: "Conducts the interview. Streams responses in real time. Adapts to depth level." },
    { icon: "❓", title: "Question Bank", desc: "Generates role-specific questions automatically before the interview starts." },
    { icon: "🗺️", title: "Knowledge Graph", desc: "Maps concepts, confidence scores, and gaps from every exchange." },
    { icon: "📄", title: "Report Agent", desc: "Produces Assessment, Gap Analysis, and Knowledge PDFs on demand." },
  ];

  const positions = [
    { x: 0.3, y: 0.9 }, { x: 5.15, y: 0.9 },
    { x: 0.3, y: 3.1 }, { x: 5.15, y: 3.1 }
  ];

  agents.forEach((a, i) => {
    const { x, y } = positions[i];
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.6, h: 1.95,
      fill: { color: CARD_BG }, line: { color: "374151", width: 1 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.95,
      fill: { color: BLUE }, line: { color: BLUE }
    });
    slide.addText(a.icon + "  " + a.title, {
      x: x + 0.2, y: y + 0.18, w: 4.2, h: 0.5,
      fontSize: 18, bold: true, color: WHITE, align: "left",
      fontFace: "Calibri"
    });
    slide.addText(a.desc, {
      x: x + 0.2, y: y + 0.72, w: 4.2, h: 1.0,
      fontSize: 14, color: GRAY, align: "left",
      fontFace: "Calibri", lineSpacingMultiple: 1.25
    });
  });

  addSlideNum(slide, 6);
}

// ─── SLIDE 7: USE CASES ───────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("USE CASES", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  slide.addText("Any situation where a human expert currently interviews someone.", {
    x: 0.5, y: 0.85, w: 9, h: 0.7,
    fontSize: 24, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri"
  });

  const cases = [
    { icon: "👥", label: "HR Screening" },
    { icon: "🏢", label: "CXO Knowledge Capture" },
    { icon: "🏗️", label: "Architecture Assessment" },
    { icon: "💻", label: "Tech Team Skills Audit" },
    { icon: "🧓", label: "Expert Knowledge Capture" },
    { icon: "📋", label: "Lessons Learned" },
  ];

  const cols = 3;
  cases.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.3 + col * 3.22;
    const y = 1.75 + row * 1.6;

    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.0, h: 1.35,
      fill: { color: CARD_BG }, line: { color: "374151", width: 1 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.0, h: 0.06,
      fill: { color: BLUE }, line: { color: BLUE }
    });
    slide.addText(c.icon + "  " + c.label, {
      x: x + 0.15, y: y + 0.25, w: 2.7, h: 0.85,
      fontSize: 16, bold: true, color: WHITE, align: "left",
      fontFace: "Calibri", valign: "middle"
    });
  });

  addSlideNum(slide, 7);
}

// ─── SLIDE 8: THE INSIGHT ─────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: "0D1117" };

  // Large quote marks
  slide.addText("“", {
    x: 0.3, y: 0.1, w: 1.5, h: 1.5,
    fontSize: 120, color: BLUE, align: "left",
    fontFace: "Georgia", bold: true
  });

  slide.addText("Human experts should\nreview reports —\nnot conduct interviews.", {
    x: 0.8, y: 0.9, w: 8.4, h: 3.5,
    fontSize: 44, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.25
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 4.55, w: 2.2, h: 0.06,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("— Girish Kurup, Knowledge Companion", {
    x: 0.8, y: 4.75, w: 8, h: 0.4,
    fontSize: 14, color: GRAY, align: "left",
    fontFace: "Calibri", italic: true
  });

  addSlideNum(slide, 8);
}

// ─── SLIDE 9: WHY NOW ─────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("WHY NOW", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  slide.addText("AI can now hold\nexpert-level conversations.", {
    x: 0.5, y: 1.0, w: 9, h: 2.2,
    fontSize: 46, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.2
  });

  // 3 capability chips
  const chips = ["Any topic", "Any depth level", "Any duration"];
  chips.forEach((chip, i) => {
    const x = 0.5 + i * 3.1;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.4, w: 2.8, h: 0.65,
      fill: { color: "1E3A5F" }, line: { color: BLUE, width: 1 }
    });
    slide.addText("✓  " + chip, {
      x: x + 0.1, y: 3.42, w: 2.6, h: 0.6,
      fontSize: 17, color: WHITE, align: "left",
      fontFace: "Calibri", valign: "middle", bold: true
    });
  });

  slide.addText("Powered by Claude (Anthropic) — adaptive, domain-expert questioning at beginner to expert depth.", {
    x: 0.5, y: 4.3, w: 9, h: 0.8,
    fontSize: 15, color: GRAY, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.3
  });

  addSlideNum(slide, 9);
}

// ─── SLIDE 10: TRACTION ───────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("TRACTION", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  slide.addText("Live. Deployed.\nReady to pilot.", {
    x: 0.5, y: 0.9, w: 9, h: 2.0,
    fontSize: 50, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.2
  });

  const items = [
    { icon: "✅", text: "Full platform built on Next.js + Claude AI" },
    { icon: "✅", text: "Knowledge graph + PDF reports working end to end" },
    { icon: "✅", text: "Live on the internet — demo available now" },
  ];

  items.forEach((item, i) => {
    const y = 3.1 + i * 0.72;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 8.8, h: 0.6,
      fill: { color: CARD_BG }, line: { color: "374151", width: 1 }
    });
    slide.addText(item.icon + "  " + item.text, {
      x: 0.7, y: y + 0.05, w: 8.4, h: 0.5,
      fontSize: 16, color: WHITE, align: "left",
      fontFace: "Calibri", valign: "middle"
    });
  });

  addSlideNum(slide, 10);
}

// ─── SLIDE 11: THE ASK ────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: BG };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  slide.addText("THE ASK", {
    x: 0.5, y: 0.35, w: 9, h: 0.35,
    fontSize: 12, color: BLUE, align: "left",
    fontFace: "Calibri", bold: true, charSpacing: 4
  });

  slide.addText("Run a pilot with us.", {
    x: 0.5, y: 1.0, w: 9, h: 1.5,
    fontSize: 56, bold: true, color: WHITE, align: "left",
    fontFace: "Calibri"
  });

  slide.addText("Bring your real use case.\nWe'll run it together and measure the outcome.", {
    x: 0.5, y: 2.6, w: 9, h: 1.2,
    fontSize: 24, color: GRAY, align: "left",
    fontFace: "Calibri", lineSpacingMultiple: 1.4
  });

  // CTA box
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.1, w: 4.5, h: 0.9,
    fill: { color: BLUE }, line: { color: BLUE }
  });
  slide.addText("🗓  20-minute live demo available", {
    x: 0.5, y: 4.1, w: 4.5, h: 0.9,
    fontSize: 18, bold: true, color: WHITE, align: "center",
    fontFace: "Calibri", valign: "middle"
  });

  slide.addText("Seeking 3–5 pilot partners", {
    x: 5.2, y: 4.2, w: 4.5, h: 0.7,
    fontSize: 16, color: GRAY, align: "left",
    fontFace: "Calibri", valign: "middle", italic: true
  });

  addSlideNum(slide, 11);
}

// ─── SLIDE 12: CLOSE / CONTACT ────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: "0D1117" };

  // Full-width blue top bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.1,
    fill: { color: BLUE }, line: { color: BLUE }
  });

  // Brain emoji
  slide.addShape(pres.shapes.OVAL, {
    x: 4.25, y: 0.5, w: 1.5, h: 1.5,
    fill: { color: CARD_BG }, line: { color: BLUE, width: 2 }
  });
  slide.addText("🧠", {
    x: 4.25, y: 0.52, w: 1.5, h: 1.5,
    fontSize: 40, align: "center", valign: "middle"
  });

  slide.addText("Knowledge Companion", {
    x: 0.5, y: 2.15, w: 9, h: 0.9,
    fontSize: 44, bold: true, color: WHITE, align: "center",
    fontFace: "Calibri"
  });

  slide.addText("Digital Twin Expert for structured knowledge interviews", {
    x: 0.5, y: 3.1, w: 9, h: 0.55,
    fontSize: 20, color: BLUE, align: "center",
    fontFace: "Calibri"
  });

  // Contact divider
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 3.5, y: 3.85, w: 3.0, h: 0.04,
    fill: { color: "374151" }, line: { color: "374151" }
  });

  slide.addText([
    { text: "girishkurup21@gmail.com", options: { color: WHITE } },
    { text: "     ·     ", options: { color: GRAY } },
    { text: "github.com/girishkurup/knowledge-companion", options: { color: BLUE } }
  ], {
    x: 0.5, y: 4.1, w: 9, h: 0.5,
    fontSize: 14, align: "center", fontFace: "Calibri"
  });

  addSlideNum(slide, 12);
}

// ─── WRITE FILE ───────────────────────────────────────────────────────────────
const outPath = "C:\\Users\\giris_i001\\Desktop\\voiceinterviewapp\\Knowledge-Companion-Pitch.pptx";
pres.writeFile({ fileName: outPath })
  .then(() => console.log("✅ Saved: " + outPath))
  .catch(err => console.error("❌ Error:", err));
