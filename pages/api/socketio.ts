import { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import OpenAI from 'openai';

// We're using a custom socket.server augmentation via type assertions

// In-memory game state
const turnQueue: string[] = [];
// Player record now includes cash and stock inventory
const players: Record<string, { name: string; money: number; inventory: number }> = {};
// Initialize shared world state with original prompt, default stats, inventory, and money
let worldState = {
  // Original starting prompt
  story: "You wake up on ocean beach. It's morning, and the sun is just starting to rise. You know what you must do. Marc Benioff must fall; you must become CEO of Salesforce.",
  stats: { STR: 10, DEF: 10, HP: 100 },
  inventory: [] as string[],
  money: 0,
};

// Stock market simulation variables
let stockValue = 100;
let lastStockValue = 100;
const mu = 100;
const theta = 0.05;
const alpha = 0.1;
const sigma = 1;
// Box-Muller transform for standard normal
function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use any to access the server socket
  const server = (res as any).socket.server as { io?: IOServer; [key: string]: any };
  if (!server.io) {
    console.log('Initializing Socket.IO server');
    const io = new IOServer(server as any, { path: '/api/socketio' });
    server.io = io;

    // Start stock market updates every second
    setInterval(() => {
      const noise = randomNormal() * sigma;
      const deltaMean = theta * (mu - stockValue);
      const deltaTrend = alpha * (stockValue - lastStockValue);
      const newValue = stockValue + deltaMean + deltaTrend + noise;
      lastStockValue = stockValue;
      stockValue = Math.max(newValue, 0);
      io.emit('stockUpdate', { stockValue });
    }, 1000);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    io.on('connection', (socket) => {
      console.log('Client connected', socket.id);

      // Handle game start from any player
      socket.on('startGame', () => {
        // Broadcast to all clients to start the game
        io.emit('gameStart', { worldState });
        // Send initial players list and first turn
        io.emit('playersUpdate', {
          players: turnQueue.map(id => ({ id, name: players[id].name })),
          currentTurn: turnQueue[0]
        });
        // Notify the first player it's their turn
        if (turnQueue.length > 0) {
          io.to(turnQueue[0]).emit('yourTurn');
        }
      });

      socket.on('join', (name: string) => {
        // Initialize new player with default cash and no shares
        players[socket.id] = { name, money: 1000, inventory: 0 };
        turnQueue.push(socket.id);
        io.emit('playersUpdate', { players: turnQueue.map(id => ({ id, name: players[id].name })), currentTurn: turnQueue[0] });
        // Send initial portfolio to the joining player
        socket.emit('portfolioUpdate', { money: players[socket.id].money, inventory: players[socket.id].inventory });
        if (turnQueue.length === 1) io.to(socket.id).emit('yourTurn');
      });

      socket.on('action', async (action: string) => {
        try {
          // Generate story update (JSON-formatted response expected)
          const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are the game master for a cooperative text adventure. Respond with a JSON object containing fields story, statsUpdate, inventoryUpdate, and moneyUpdate.' },
              { role: 'user', content: `Story so far: ${worldState.story}\nPlayer action: ${action}` }
            ]
          });
          // Safely parse the JSON response
          const raw = completion.choices[0].message.content || '{}';
          const parsed = JSON.parse(raw);
          // Append to story
          worldState.story += `\n> ${players[socket.id].name}: ${action}`;
          worldState.story += `\n${parsed.story}`;
          // Update stats if provided
          if (parsed.statsUpdate) {
            const delta = parsed.statsUpdate;
            worldState.stats.STR += delta.STR || 0;
            worldState.stats.DEF += delta.DEF || 0;
            worldState.stats.HP += delta.HP || 0;
          }
        } catch (err) {
          console.error('OpenAI error:', err);
        }

        // Broadcast updated state including stats
        io.emit('stateUpdate', { worldState });

        const current = turnQueue.shift()!;
        turnQueue.push(current);
        const next = turnQueue[0];
        io.emit('playersUpdate', { players: turnQueue.map(id => ({ id, name: players[id].name })), currentTurn: next });
        io.to(next).emit('yourTurn');
      });

      // Handle buying stocks
      socket.on('buyStock', (qty: number) => {
        const cost = qty * stockValue;
        if (players[socket.id].money >= cost) {
          players[socket.id].money -= cost;
          players[socket.id].inventory += qty;
        }
        socket.emit('portfolioUpdate', { money: players[socket.id].money, inventory: players[socket.id].inventory });
      });

      // Handle selling stocks
      socket.on('sellStock', (qty: number) => {
        if (players[socket.id].inventory >= qty) {
          players[socket.id].inventory -= qty;
          players[socket.id].money += qty * stockValue;
        }
        socket.emit('portfolioUpdate', { money: players[socket.id].money, inventory: players[socket.id].inventory });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        const idx = turnQueue.indexOf(socket.id);
        if (idx !== -1) turnQueue.splice(idx, 1);
        delete players[socket.id];
        io.emit('playersUpdate', { players: turnQueue.map(id => ({ id, name: players[id].name })), currentTurn: turnQueue[0] });
      });
    });
  }
  res.end();
}
