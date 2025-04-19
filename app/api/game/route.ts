import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

dotenv.config();

/**
 * Handles POST requests for the text adventure game route.
 * @param request - The NextRequest containing gameState and userInput.
 * @returns NextResponse with game outcome JSON.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameState, userInput } = body;

    // Format the history for ChatGPT
    const formattedHistory = formatHistoryForChatGPT(gameState);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // First, determine the probability of success based on context
    const probabilityResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are evaluating the probability of success for a player's action in a text adventure game.
            Based on the game context and the player's intended action, determine a reasonable probability of success.
            Consider factors like the difficulty of the action, the player's previous actions, and narrative context.
            
            Return ONLY a number between 0 and 100 representing the percentage chance of success.
            For example: "75" for a 75% chance of success.`,
        },
        ...formattedHistory.map((msg) => msg as ChatCompletionMessageParam),
        {
          role: "user",
          content: `The player is attempting: "${userInput}". What is the probability of success?`,
        },
      ],
      temperature: 0.3,
    });

    // Extract the probability value
    const probabilityString =
      probabilityResponse.choices[0].message.content || "50";
    const successProbability = parseSuccessProbability(probabilityString);

    // Use RNG to determine success or failure
    const randomValue = Math.random();
    const actionSucceeded = randomValue <= successProbability;

    // Now, generate the game response with the success/failure information
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the game master for a text adventure game. 
            The player will describe what they want to do, and you should respond with:
            1. A story description of what happens (1-3 sentences)
            2. A prompt for the new situation that the player finds themselves in (2-3 sentences)
            3. Any stat changes that should occur based on their actions.

            The prompt for the new situation should be a totally new scene, but
            one that follows from what happened in the previous prompt.
            
            Current player stats: STR: ${gameState.stats.STR}, DEF: ${
            gameState.stats.DEF
          }, HP: ${gameState.stats.HP}
            
            IMPORTANT: The player's action has ${
              actionSucceeded ? "SUCCEEDED" : "FAILED"
            }.
            If the action succeeded, describe a positive outcome that benefits the player.
            If the action failed, describe a negative consequence or setback.
            
            Format your response as a JSON object with the following structure:
            {
              "story": "Description of what happens",
              "prompt": "What the player sees/can do next",
              "statsUpdate": { "STR": 0, "DEF": 0, "HP": 0 }
            }
            
            Only include stats that change in the statsUpdate object. If no stats change, return an empty object: {}.
            Keep your responses concise and focused on the adventure.`,
        },
        ...formattedHistory.map((msg) => msg as ChatCompletionMessageParam),
        {
          role: "user",
          content: userInput,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const parsedResponse = content ? JSON.parse(content) : null;

    // Include the action success information in the response
    const enhancedResponse = {
      ...parsedResponse,
      actionSucceeded,
      successProbability: Math.round(successProbability * 100),
    };

    return NextResponse.json(enhancedResponse);
  } catch (error) {
    console.error("Error processing game input:", error);
    return NextResponse.json(
      { error: "Failed to process game input" },
      { status: 500 }
    );
  }
}

/**
 * Formats the game history into ChatCompletionMessageParam objects for OpenAI.
 *
 * @param gameState - The current game state including history and current prompt.
 * @returns An array of messages for the OpenAI chat API.
 */
export function formatHistoryForChatGPT(gameState: any): any[] {
  const messages = [];

  // Add the initial prompt as the assistant's first message
  if (gameState.currentPrompt) {
    messages.push({
      role: "assistant",
      content: JSON.stringify({
        story: "The adventure begins.",
        prompt: gameState.currentPrompt,
        statsUpdate: {}
      }),
    });
  }

  // Add the rest of the history, alternating between user and assistant
  for (let i = 0; i < gameState.history.length; i++) {
    const item = gameState.history[i];

    // If it's an even index, it's a user message
    if (i % 3 === 0) {
      messages.push({
        role: "user",
        content: item,
      });
    }
    // If it's an odd index, it could be a story or a prompt
    else if (i % 3 === 1) {
      // This is the story
      const story = item;
      // The next item should be the prompt
      const prompt = gameState.history[i + 1] || "";

      messages.push({
        role: "assistant",
        content: JSON.stringify({
          story,
          prompt,
          statsUpdate: {}, // We don't have the actual stats update in history
        }),
      });

      // Skip the next item since we used it
      i++;
    }
  }

  return messages;
}

/**
 * Parses a probability string returned by OpenAI and clamps it between 1% and 99%.
 * @param probabilityString - The raw string containing a numeric percentage.
 * @returns A number between 0.01 and 0.99.
 */
export function parseSuccessProbability(probabilityString: string): number {
  const parsed = parseInt(probabilityString.replace(/\D/g, ''), 10);
  const num = isNaN(parsed) ? 50 : parsed;
  const clamped = Math.min(Math.max(num, 1), 99);
  return clamped / 100;
}
