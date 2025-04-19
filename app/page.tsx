"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import io, { Socket } from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Home() {

  // State for Socket.IO and player
  const [socket, setSocket] = useState<Socket>();
  const [socketId, setSocketId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  // Game state
  const [players, setPlayers] = useState<{ id: string; name: string; money: number }[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>("");
  // Shared world state including stats
  const [worldState, setWorldState] = useState<{
    story: string;
    stats: { STR: number; DEF: number; HP: number };
    inventory: string[];
    money: number;
  }>({
    story: "You wake up on ocean beach. It's morning, and the sun is just starting to rise. You know what you must do. Marc Benioff must fall; you must become CEO of Salesforce.",
    stats: { STR: 10, DEF: 10, HP: 100 },
    inventory: [],
    money: 0,
  });
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stock and portfolio state
  const [stockValue, setStockValue] = useState<number>(0);
  const [stockHistory, setStockHistory] = useState<{ time: string; value: number }[]>([]);
  const [money, setMoney] = useState<number>(0);
  const [stockInventory, setStockInventory] = useState<number>(0);

  // Initialize Socket.IO
  useEffect(() => {
    // Connect to Socket.IO on Next.js API route
    const endpoint = typeof window !== 'undefined' ? window.location.origin : '';
    const newSocket = io(endpoint, { path: '/api/socketio' });
    setSocket(newSocket);
    newSocket.on("connect", () => setSocketId(newSocket.id!));
    newSocket.on("playersUpdate", ({ players, currentTurn }) => {
      setPlayers(players);
      setCurrentTurn(currentTurn);
      setLoading(false);
    });
    newSocket.on("stateUpdate", ({ worldState }) => setWorldState(worldState));
    // Listen for server-triggered game start
    newSocket.on("gameStart", ({ worldState: initialState }) => {
      setWorldState(initialState);
      setGameStarted(true);
    });

    // Listen for stock updates
    newSocket.on('stockUpdate', ({ stockValue }) => {
      setStockValue(stockValue);
      setStockHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), value: stockValue }]);
    });
    // Listen for portfolio updates
    newSocket.on('portfolioUpdate', ({ money, inventory }) => {
      setMoney(money);
      setStockInventory(inventory);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Scroll on story update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [worldState.story]);

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (socket && playerName.trim()) {
      socket.emit("join", playerName.trim());
      setJoined(true);
    }
  };

  const handleStart = () => {
    // Tell server to start game for everyone
    socket?.emit("startGame");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || loading) return;
    if (socketId === currentTurn && inputText.trim()) {
      setLoading(true);
      socket.emit("action", inputText.trim());
      setInputText("");
    }
  };

  // Handlers for trading
  const handleBuyOne = () => { if (socket) socket.emit('buyStock', 1); };
  const handleSellOne = () => { if (socket) socket.emit('sellStock', 1); };

  const otherPlayers = players.filter(p => p.id !== socketId);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto flex flex-col">
      <header className="text-2xl font-bold mb-4 text-center">
        ChatGPT Adventure
      </header>
      {!joined ? (
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-foreground text-background rounded-md hover:opacity-90"
          >
            Join Game
          </button>
        </form>
      ) : !gameStarted ? (
        <div>
          <div className="mb-4">
            <div className="font-semibold">Players in Lobby:</div>
            <ul className="list-disc pl-5">
              {players.map(p => (
                <li key={p.id}>{p.name}{p.id === socketId ? ' (You)' : ''}</li>
              ))}
            </ul>
          </div>
          {otherPlayers.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold">Other Players:</div>
              <ul className="list-disc pl-5">
                {otherPlayers.map(p => <li key={p.id}>{p.name}</li>)}
              </ul>
            </div>
          )}
          <div className="mb-4">
            <div className="font-semibold">Current Prompt:</div>
            <div className="p-4 bg-black/5 rounded-md font-mono">{worldState.story.split('\n')[0]}</div>
          </div>
          <button onClick={handleStart} className="px-4 py-2 bg-foreground text-background rounded-md hover:opacity-90">
            Start Game
          </button>
        </div>
      ) : (
        <>
          {/* Shared Stats and Stock Display */}
          <div className="grid grid-cols-4 gap-4 mb-4 bg-black/10 dark:bg-white/10 p-3 rounded-md">
            <div><span className="font-bold">STR:</span> {worldState.stats.STR}</div>
            <div><span className="font-bold">DEF:</span> {worldState.stats.DEF}</div>
            <div><span className="font-bold">HP:</span> {worldState.stats.HP}</div>
            <div>
              <div><span className="font-bold">Stock Value:</span> {stockValue.toFixed(2)}</div>
              <div><span className="font-bold">Cash:</span> {money}</div>
              <div><span className="font-bold">Shares:</span> {stockInventory}</div>
            </div>
          </div>
          {/* Stock Value Bar Chart */}
          <BarChart width={600} height={200} data={stockHistory} className="mx-auto mb-4">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[dataMin => Math.floor(dataMin - 5), dataMax => Math.ceil(dataMax + 5)]} />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
          {/* Trading Controls */}
          <div className="flex items-center gap-4 mb-4 justify-center">
            <button onClick={handleBuyOne} className="px-4 py-2 bg-green-600 text-white rounded-md hover:opacity-90">
              Buy 1 Share
            </button>
            <button onClick={handleSellOne} className="px-4 py-2 bg-red-600 text-white rounded-md hover:opacity-90">
              Sell 1 Share
            </button>
          </div>
          <div className="mb-4">
            <div className="font-semibold">Players:</div>
            <ul className="list-disc pl-5">
              {players.map((p) => (
                <li key={p.id} className={p.id === currentTurn ? "font-bold" : ""}>
                  {p.name} (${p.money}){p.id === currentTurn ? " (Current Turn)" : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 overflow-auto bg-black/5 p-4 rounded-md font-mono text-sm max-h-[60vh]">
              {worldState.story.split("\n").map((line, i) => (
                <div key={i} className="mb-2">
                  {line}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="w-48 bg-black/10 p-4 rounded-md">
              <div>
                <span className="font-semibold">Inventory:</span>
              </div>
              <ul className="list-disc pl-5">
                {worldState.inventory.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <div className="mt-2">
                <span className="font-semibold">Money:</span> {worldState.money}
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                socketId === currentTurn
                  ? "What do you want to do?"
                  : "Waiting for your turn..."
              }
              disabled={socketId !== currentTurn || loading}
              className="flex-1 px-3 py-2 border rounded-md bg-transparent"
            />
            <button
              type="submit"
              className={`px-4 py-2 bg-foreground text-background rounded-md ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              }`}
              disabled={socketId !== currentTurn || loading}
            >
              {loading ? "Thinking..." : "Submit"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
