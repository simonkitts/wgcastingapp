# WG Casting App

A mobile-first web application for shared flats (WG) to organize casting interviews for new tenants. Now with **multi-user collaboration** and **real-time vote synchronization**!

## Features

### 🔐 Multi-User Login System
- **Username-based authentication** with unique validation
- **Conflict detection** with modal notifications for duplicate names
- **Real-time user management** across multiple participants
- **Secure session handling** with logout functionality

### 🗓️ Availability Calendar
- **When2meet-style interface** with monthly view
- Days on X-axis, hours (10:00–22:00) on Y-axis
- **Fixed slot selection** - reliable mouse and touch interaction
- **Single-click toggle** or **drag selection** for multi-hour blocks
- **Multi-user heatmap** showing overlapping availabilities from all participants
- **Real-time synchronization** with server-side persistence
- Double-click time slots to add notes

### 👥 Candidate Management
- Create, edit, and delete candidate profiles
- Add descriptions and portfolio links
- Smart time slot recommendations based on availability
- One-click candidate assignment to time slots
- Track scheduling status

### 📝 Notes System
- Add timestamped notes to any time slot
- Add notes to candidate profiles
- Visual indicators show when notes exist
- User tracking for multi-user scenarios

### 💾 Server-Side Data Persistence
- **Express.js backend** with REST API endpoints
- **JSON file storage** for vote persistence
- **Real-time synchronization** across all users
- **Automatic conflict resolution** for overlapping edits
- **Multi-user session management**
- **API endpoints**: `/api/votes`, `/api/usernames`

### 📱 Mobile-First Design
- Fully responsive and touch-friendly interface
- Tab navigation between Calendar and Candidates
- Large tap targets for mobile use
- Optimized for touch interactions and gestures

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd wg-casting-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start both backend and frontend (recommended):
   ```bash
   npm run dev
   ```
   Or start them separately:
   ```bash
   # Terminal 1: Start backend server
   npm run server
   
   # Terminal 2: Start frontend
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser
6. Enter a unique username to begin selecting availability

### Build for Production

```bash
npm run build
```

## How to Use

### Getting Started
1. **Enter your name** on the login screen
2. Choose a **unique username** (you'll get a warning if it's taken)
3. Click **Continue** to access the application

### Setting Up Availability
1. Go to the **Calendar** tab
2. Select a date from the month view
3. **Click once** to toggle individual time slots OR **drag** to select multiple hours
4. Green blocks show your availability
5. **Blue numbers** show how many people are available at that time (heatmap)
6. Double-click any time slot to add notes (e.g., "phone only")
7. Your votes are **automatically saved** to the server

### Managing Candidates
1. Go to the **Candidates** tab
2. Click **"+ Add Candidate"** to create a new candidate
3. Fill in name, description, and optional portfolio link
4. Save the candidate
5. Use the **"Notes"** button to add private notes about candidates
6. Click on recommended time slots to assign candidates to specific times

### Best Practices
- Mark your availability as soon as possible
- Use notes to specify preferences (e.g., "video call preferred")
- Check the heatmap to find times when most people are available
- Add detailed candidate notes to remember key points from applications

## Technical Details

### Built With

**Frontend:**
- **React** 18+ with TypeScript
- **TailwindCSS** for styling  
- Mobile-first responsive design
- Real-time state management

**Backend:**
- **Express.js** server
- **CORS** for cross-origin requests
- **JSON file storage** (server/votes.json)
- RESTful API design

### Project Structure
```
src/
├── components/
│   ├── AvailabilityCalendar.tsx  # Main calendar interface
│   ├── CandidateList.tsx         # Candidate management
│   └── NotesModal.tsx            # Notes functionality
├── context/
│   └── DataContext.tsx           # State management & localStorage
├── types/
│   └── index.ts                  # TypeScript type definitions
└── App.tsx                       # Main app component
```

### Data Structure
```typescript
interface AvailabilitySlot {
  id: string;
  userId: string;
  day: string;        // YYYY-MM-DD
  startHour: number;  // 10-22
  endHour: number;    // 10-22
}

interface Candidate {
  id: string;
  name: string;
  description: string;
  link?: string;
  assignedSlotId?: string;
  notes?: CandidateNote[];
}
```

### API Endpoints

The backend server (port 3001) provides the following REST API endpoints:

```
GET /api/votes
→ Returns all availability votes from all users
→ Response: [{ username: "alice", day: "2025-09-05", start: "10:00", end: "12:00" }, ...]

POST /api/votes
→ Submit availability votes for a username
→ Body: { username: "alice", votes: [{ day: "2025-09-05", start: "10:00", end: "12:00" }] }
→ Response: { success: true, message: "Votes saved successfully" }

GET /api/usernames
→ Returns list of all usernames that have submitted votes
→ Response: ["alice", "bob", "charlie"]

GET /health
→ Health check endpoint
→ Response: { status: "OK", timestamp: "2025-09-05T15:30:00.000Z" }
```

### Data Storage

Votes are stored in `server/votes.json` in the following format:
```json
[
  { "username": "alice", "day": "2025-09-05", "start": "10:00", "end": "12:00" },
  { "username": "bob", "day": "2025-09-05", "start": "11:00", "end": "13:00" },
  { "username": "alice", "day": "2025-09-06", "start": "14:00", "end": "16:00" }
]
```

## Deployment

This is a static React app that can be deployed to:
- **Netlify**: Connect your GitHub repo for automatic deployments
- **Vercel**: Import project for instant deployment
- **GitHub Pages**: Use `gh-pages` package for deployment
- **Any static hosting**: Upload the `build/` folder contents

## Future Enhancements

- Multi-user real-time collaboration
- Email notifications and calendar integration
- Candidate ranking and voting system
- Export functionality for schedules
- Backend integration for data sharing
- Video call integration

## Contributing

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

This project is open source and available under the MIT License.
