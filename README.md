# Smart Academic Assistant

A comprehensive Firebase-backed educational platform with role-based access control, automated scheduling, analytics, and AI features.

## 🚀 Features

- **Gmail-Only Authentication**: Secure access restricted to @gmail.com accounts
- **Role-Based Access**: Admin, Faculty, and Student roles with different permissions
- **Automated Timetabling**: Generate clash-free schedules using backtracking algorithms
- **Student Analytics**: Predict student outcomes with ML-powered insights
- **Question Prediction**: AI-driven analysis of high-weightage exam questions
- **AI Chatbot**: Intelligent assistant for faculty and administrators
- **Raycast-Inspired UI**: Modern, animated interface with dark theme

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Routing**: React Router

## 📦 Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Configure Firebase:
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Google Sign-In in Authentication
   - Create a Firestore database
   - Copy your Firebase config to \`src/config/firebase.js\`

3. Run development server:
\`\`\`bash
npm run dev
\`\`\`

## 🔐 Firebase Setup

### Firestore Collections

- \`users\`: User profiles with roles
- \`students\`: Student academic records
- \`timetables\`: Generated schedules
- \`questions\`: Predicted questions

### Security Rules

Deploy the rules from \`firestore.rules\` to ensure:
- Gmail-only access
- Role-based permissions
- Data isolation

## 🎨 Raycast Design

The UI features:
- Dark theme with vibrant gradients
- Smooth animations and transitions
- Responsive layout (mobile to desktop)
- Inter font for modern typography

## 📝 User Roles

### Admin (Head User)
- Full system access
- User management
- All module access

### Faculty (Super User)
- Timetable generation
- Student data management
- Question paper analysis
- AI chatbot access

### Student (Normal User)
- View personal records
- Access predicted questions
- View timetable (read-only)

## 🚧 Development Notes

- Firebase credentials are placeholder values - update before deployment
- ML models use rule-based logic initially (replace with trained models for production)
- Chatbot uses mock responses (integrate LLM API for production)

## 📄 License

MIT License - feel free to use and modify!
