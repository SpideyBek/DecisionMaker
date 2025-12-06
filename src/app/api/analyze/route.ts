import { NextRequest, NextResponse } from "next/server";

interface QAPair {
  question: string;
  answer: string;
}

const MODEL = "google/gemma-3-27b-it:free";

async function callAI(prompt: string, maxTokens = 500) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    }
  );
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
    const { decision, options, step, conversation = [] } = await request.json();

    if (!decision || !options || options.length < 2) {
      return NextResponse.json(
        { error: "Please provide a decision and at least 2 options" },
        { status: 400 }
      );
    }

    const totalQuestions = conversation.length;
    const maxQuestions = 10;

    if (step === "questions") {
      // Quick initial check - simple decisions get immediate answers
      const prompt = `Decision: "${decision}" between: ${options.join(" or ")}

Is this straightforward? If yes, give a clear recommendation (2-3 sentences, no bullets). If no, ask 3 short questions.

Reply ONLY in JSON:
{"answer": true, "choice": "Option Name", "reason": "Why this is best for you."} OR {"answer": false, "questions": ["Q1?", "Q2?", "Q3?"]}`;

      const content = await callAI(prompt, 300);

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.answer && result.choice) {
            return NextResponse.json({
              confident: true,
              choice: result.choice,
              reason: result.reason || "",
            });
          } else if (result.questions?.length > 0) {
            return NextResponse.json({
              questions: result.questions.slice(0, 4),
            });
          }
        }
      } catch {
        // Fallback questions
      }

      // Default questions if parsing fails
      return NextResponse.json({
        questions: [
          "What matters most to you in this decision?",
          "Are there any time constraints?",
          "What would make you regret choosing the wrong option?",
        ],
      });
    } else if (step === "evaluate") {
      const conversationText = conversation
        .map(
          (qa: QAPair, i: number) => `${i + 1}. ${qa.question} → ${qa.answer}`
        )
        .join("\n");

      // Force recommendation after enough questions
      if (totalQuestions >= maxQuestions || totalQuestions >= 6) {
        const prompt = `Decision: "${decision}" between: ${options.join(" or ")}

User's answers:
${conversationText}

Reply ONLY in JSON with the exact option name from the list:
{"choice": "Exact Option Name", "reason": "2-3 sentences explaining why based on their answers."}`;

        const content = await callAI(prompt, 200);
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
              confident: true,
              choice: result.choice,
              reason: result.reason,
            });
          }
        } catch {}
        return NextResponse.json({
          confident: true,
          choice: options[0],
          reason: content,
        });
      }

      // Combined evaluate + decide/ask in one call
      const previousQs = conversation
        .map((qa: QAPair) => qa.question)
        .join("; ");

      const prompt = `Decision: "${decision}" between: ${options.join(" or ")}

Answers so far:
${conversationText}

Can you confidently recommend now? If yes, give a clear recommendation (2-3 sentences, no bullets/headers). If no, ask 2 NEW questions (not: ${previousQs}).

Reply ONLY in JSON:
{"ready": true, "choice": "Exact Option Name", "reason": "Why this is best."} OR {"ready": false, "questions": ["New Q1?", "New Q2?"]}`;

      const content = await callAI(prompt, 300);

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          if (result.ready && result.choice) {
            return NextResponse.json({
              confident: true,
              choice: result.choice,
              reason: result.reason || "",
            });
          } else if (result.questions?.length > 0) {
            // Filter duplicates
            const prevLower = conversation.map((qa: QAPair) =>
              qa.question.toLowerCase()
            );
            const newQuestions = result.questions.filter((q: string) => {
              const qLower = q.toLowerCase();
              return !prevLower.some(
                (p: string) => similarity(p, qLower) > 0.6
              );
            });

            if (newQuestions.length > 0) {
              return NextResponse.json({
                confident: false,
                questions: newQuestions.slice(0, 3),
              });
            }
          }
        }
      } catch {
        // Fall through to recommendation
      }

      // Default: make recommendation
      const recPrompt = `Decision: "${decision}" between: ${options.join(
        " or "
      )}
Answers: ${conversationText}

Reply ONLY in JSON: {"choice": "Exact Option Name", "reason": "Why this is best."}`;

      const rec = await callAI(recPrompt, 150);
      try {
        const jsonMatch = rec.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            confident: true,
            choice: result.choice,
            reason: result.reason,
          });
        }
      } catch {}
      return NextResponse.json({
        confident: true,
        choice: options[0],
        reason: rec,
      });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("OpenRouter error:", error);
    return NextResponse.json(
      { error: "Failed to analyze decision" },
      { status: 500 }
    );
  }
}

function similarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(str2.split(/\s+/).filter((w) => w.length > 3));
  if (words1.size === 0 || words2.size === 0) return 0;
  let overlap = 0;
  words1.forEach((word) => {
    if (words2.has(word)) overlap++;
  });
  return overlap / Math.max(words1.size, words2.size);
}
