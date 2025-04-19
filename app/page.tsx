"use client";

import { useState, FormEvent, useRef, useEffect } from "react";

type GameState = {
  stats: {
    STR: number;
    DEF: number;
    HP: number;
  };
  messages: string[];
  currentPrompt: string;
  history: string[];
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState>({
    stats: {
      STR: 10,
      DEF: 10,
      HP: 100,
    },
    messages: [],
    currentPrompt:
      "You wake up in a mysterious forest. The air is thick with mist, and you can hear strange sounds in the distance. What do you do?",
    history: [],
  });

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    setGameState((prevState) => ({
      ...prevState,
      messages: [`PROMPT: ${prevState.currentPrompt}`],
    }));
  }, []);

  // Scroll to bottom of messages whenever they update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!inputText.trim() || isLoading) return;

    // Add user input to messages
    const updatedMessages = [...gameState.messages, `> ${inputText}`];

    setGameState({
      ...gameState,
      messages: updatedMessages,
      history: [...gameState.history, inputText],
    });

    // Reset input field
    setInputText("");
    setIsLoading(true);

    try {
      // Call our API endpoint
      const response = await fetch("/api/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameState,
          userInput: inputText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch from API");
      }

      const data = await response.json();

      // Update game state with the response
      setGameState((prevState) => {
        const newStats = {
          ...prevState.stats,
          ...(data.statsUpdate || {}),
        };

        return {
          ...prevState,
          stats: newStats,
          messages: [
            ...prevState.messages,
            `STORY: ${data.story}`,
            `PROMPT: ${data.prompt}`,
          ],
          currentPrompt: data.prompt,
          history: [...prevState.history, data.story, data.prompt],
        };
      });
    } catch (error) {
      console.error("Error:", error);
      setGameState((prevState) => ({
        ...prevState,
        messages: [
          ...prevState.messages,
          "There was an error processing your request. Please try again.",
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 max-w-4xl mx-auto">
      <header className="text-2xl font-bold mb-4 text-center">
        ChatGPT Adventure
      </header>

      {/* Stats Display */}
      <div className="flex justify-between mb-4 bg-black/10 dark:bg-white/10 p-3 rounded-md">
        <div className="stat">
          <span className="font-bold">STR:</span> {gameState.stats.STR}
        </div>
        <div className="stat">
          <span className="font-bold">DEF:</span> {gameState.stats.DEF}
        </div>
        <div className="stat">
          <span className="font-bold">HP:</span> {gameState.stats.HP}
        </div>
      </div>

      {/* Game Output */}
      <div className="flex-1 overflow-auto mb-4 bg-black/5 dark:bg-white/5 p-4 rounded-md font-mono text-sm min-h-[300px] max-h-[60vh]">
        {gameState.messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 ${
              message.startsWith(">")
                ? "text-blue-600 dark:text-blue-400"
                : message.startsWith("STORY:")
                ? "text-green-600 dark:text-green-400 font-semibold"
                : message.startsWith("PROMPT:")
                ? "text-purple-600 dark:text-purple-400 font-semibold"
                : ""
            }`}
          >
            {message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md bg-transparent border-black/20 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What do you want to do?"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className={`px-4 py-2 bg-foreground text-background rounded-md ${
            isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Thinking..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
