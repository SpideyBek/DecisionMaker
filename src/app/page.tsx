"use client";

import { useState } from "react";

type Step = "input" | "questions" | "result";

interface QAPair {
  question: string;
  answer: string;
}

export default function Home() {
  const [decision, setDecision] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [conversation, setConversation] = useState<QAPair[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [questionStartIndex, setQuestionStartIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...currentAnswers];
    newAnswers[index] = value;
    setCurrentAnswers(newAnswers);
  };

  const getQuestions = async () => {
    setIsLoading(true);

    try {
      const validOptions = options.filter((o) => o.trim());
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          options: validOptions,
          step: "questions",
        }),
      });

      const data = await response.json();
      if (data.error) {
        setChoice(null);
        setReason(`Error: ${data.error}`);
        setStep("result");
      } else if (data.confident) {
        // AI can answer immediately without questions
        setChoice(data.choice);
        setReason(data.reason);
        setStep("result");
      } else {
        setCurrentQuestions(data.questions);
        setCurrentAnswers(new Array(data.questions.length).fill(""));
        setQuestionStartIndex(0);
        setStep("questions");
      }
    } catch {
      setChoice(null);
      setReason("Failed to connect to AI service. Please try again.");
      setStep("result");
    }

    setIsLoading(false);
  };

  const submitAnswers = async () => {
    setIsLoading(true);

    // Build updated conversation for API call (but don't update state yet)
    const newPairs = currentQuestions.map((q, i) => ({
      question: q,
      answer: currentAnswers[i],
    }));
    const updatedConversation = [...conversation, ...newPairs];

    try {
      const validOptions = options.filter((o) => o.trim());
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          options: validOptions,
          step: "evaluate",
          conversation: updatedConversation,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setConversation(updatedConversation);
        setChoice(null);
        setReason(`Error: ${data.error}`);
        setStep("result");
      } else if (data.confident) {
        // AI is confident, show recommendation
        setConversation(updatedConversation);
        setChoice(data.choice);
        setReason(data.reason);
        setStep("result");
      } else {
        // AI needs more info - NOW update conversation and show new questions
        setConversation(updatedConversation);
        setQuestionStartIndex(updatedConversation.length);
        setCurrentQuestions(data.questions);
        setCurrentAnswers(new Array(data.questions.length).fill(""));
      }
    } catch {
      setConversation(updatedConversation);
      setChoice(null);
      setReason("Failed to connect to AI service. Please try again.");
      setStep("result");
    }

    setIsLoading(false);
  };

  const startOver = () => {
    setStep("input");
    setDecision("");
    setOptions(["", ""]);
    setConversation([]);
    setCurrentQuestions([]);
    setCurrentAnswers([]);
    setQuestionStartIndex(0);
    setChoice(null);
    setReason(null);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight">
              Decision<span className="text-emerald-500">AI</span>
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Stop overthinking. Let AI help you weigh your options and make
            confident decisions.
          </p>
        </header>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
            {/* Step 1: Input */}
            {step === "input" && (
              <>
                {/* Decision Input */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-black mb-3">
                    What decision are you trying to make?
                  </label>
                  <input
                    type="text"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder="e.g., Should I change careers?"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Options */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-black mb-3">
                    Your options
                  </label>
                  <div className="flex flex-wrap gap-5">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex-1 min-w-[200px] flex gap-3"
                      >
                        <div className="flex-shrink-0 w-8 h-12 flex items-center justify-center text-emerald-500 font-semibold">
                          {index + 1}.
                        </div>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addOption}
                    className="mt-4 flex items-center gap-2 text-emerald-500 hover:text-emerald-600 transition-colors text-sm font-medium"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add another option
                  </button>
                </div>

                {/* Get Questions Button */}
                <button
                  onClick={() => getQuestions()}
                  disabled={
                    !decision.trim() ||
                    options.filter((o) => o.trim()).length < 2 ||
                    isLoading
                  }
                  className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg
                        className="animate-spin w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating questions...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              </>
            )}

            {/* Step 2: Questions */}
            {step === "questions" && (
              <>
                {/* Thinking overlay - shows while processing but keeps answers visible */}
                {isLoading && (
                  <div className="mb-6 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <svg
                          className="animate-spin w-8 h-8 text-emerald-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-emerald-600 font-semibold">
                          AI is thinking...
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Analyzing your responses to provide the best
                          recommendation
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-black mb-2">
                      Help us understand your priorities
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {conversation.length === 0
                        ? "Answer these questions so we can give you a personalized recommendation."
                        : "We need a bit more information to give you the best recommendation."}
                    </p>
                  </div>
                )}

                {/* Previous Q&A (always visible) */}
                {conversation.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">Your answers:</p>
                    <div className="space-y-2">
                      {conversation.map((pair, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-600">
                            {index + 1}. {pair.question}
                          </span>
                          <span className="text-emerald-600 ml-2">
                            → {pair.answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current questions with answers - keep visible during loading */}
                <div
                  className={`space-y-5 mb-8 ${isLoading ? "opacity-60" : ""}`}
                >
                  {currentQuestions.map((question, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-black mb-2">
                        {questionStartIndex + index + 1}. {question}
                      </label>
                      {isLoading ? (
                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700">
                          {currentAnswers[index]}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={currentAnswers[index] || ""}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          placeholder="Your answer..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {!isLoading && (
                  <div className="flex gap-4">
                    <button
                      onClick={startOver}
                      className="flex-1 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={submitAnswers}
                      disabled={currentAnswers.some((a) => !a.trim())}
                      className="flex-1 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Submit Answers
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Result */}
            {step === "result" && (choice || reason) && (
              <>
                {/* Choice displayed prominently at top */}
                {choice && (
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-500 mb-2">
                      You should go with
                    </p>
                    <h2 className="text-3xl font-bold text-emerald-600">
                      {choice}
                    </h2>
                  </div>
                )}

                {/* Reason below */}
                {reason && (
                  <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl mb-6">
                    <p className="text-gray-700">{reason}</p>
                  </div>
                )}

                {conversation.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">
                      Based on your {conversation.length} answers:
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {conversation.map((pair, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-gray-600">
                            {index + 1}. {pair.question}
                          </span>
                          <span className="text-emerald-600 ml-2">
                            → {pair.answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={startOver}
                  className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-all"
                >
                  Make Another Decision
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500 text-sm space-y-2">
          <p>
            Made by <span className="text-gray-700 font-medium">Bibek</span>
          </p>
          <p>
            <a
              href="mailto:businessbibek6@gmail.com"
              className="text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              businessbibek6@gmail.com
            </a>
          </p>
          <p>
            Check out my other projects and blog at{" "}
            <a
              href="https://bibektiwari.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              bibektiwari.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
