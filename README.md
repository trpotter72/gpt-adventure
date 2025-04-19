# ChatGPT Adventure Game

A text adventure game powered by ChatGPT. Players input natural language descriptions of their actions, and the AI responds with story progression and prompts for the next action.

## Features

- Interactive text adventure gameplay
- Natural language input processing
- Dynamic story progression based on player actions
- Character stats that evolve based on gameplay decisions
- ChatGPT integration for rich, contextual responses

## Getting Started

First, clone the repository and install dependencies:

```bash
git clone <repository-url>
cd gpt-adventure
yarn install
```

### Configure OpenAI API

1. Copy the `.env.local` file and add your OpenAI API key:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` with your actual OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Uncomment and configure the OpenAI API integration in `app/api/game/route.ts`

### Run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to play the game.

## How to Play

1. Read the current game prompt
2. Type your action in natural language (e.g., "I search the room for hidden items")
3. The AI will respond with what happens and present you with a new situation
4. Your character stats will change based on your actions

## Game Mechanics

- **STR (Strength)**: Affects combat ability and physical tasks
- **DEF (Defense)**: Affects damage reduction and ability to avoid harm
- **HP (Health Points)**: Your character's health - if it reaches zero, the game ends

## Customization

The game can be customized by modifying the system prompt in `app/api/game/route.ts` to create different gameplay experiences or change the theme of the adventure.

## Technologies Used

- Next.js 15+
- React 19+
- OpenAI API (GPT-4 or similar model)
- TypeScript
- Tailwind CSS

## License

MIT
