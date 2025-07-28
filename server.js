const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const DATA_FILE = './ecobotData.json';

// Load data or initialize
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, questions: [] }, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE);
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Register or get user
app.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  const username = email.split('@')[0];
  const data = loadData();
  if (!data.users[username]) {
    data.users[username] = { 
      coins: 0, 
      level: 1, 
      isPro: false, 
      proExpiry: null,
      createdGames: [],
      createdQuestions: []
    };
    saveData(data);
  }
  res.json({ 
    username, 
    coins: data.users[username].coins, 
    level: data.users[username].level,
    isPro: data.users[username].isPro || false,
    proExpiry: data.users[username].proExpiry
  });
});

// Get leaderboard sorted
app.get('/leaderboard', (req, res) => {
  const data = loadData();
  const sorted = Object.entries(data.users)
    .sort((a, b) => b[1].coins - a[1].coins)
    .map(([username, info]) => ({
      username,
      coins: info.coins,
      level: info.level,
    }));
  res.json(sorted);
});

// Update coins and level
app.post('/coins', (req, res) => {
  const { username, coins, level } = req.body;
  if (!username || typeof coins !== 'number' || typeof level !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const data = loadData();
  if (!data.users[username]) {
    return res.status(400).json({ error: 'User not found' });
  }
  data.users[username].coins = coins;
  data.users[username].level = level;
  saveData(data);
  res.json({ success: true });
});

// Submit question (Pro feature)
app.post('/submit-question', (req, res) => {
  const { username, topic, question, answer } = req.body;
  if (!username || !topic || !question || !answer) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const data = loadData();
  
  // Check if user is Pro
  if (!data.users[username] || !data.users[username].isPro) {
    return res.status(403).json({ error: 'Pro subscription required to create questions' });
  }
  
  const questionData = { username, topic, question, answer, date: new Date().toISOString(), id: Date.now() };
  data.questions.push(questionData);
  data.users[username].createdQuestions.push(questionData.id);
  saveData(data);
  res.json({ success: true, questionId: questionData.id });
});

// Create game (Pro feature)
app.post('/create-game', (req, res) => {
  const { username, gameName, gameType, questions, settings } = req.body;
  if (!username || !gameName || !gameType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const data = loadData();
  
  // Check if user is Pro
  if (!data.users[username] || !data.users[username].isPro) {
    return res.status(403).json({ error: 'Pro subscription required to create games' });
  }
  
  if (!data.games) data.games = [];
  
  const gameData = {
    id: Date.now(),
    creator: username,
    name: gameName,
    type: gameType,
    questions: questions || [],
    settings: settings || {},
    created: new Date().toISOString(),
    plays: 0
  };
  
  data.games.push(gameData);
  data.users[username].createdGames.push(gameData.id);
  saveData(data);
  res.json({ success: true, gameId: gameData.id });
});

// Get user's created content
app.get('/user-content/:username', (req, res) => {
  const { username } = req.params;
  const data = loadData();
  
  if (!data.users[username]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userGames = data.games ? data.games.filter(game => game.creator === username) : [];
  const userQuestions = data.questions.filter(q => q.username === username);
  
  res.json({
    games: userGames,
    questions: userQuestions
  });
});

// Upgrade to Pro
app.post('/upgrade-pro', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  const data = loadData();
  if (!data.users[username]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Set Pro status (in real app, this would integrate with payment processor)
  const proExpiry = new Date();
  proExpiry.setMonth(proExpiry.getMonth() + 1); // 1 month from now
  
  data.users[username].isPro = true;
  data.users[username].proExpiry = proExpiry.toISOString();
  saveData(data);
  
  res.json({ 
    success: true, 
    message: 'Upgraded to Pro!', 
    proExpiry: proExpiry.toISOString() 
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌱 EcoBot backend running at http://localhost:${PORT}`);
});