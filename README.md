# WG Casting App

A mobile-first web application for shared flats (WG) to organize casting interviews for new tenants.

## Features

### 🗓️ Availability Calendar
- **When2meet-style interface** with monthly view
- Days on X-axis, hours (10:00–22:00) on Y-axis
- Tap and drag to mark availability blocks
- Visual heatmap showing overlapping availabilities
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

### 💾 Data Persistence
- All data stored locally using localStorage
- No backend required for the first version
- Automatic save on every change
- User session management

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
4. Start the development server:
   ```bash
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

## How to Use

### Setting Up Availability
1. Go to the **Calendar** tab
2. Select a date from the month view
3. Tap and drag on time slots (10:00-22:00) to mark your availability
4. Green blocks show your availability
5. Numbers show how many people are available at each time
6. Double-click any time slot to add notes (e.g., "phone only")

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
- **React** 18+ with TypeScript
- **TailwindCSS** for styling
- **localStorage** for data persistence
- Mobile-first responsive design

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
