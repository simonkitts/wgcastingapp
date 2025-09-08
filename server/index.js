const express = require('express');
const cors = require('cors');
const jsonBinService = require('./jsonBinService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize JSONBin.io
jsonBinService.initializeBin().catch(error => {
  console.error('Failed to initialize JSONBin.io:', error.message);
});

// GET /api/votes - Fetch all votes
app.get('/api/votes', async (req, res) => {
  try {
    const votes = await jsonBinService.readVotes();
    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// POST /api/votes - Submit votes for a username
app.post('/api/votes', async (req, res) => {
  try {
    const { username, votes: newVotes } = req.body;
    
    if (!username || !Array.isArray(newVotes)) {
      return res.status(400).json({ error: 'Username and votes array are required' });
    }

    // Read existing votes
    let allVotes = await jsonBinService.readVotes();

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
    
    // Write back to JSONBin
    const success = await jsonBinService.writeVotes(allVotes);

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
app.get('/api/usernames', async (req, res) => {
  try {
    const votes = await jsonBinService.readVotes();
    const usernames = [...new Set(votes.map(vote => vote.username))];
    res.json(usernames);
  } catch (error) {
    console.error('Error fetching usernames:', error);
    res.status(500).json({ error: 'Failed to fetch usernames' });
  }
});

// GET /api/candidates - Fetch all candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await jsonBinService.readCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// POST /api/candidates - Einzelnen Kandidaten hinzufügen
app.post('/api/candidates', async (req, res) => {
  const candidate = req.body;
  if (!candidate || !candidate.name) {
    return res.status(400).json({ error: 'Candidate name required' });
  }

  try {
    let candidates = await jsonBinService.readCandidates();
    candidate.besichtigungStatus = candidate.besichtigungStatus || 'offen';
    candidate.castingStatus = candidate.castingStatus || 'offen';
    candidate.votes = candidate.votes || {};
    candidate.notes = candidate.notes || [];
    candidates.push(candidate);

    const success = await jsonBinService.writeCandidates(candidates);

    if (success) {
      res.json({ success: true, candidate });
    } else {
      res.status(500).json({ error: 'Failed to save candidate' });
    }
  } catch (error) {
    console.error('Error saving candidate:', error);
    res.status(500).json({ error: 'Failed to save candidate' });
  }
});

// PUT /api/candidates/:id - Kandidaten bearbeiten
app.put('/api/candidates/:id', async (req, res) => {
  try {
    let candidates = await jsonBinService.readCandidates();
    const idx = candidates.findIndex(c => c.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    candidates[idx] = { ...candidates[idx], ...req.body };
    const success = await jsonBinService.writeCandidates(candidates);

    if (success) {
      res.json({ success: true, candidate: candidates[idx] });
    } else {
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE /api/candidates/:id - Kandidaten löschen
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    let candidates = await jsonBinService.readCandidates();
    const newCandidates = candidates.filter(c => c.id !== req.params.id);
    const success = await jsonBinService.writeCandidates(newCandidates);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// GET /api/slotNotes - Fetch all slot notes
app.get('/api/slotNotes', async (req, res) => {
  try {
    const slotNotes = await jsonBinService.readSlotNotes();
    res.json(slotNotes);
  } catch (error) {
    console.error('Error fetching slotNotes:', error);
    res.status(500).json({ error: 'Failed to fetch slotNotes' });
  }
});

// POST /api/slotNotes - Ergänzen/aktualisieren statt ersetzen
app.post('/api/slotNotes', async (req, res) => {
  try {
    const { slotNotes: newSlotNotes } = req.body;
    if (!Array.isArray(newSlotNotes)) {
      return res.status(400).json({ error: 'slotNotes array is required' });
    }

    let allSlotNotes = await jsonBinService.readSlotNotes();
    // Entferne/aktualisiere bestehende Notizen mit gleicher ID
    const newIds = newSlotNotes.map(n => n.id);
    allSlotNotes = allSlotNotes.filter(n => !newIds.includes(n.id));
    allSlotNotes.push(...newSlotNotes);

    const success = await jsonBinService.writeSlotNotes(allSlotNotes);

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

// API: Alle Termine abrufen
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await jsonBinService.readAppointments();
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// API: Neuen Termin speichern
app.post('/api/appointments', async (req, res) => {
  try {
    const appointments = await jsonBinService.readAppointments();
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
    const success = await jsonBinService.writeAppointments(appointments);

    if (!success) {
      return res.status(500).json({ error: 'Fehler beim Speichern des Termins.' });
    }

    res.json(newAppointment);
  } catch (error) {
    console.error('Error saving appointment:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Termins.' });
  }
});

// API: Kommentar zu Termin hinzufügen
app.post('/api/appointments/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    console.log('POST /api/appointments/:id/comment', { id, body: req.body });

    if (!comment || typeof comment !== 'object' || !comment.text) {
      return res.status(400).json({ error: 'Ungültiger Kommentar. Erwartet: { comment: { text: ... } }' });
    }

    let appointments = await jsonBinService.readAppointments();
    const idx = appointments.findIndex(a => a.id === id);

    if (idx === -1) {
      console.log('Termin nicht gefunden:', id);
      return res.status(404).json({ error: 'Termin nicht gefunden' });
    }

    appointments[idx].comments = appointments[idx].comments || [];
    appointments[idx].comments.push(comment);

    await jsonBinService.writeAppointments(appointments);
    res.json(appointments[idx]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// API: Termin löschen
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let appointments = await jsonBinService.readAppointments();
    const newAppointments = appointments.filter(a => a.id !== id);

    if (appointments.length === newAppointments.length) {
      return res.status(404).json({ error: 'Termin nicht gefunden' });
    }

    await jsonBinService.writeAppointments(newAppointments);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
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
