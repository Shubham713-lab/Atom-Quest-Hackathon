# GoalPortal - Enterprise Goal Setting & Tracking

GoalPortal is a modern, responsive, and data-driven employee dashboard application built for the **Atom Quest Hackathon**. It transitions a traditional, monolithic goal-tracking process into a sleek, modular, route-based web application with strict role-based access control, automated compliance, and real-time analytics.

## 🚀 Key Features

### Role-Based Access Control
The application features three distinct user personas, each with dedicated dashboards and permissions:
- **Employee**: Can create goals, submit them for review, and log quarterly check-ins on approved targets. Features a personalized "My Analytics" dashboard.
- **Manager (L1)**: Dedicated "Inbox" style dashboard to review, approve, reject, or return goals for rework. Supports **Bulk Approvals** and continuous feedback logging.
- **Admin / HR**: Has total oversight of the system. Can manage users, push organization-wide Shared KPIs, monitor audit trails, track completion rates, and view high-level analytics.

### Automated Compliance & Escalations
- **Strict Quarterly Windows**: Check-ins and goal creation are enforced based on the active month. 
- **Time Travel Simulator (Dev Tool)**: Built-in feature for admins to override the system clock during hackathon demonstrations to test the quarterly window logic.
- **Rule-Based Escalation Engine**: Automatically flags SLAs and notifies management when goals are unsubmitted or check-ins are missed.

### Real-Time Notification System
- An integrated Notification Bell in the global header connects to Firebase via `onSnapshot`.
- **Managers** get pinged instantly when an Employee logs a check-in.
- **Employees** get pinged instantly when a Manager approves or rejects their goal.

### Advanced Analytics
- Powered by `recharts`, the platform features responsive data visualization.
- **Employee View**: Progress breakdown, Thrust Area distribution, and average completion score.
- **Admin View**: Organization-wide completion rates, goal status distributions, manager effectiveness tracking, and simulated Quarter-over-Quarter trajectory.

## 🛠 Tech Stack

- **Frontend Framework**: React (Bootstrapped with Vite)
- **Styling**: Tailwind CSS (with Lucide React for iconography)
- **Routing**: React Router DOM v6
- **Charts/Visualization**: Recharts
- **Backend / Database**: Firebase (Authentication & Firestore NoSQL Database)

## 📦 Local Setup & Installation

1. **Clone the repository** (if not already cloned)
2. **Navigate to the project directory**:
   ```bash
   cd "Atom Quest Hackathon"
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Variables**:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```

## 🎮 Hackathon Demo Guide

When presenting the application, we recommend the following flow:
1. **Showcase Roles**: Log in as an Admin, Manager, and Employee in separate windows.
2. **Goal Lifecycle**: As an Employee, create a goal. Switch to the Manager to show the "Action Inbox" and approve the goal (triggering a real-time notification to the Employee).
3. **Time Travel**: As an Admin, go to User Management and use the **Time Travel Simulator** to skip ahead to a "Check-in" month.
4. **Log Actuals**: Switch back to the Employee and log an actual achievement on the approved goal.
5. **Analytics**: Log into the Admin dashboard and navigate to "Analytics & Insights" to show the real-time Recharts visualizations.

---
*Built with ❤️ for the Atom Quest Hackathon.*
