# GPT Adventure

An interactive text adventure game powered by OpenAI's GPT API and Next.js.

## Table of Contents
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Helper Functions](#helper-functions)
- [Testing](#testing)

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:
```bash
npm run dev
```

## Configuration

Create a `.env.local` file in the project root with:

```env
OPENAI_API_KEY=your_openai_api_key
```

## API Documentation

### POST /api/game

Handles text adventure game interactions.

Request Body (JSON):
```json
{  
  "gameState": {
    "currentPrompt": "string",
    "history": ["string"],
    "stats": {"STR": number, "DEF": number, "HP": number}
  },
  "userInput": "string"
}
```

Response Body (JSON):
```json
{
  "story": "string",
  "prompt": "string",
  "statsUpdate": { [stat: string]: number },
  "actionSucceeded": boolean,
  "successProbability": number
}
```

## Helper Functions

- **formatHistoryForChatGPT(gameState)**: Transforms game history and current prompt into an array of `ChatCompletionMessageParam` objects for OpenAI.
- **parseSuccessProbability(probabilityString)**: Parses a raw probability string from the OpenAI response and clamps it between 1% and 99% (returned as a float between 0.01 and 0.99).

## Testing

This project uses Jest with `ts-jest` for unit testing.

### Running Tests
```bash
npm test
```

### Test Files
- `__tests__/gameHelpers.test.ts`: Unit tests for helper functions.

### Coverage
Test coverage reports can be generated with:
```bash
npm test -- --coverage
```
