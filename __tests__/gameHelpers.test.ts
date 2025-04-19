import { parseSuccessProbability, formatHistoryForChatGPT } from '../app/api/game/route';

describe('parseSuccessProbability', () => {
  it('parses a valid percentage string', () => {
    expect(parseSuccessProbability('75')).toBeCloseTo(0.75);
  });

  it('clamps values below 1% to 0.01', () => {
    expect(parseSuccessProbability('0')).toBeCloseTo(0.01);
  });

  it('clamps values above 99% to 0.99', () => {
    expect(parseSuccessProbability('100')).toBeCloseTo(0.99);
  });

  it('defaults to 50% for non-numeric strings', () => {
    expect(parseSuccessProbability('abc')).toBeCloseTo(0.5);
  });

  it('parses percentage strings with symbols', () => {
    expect(parseSuccessProbability('50% chance')).toBeCloseTo(0.5);
  });
});

describe('formatHistoryForChatGPT', () => {
  it('formats only currentPrompt when provided', () => {
    const gameState = { currentPrompt: 'You wake up in a forest.', history: [], stats: {} };
    const messages = formatHistoryForChatGPT(gameState);
    expect(messages).toEqual([
      {
        role: 'assistant',
        content: JSON.stringify({
          story: 'The adventure begins.',
          prompt: 'You wake up in a forest.',
          statsUpdate: {}
        })
      }
    ]);
  });

  it('formats user history and assistant responses correctly', () => {
    const gameState = {
      currentPrompt: '',
      history: [
        'look around',
        'You see a dark room.',
        'You can go north.'
      ],
      stats: {}
    };
    const messages = formatHistoryForChatGPT(gameState);
    expect(messages).toEqual([
      { role: 'user', content: 'look around' },
      { role: 'assistant', content: JSON.stringify({ story: 'You see a dark room.', prompt: 'You can go north.', statsUpdate: {} }) }
    ]);
  });

  it('handles odd-length history gracefully', () => {
    const gameState = {
      currentPrompt: '',
      history: ['action1', 'story1'],
      stats: {}
    };
    const messages = formatHistoryForChatGPT(gameState);
    expect(messages).toEqual([
      { role: 'user', content: 'action1' },
      { role: 'assistant', content: JSON.stringify({ story: 'story1', prompt: '', statsUpdate: {} }) }
    ]);
  });
});