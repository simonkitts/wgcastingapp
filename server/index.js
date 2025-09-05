const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to votes JSON file
const votesFilePath = path.join(__dirname, 'votes.json');

// Initialize votes file if it doesn't exist
if (!fs.existsSync(votesFilePath)) {
  fs.writeFileSync(votesFilePath, JSON.stringify([], null, 2));
}

// Helper function to read votes from file
const readVotes = () => {
  try {
    const data = fs.readFileSync(votesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading votes file:', error);
    return [];
  }
};

// Helper function to write votes to file
const writeVotes = (votes) => {
  try {
    fs.writeFileSync(votesFilePath, JSON.stringify(votes, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing votes file:', error);
    return false;
  }
};

// GET /api/votes - Fetch all votes
app.get('/api/votes', (req, res) => {
  try {
    const votes = readVotes();
    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// POST /api/votes - Submit votes for a username
app.post('/api/votes', (req, res) => {
  try {
    const { username, votes: newVotes } = req.body;
    
    if (!username || !Array.isArray(newVotes)) {
      return res.status(400).json({ error: 'Username and votes array are required' });
    }

    // Read existing votes
    let allVotes = readVotes();
    
    // Remove existing votes for this username
    allVotes = allVotes.filter(vote => vote.username !== username);
    
    // Add new votes for this username
    const formattedVotes = newVotes.map(vote => ({
      username,
      day: vote.day,
      start: vote.start,
      end: vote.end
    }));
    
    allVotes.push(...formattedVotes);
    
    // Write back to file
    const success = writeVotes(allVotes);
    
    if (success) {
      res.json({ success: true, message: 'Votes saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save votes' });
    }
  } catch (error) {
    console.error('Error saving votes:', error);
    res.status(500).json({ error: 'Failed to save votes' });
  }
});

// GET /api/usernames - Get list of all usernames that have voted
app.get('/api/usernames', (req, res) => {
  try {
    const votes = readVotes();
    const usernames = [...new Set(votes.map(vote => vote.username))];
    res.json(usernames);
  } catch (error) {
    console.error('Error fetching usernames:', error);
    res.status(500).json({ error: 'Failed to fetch usernames' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WG Casting API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
