const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Pfade zu den JSON-Dateien im data-Ordner
const votesPath = path.join(__dirname, 'data', 'votes.json');
const candidatesFilePath = path.join(__dirname, 'data', 'candidates.json');
const slotNotesFilePath = path.join(__dirname, 'data', 'slotNotes.json');
const appointmentsFilePath = path.join(__dirname, 'data', 'appointments.json');

// Initialisierung der Dateien im data-Ordner
if (!fs.existsSync(votesPath)) {
  fs.writeFileSync(votesPath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(candidatesFilePath)) {
  fs.writeFileSync(candidatesFilePath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(slotNotesFilePath)) {
  fs.writeFileSync(slotNotesFilePath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(appointmentsFilePath)) {
  fs.writeFileSync(appointmentsFilePath, JSON.stringify([], null, 2));
}

// Helper function to read votes from file
const readVotes = () => {
  try {
    const data = fs.readFileSync(votesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading votes file:', error);
    return [];
  }
};

// Helper function to write votes to file
const writeVotes = (votes) => {
  try {
    fs.writeFileSync(votesPath, JSON.stringify(votes, null, 2));
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
      end: vote.end,
      status: vote.status || 'available' // Default to 'available' for backwards compatibility
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

// Helper function to read candidates from file
const readCandidates = () => {
  try {
    const data = fs.readFileSync(candidatesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading candidates file:', error);
    return [];
  }
};

// Helper function to write candidates to file
const writeCandidates = (candidates) => {
  try {
    fs.writeFileSync(candidatesFilePath, JSON.stringify(candidates, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing candidates file:', error);
    return false;
  }
};

// GET /api/candidates - Fetch all candidates
app.get('/api/candidates', (req, res) => {
  try {
    const candidates = readCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// POST /api/candidates - Einzelnen Kandidaten hinzufügen
app.post('/api/candidates', (req, res) => {
  const candidate = req.body;
  if (!candidate || !candidate.name) {
    return res.status(400).json({ error: 'Candidate name required' });
  }
  let candidates = readCandidates();
  candidate.besichtigungStatus = candidate.besichtigungStatus || 'offen';
  candidate.castingStatus = candidate.castingStatus || 'offen';
  candidate.votes = candidate.votes || {};
  candidate.notes = candidate.notes || [];
  candidates.push(candidate);
  const success = writeCandidates(candidates);
  if (success) {
    res.json({ success: true, candidate });
  } else {
    res.status(500).json({ error: 'Failed to save candidate' });
  }
});

// PUT /api/candidates/:id - Kandidaten bearbeiten
app.put('/api/candidates/:id', (req, res) => {
  let candidates = readCandidates();
  const idx = candidates.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  candidates[idx] = { ...candidates[idx], ...req.body };
  const success = writeCandidates(candidates);
  if (success) {
    res.json({ success: true, candidate: candidates[idx] });
  } else {
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE /api/candidates/:id - Kandidaten löschen
app.delete('/api/candidates/:id', (req, res) => {
  let candidates = readCandidates();
  const newCandidates = candidates.filter(c => c.id !== req.params.id);
  const success = writeCandidates(newCandidates);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// Helper function to read slotNotes from file
const readSlotNotes = () => {
  try {
    const data = fs.readFileSync(slotNotesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading slotNotes file:', error);
    return [];
  }
};

// Helper function to write slotNotes to file
const writeSlotNotes = (slotNotes) => {
  try {
    fs.writeFileSync(slotNotesFilePath, JSON.stringify(slotNotes, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing slotNotes file:', error);
    return false;
  }
};

// GET /api/slotNotes - Fetch all slot notes
app.get('/api/slotNotes', (req, res) => {
  try {
    const slotNotes = readSlotNotes();
    res.json(slotNotes);
  } catch (error) {
    console.error('Error fetching slotNotes:', error);
    res.status(500).json({ error: 'Failed to fetch slotNotes' });
  }
});

// POST /api/slotNotes - Ergänzen/aktualisieren statt ersetzen
app.post('/api/slotNotes', (req, res) => {
  try {
    const { slotNotes: newSlotNotes } = req.body;
    if (!Array.isArray(newSlotNotes)) {
      return res.status(400).json({ error: 'slotNotes array is required' });
    }
    let allSlotNotes = readSlotNotes();
    // Entferne/aktualisiere bestehende Notizen mit gleicher ID
    const newIds = newSlotNotes.map(n => n.id);
    allSlotNotes = allSlotNotes.filter(n => !newIds.includes(n.id));
    allSlotNotes.push(...newSlotNotes);
    const success = writeSlotNotes(allSlotNotes);
    if (success) {
      res.json({ success: true, message: 'Slot notes saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save slot notes' });
    }
  } catch (error) {
    console.error('Error saving slotNotes:', error);
    res.status(500).json({ error: 'Failed to save slot notes' });
  }
});

// Helper function to read appointments from file
const readAppointments = () => {
  try {
    const data = fs.readFileSync(appointmentsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading appointments file:', error);
    return [];
  }
};

// Helper function to write appointments to file
const writeAppointments = (appointments) => {
  try {
    fs.writeFileSync(appointmentsFilePath, JSON.stringify(appointments, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing appointments file:', error);
    return false;
  }
};

// API: Alle Termine abrufen
app.get('/api/appointments', (req, res) => {
  res.json(readAppointments());
});

// API: Neuen Termin speichern
app.post('/api/appointments', (req, res) => {
  const appointments = readAppointments();
  let newAppointment = req.body;
  // ID generieren, falls nicht vorhanden
  if (!newAppointment.id) {
    newAppointment.id = Date.now().toString();
  }
  // Logging für Debugging
  console.log('Neuer Termin:', newAppointment);
  // Minimalprüfung auf notwendige Felder
  if (!newAppointment.title || !newAppointment.date || !newAppointment.startTime || !newAppointment.endTime || !newAppointment.type) {
    return res.status(400).json({ error: 'Termin muss title, date, startTime, endTime und type haben.' });
  }
  appointments.push(newAppointment);
  writeAppointments(appointments);
  res.json(newAppointment);
});

// API: Kommentar zu Termin hinzufügen
app.post('/api/appointments/:id/comment', (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  console.log('POST /api/appointments/:id/comment', { id, body: req.body });
  if (!comment || typeof comment !== 'object' || !comment.text) {
    return res.status(400).json({ error: 'Ungültiger Kommentar. Erwartet: { comment: { text: ... } }' });
  }
  let appointments = readAppointments();
  const idx = appointments.findIndex(a => a.id === id);
  if (idx === -1) {
    console.log('Termin nicht gefunden:', id);
    return res.status(404).json({ error: 'Termin nicht gefunden' });
  }
  appointments[idx].comments = appointments[idx].comments || [];
  appointments[idx].comments.push(comment);
  writeAppointments(appointments);
  res.json(appointments[idx]);
});

// API: Termin löschen
app.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  let appointments = readAppointments();
  const newAppointments = appointments.filter(a => a.id !== id);
  if (appointments.length === newAppointments.length) {
    return res.status(404).json({ error: 'Termin nicht gefunden' });
  }
  writeAppointments(newAppointments);
  res.json({ success: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WG Casting API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('Express-Endpunkte für /api/appointments, /api/candidates, /api/slotNotes, /api/votes und /api/usernames wurden registriert.');
});
