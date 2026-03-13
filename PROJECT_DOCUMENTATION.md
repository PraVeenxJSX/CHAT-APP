# 🚀 CHAT APP - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Features](#features)
6. [How Everything Works](#how-everything-works)
7. [API Endpoints](#api-endpoints)
8. [Socket.IO Events](#socketio-events)
9. [Setup & Installation](#setup--installation)
10. [Project Structure](#project-structure)
11. [Design Decisions](#design-decisions)
12. [Interview Q&A](#interview-qa)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Chat App** is a modern, full-stack real-time messaging application that allows users to:
- Register and log in securely
- View a list of all users
- Send and receive messages in real-time
- See typing indicators
- Track online/offline status
- Support multiple message types (text, images, files, audio, stickers)
- Persist all data in MongoDB

**Core Purpose**: Demonstrate a complete full-stack implementation with real-time communication using WebSockets.

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐               │
│  │  Login   │  │ Register │  │   Chat Page  │               │
│  └──────────┘  └──────────┘  └──────────────┘               │
│         │              │              │                      │
│         └──────────────┼──────────────┘                      │
│                        │                                     │
│              ┌─────────▼─────────┐                          │
│              │  AuthContext      │                          │
│              │  SocketContext    │                          │
│              └─────────┬─────────┘                          │
└─────────────────────────┼──────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   HTTP Requests    WebSocket(Socket.IO)   Static Files
   (REST API)       Real-time Events       (Uploads)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Express Server & Routes                 │  │
│  │  /api/auth    /api/users    /api/messages    /api/ai│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Socket.IO Real-time Communication          │  │
│  │  - Message Broadcasting                             │  │
│  │  - Online Status                                    │  │
│  │  - Typing Indicators                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Middleware (Auth, Upload, CORS)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │    MongoDB Database     │
         │  - Users Collection     │
         │  - Messages Collection  │
         └─────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI Library |
| TypeScript | ~5.9.3 | Type Safety |
| React Router | 7.10.1 | Client-side Routing |
| Socket.IO Client | 4.8.1 | Real-time Communication |
| Axios | 1.13.2 | HTTP Requests |
| Tailwind CSS | 4.1.18 | Styling |
| Vite | 7.2.4 | Build Tool |
| jwt-decode | 4.0.0 | JWT Parsing |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | Latest LTS | Runtime |
| Express | 5.2.1 | Web Framework |
| TypeScript | 5.9.3 | Type Safety |
| MongoDB | Latest | Database |
| Mongoose | 9.0.1 | ODM for MongoDB |
| Socket.IO | 4.8.1 | WebSocket Library |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password Hashing |
| Multer | 2.0.2 | File Upload |
| OpenAI | 6.10.0 | AI Integration |

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,              // User's full name
  email: String,             // Unique email
  password: String,          // Hashed with bcrypt (salt rounds: 10)
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

**Key Points:**
- Password is hashed before saving (mongoose pre-save hook)
- Email is unique (cannot have duplicates)
- Methods: `matchPassword(password)` - compares plain password with hash

### Message Collection

```javascript
{
  _id: ObjectId,
  sender: ObjectId,          // Reference to User
  receiver: ObjectId,        // Reference to User
  content: String,           // Message text (required for type: "text")
  type: String,              // "text" | "image" | "file" | "audio" | "sticker"
  fileUrl: String,           // URL if type is not text
  fileType: String,          // MIME type (e.g., "image/png", "application/pdf")
  status: String,            // "sent" | "delivered" | "read"
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

**Key Points:**
- `content` is required only for text messages
- `fileUrl` and `fileType` used for non-text messages
- Status tracks message delivery state
- Sender and receiver reference User documents

---

## Features

### ✅ User Authentication
- **Registration**: Create account with name, email, password
- **Login**: Email + password authentication
- **Password Security**: Hashed with bcryptjs (10 salt rounds)
- **Session Persistence**: Token stored in localStorage, restored on app reload
- **JWT Token**: Contains user id, name, email (payload decoded without verification on client)

### ✅ Real-time Messaging
- **Instant Delivery**: Messages sent via WebSocket (Socket.IO)
- **Message History**: Persist in MongoDB, fetchable anytime
- **Message Types**: Text, Images, Files, Audio, Stickers
- **Message Status**: Sent → Delivered → Read
- **Bidirectional**: Sender and receiver both see messages immediately

### ✅ Online/Offline Status
- **Online Indicator**: Green dot next to active users
- **Real-time Updates**: Uses Socket.IO rooms to track connections
- **Broadcast**: Server broadcasts online users list to all clients

### ✅ Typing Indicator
- **Live Feedback**: "User is typing..." appears in real-time
- **Auto-dismiss**: Disappears after user stops typing
- **Lightweight**: No database writes, only Socket.IO events

### ✅ Protected Routes
- **Route Guard**: `/chat` requires valid authentication
- **Redirect**: Unauthenticated users sent to login page
- **Token Validation**: Both client-side (context) and server-side (middleware)

### ✅ Responsive Design
- **Mobile-friendly**: Tailwind CSS responsive classes
- **Sidebar Toggle**: Collapses on mobile for better UX
- **Auto-scroll**: Messages list scrolls to newest message

### ✅ File Upload Support
- **Multer Integration**: Server-side file upload handling
- **Supported Types**: Images, PDFs, Audio, any file type
- **Storage**: Files saved to `/uploads` folder
- **Static Serving**: Accessible via `/uploads/{filename}`

---

## How Everything Works

### 1. User Registration & Login Flow

#### Registration Process:
```
1. User fills form: name, email, password
2. Frontend POST /api/auth/register { name, email, password }
3. Server validates:
   - Email not already in database
   - Password meets requirements (if any)
4. Password hashed with bcryptjs (10 rounds)
5. User document created in MongoDB
6. JWT token generated (contains user id, name, email)
7. Token sent back to frontend
8. Frontend decodes JWT, extracts user info
9. Token stored in localStorage
10. User redirected to /chat
```

#### Login Process:
```
1. User enters email & password
2. Frontend POST /api/auth/login { email, password }
3. Server finds user by email
4. Compare provided password with hashed password
5. If match:
   - Generate JWT token
   - Send token to frontend
6. If no match:
   - Return 401 Unauthorized
```

#### Session Persistence:
```
1. App loads
2. AuthContext checks localStorage for token
3. If token exists:
   - Decode JWT to extract user data
   - Set AuthContext state
   - User logged in automatically
4. If token invalid or missing:
   - User must log in again
5. Token sent in header: "Authorization: Bearer {token}"
```

---

### 2. Real-time Messaging Architecture

#### Socket.IO Connection Flow:

**Client Side:**
```typescript
// In Chat.tsx useEffect
const socket = connectSocket(token);
socket.emit("join", { userId: user._id });

socket.on("receiveMessage", (msg: Message) => {
  setMessages((prev) => [...prev, msg]);
});
```

**Server Side:**
```typescript
// In socket.ts
io.use((socket, next) => {
  // Authenticate socket connection using JWT token
  const token = socket.handshake.query.token;
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.userId = decoded.id;
  next();
});

io.on("connection", (socket) => {
  socket.join(socket.userId); // Add user to their own room
  // Now server can target this user: io.to(userId).emit(...)
});
```

#### Sending a Message:

```
USER A                          SERVER                          USER B
   │                               │                               │
   │─── socket.emit(               │                               │
   │     "sendMessage",            │                               │
   │     {receiver, content}       │                               │
   │   )                           │                               │
   │                               │                               │
   │                         Create Message Doc                   │
   │                         in MongoDB                            │
   │                               │                               │
   │                               ├──► io.to(receiverId)         │
   │                               │     .emit("receiveMessage")  │
   │                               │                        ├──► Update UI
   │                               │                        │    Show message
   │                               │                               │
   │◄──────────────────────────────┤                               │
   │ io.to(userId)                 │                               │
   │ .emit("receiveMessage")       │                               │
   │ (status: "sent")              │                               │
   │                               │                               │
Update UI
Show message
```

**Key Points:**
- Message saved to MongoDB immediately
- Receiver gets notification via Socket.IO
- Sender also receives their message (to update UI)
- Status differs: sender sees "sent", receiver sees "delivered"

---

### 3. Online Users Tracking

```typescript
// Server-side socket.ts
const onlineUsers = new Set<string>(); // Track all online user IDs

io.on("connection", (socket) => {
  const userId = socket.userId;
  
  // Add to online set
  onlineUsers.add(userId);
  
  // Broadcast to ALL clients
  io.emit("onlineUsers", Array.from(onlineUsers));
  
  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("onlineUsers", Array.from(onlineUsers)); // Update all
  });
});
```

**Frontend:**
```typescript
socket.on("onlineUsers", (users: string[]) => {
  setOnlineUsers(users);
  // Render green dot for users in this array
});
```

---

### 4. Typing Indicator

```
USER A TYPES                    SERVER                          USER B
   │                               │                               │
   │─── socket.emit(               │                               │
   │     "typing",                 │                               │
   │     {receiver}                │                               │
   │   )                           │                               │
   │                               │                               │
   │                               ├──► io.to(receiverId)         │
   │                               │     .emit("typing",          │
   │                               │            {sender})         │
   │                               │                        ├──► setTypingUser(senderId)
   │                               │                        │    Show "typing..."
   │                               │                               │
   │ (user stops typing after 1s)  │                               │
   │                               │                               │
   │─── socket.emit(               │                               │
   │     "stopTyping",             │                               │
   │     {receiver}                │                               │
   │   )                           │                               │
   │                               │                               │
   │                               ├──► io.to(receiverId)         │
   │                               │     .emit("stopTyping",      │
   │                               │            {sender})         │
   │                               │                        ├──► setTypingUser(null)
   │                               │                        │    Hide "typing..."
```

---

### 5. Authentication Middleware

**Protected HTTP Routes:**
```typescript
// server/middleware/auth.middleware.ts
export const protect = async (req, res, next) => {
  let token;
  
  // Extract token from "Authorization: Bearer {token}"
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id);
      next(); // Continue to route handler
    } catch {
      res.status(401).json({ message: "Not authorized" });
    }
  } else {
    res.status(401).json({ message: "No token provided" });
  }
};

// Usage in routes:
router.get("/messages/:userId", protect, getMessages);
```

**Protected Socket.IO Connection:**
```typescript
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next(); // Connection allowed
  } catch {
    next(new Error("Authentication error"));
  }
});
```

---

### 6. Frontend State Management

#### AuthContext:
```typescript
interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  
  // Restore session on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      const decoded = jwtDecode(savedToken);
      setToken(savedToken);
      setUser(decoded);
    }
  }, []);
  
  const login = (token) => {
    localStorage.setItem("token", token);
    setToken(token);
    const decoded = jwtDecode(token);
    setUser(decoded);
  };
  
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

#### ProtectedRoute Component:
```typescript
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  
  if (!token) {
    return <Navigate to="/" />;
  }
  
  return children;
};
```

---

### 7. Message Fetching & Display

```typescript
// In Chat.tsx
useEffect(() => {
  if (!selectedUser || !token) return;
  
  // Fetch chat history
  api.get(`/api/messages/${selectedUser._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((res) => setMessages(res.data));
  
  // Mark messages as seen
  getSocket().emit("markSeen", { senderId: selectedUser._id });
}, [selectedUser, token]);

// Real-time updates
useEffect(() => {
  const socket = connectSocket(token);
  
  socket.on("receiveMessage", (msg) => {
    setMessages((prev) => [...prev, msg]);
  });
  
  return () => disconnectSocket();
}, [token]);
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST `/api/auth/login`
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register

---

### User Routes (`/api/users`)

#### GET `/api/users`
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Alice",
    "email": "alice@example.com"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Bob",
    "email": "bob@example.com"
  }
]
```
**Note:** Current user excluded from list

---

### Message Routes (`/api/messages`)

#### GET `/api/messages/:userId`
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "_id": "507f191e810c19729de860ea",
    "sender": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe"
    },
    "receiver": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Doe"
    },
    "content": "Hello!",
    "type": "text",
    "status": "read",
    "createdAt": "2024-01-28T10:30:00Z"
  }
]
```

---

## Socket.IO Events

### Client → Server Events

#### `join`
Manually joins user's room (called on connection)
```javascript
socket.emit("join", { userId: user._id });
```

#### `sendMessage`
Sends a new message
```javascript
socket.emit("sendMessage", {
  receiver: "607f1f77bcf86cd799439012",
  content: "Hello there!"
});
```

#### `typing`
Notifies receiver that user is typing
```javascript
socket.emit("typing", { receiver: "607f1f77bcf86cd799439012" });
```

#### `stopTyping`
Notifies receiver that user stopped typing
```javascript
socket.emit("stopTyping", { receiver: "607f1f77bcf86cd799439012" });
```

#### `markSeen`
Marks messages as read
```javascript
socket.emit("markSeen", { senderId: "607f1f77bcf86cd799439012" });
```

---

### Server → Client Events

#### `receiveMessage`
Broadcast when a new message is sent
```javascript
{
  _id: "607f191e810c19729de860ea",
  sender: { _id: "...", name: "..." },
  receiver: { _id: "...", name: "..." },
  content: "Hello!",
  status: "delivered",
  createdAt: Date,
  type: "text"
}
```

#### `onlineUsers`
Broadcast list of online user IDs
```javascript
["607f1f77bcf86cd799439011", "607f1f77bcf86cd799439012"]
```

#### `typing`
Notifies that a user is typing
```javascript
{ sender: "607f1f77bcf86cd799439011" }
```

#### `stopTyping`
Notifies that a user stopped typing
```javascript
{ sender: "607f1f77bcf86cd799439011" }
```

#### `messageSeen`
Notifies sender that message was read
```javascript
{ senderId: "607f1f77bcf86cd799439012" }
```

---

## Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # .env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
   JWT_SECRET=your_jwt_secret_key_here
   PORT=5000
   OPENAI_API_KEY=sk-... (optional, for AI features)
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   
   Server starts on `http://localhost:5000`

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Frontend Setup

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # .env
   VITE_API_URL=http://localhost:5000
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   
   App available on `http://localhost:5173`

5. **Build for production:**
   ```bash
   npm run build
   ```

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB
# Then in .env:
MONGO_URI=mongodb://localhost:27017/chatapp
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
   ```

---

## Project Structure

```
CHAT-APP/
├── client/                          # Frontend (React)
│   ├── src/
│   │   ├── App.tsx                 # Main router
│   │   ├── main.tsx                # Entry point
│   │   ├── index.css               # Global styles
│   │   ├── socket.ts               # Socket.IO connection
│   │   │
│   │   ├── api/
│   │   │   ├── axios.ts            # Axios instance
│   │   │   ├── auth.ts             # Auth API calls
│   │   │   ├── message.ts          # Message API calls
│   │   │   └── user.ts             # User API calls
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx     # Global auth state
│   │   │   └── SocketContext.tsx   # Socket.IO context
│   │   │
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx  # Route guard
│   │   │   ├── AuthVideoBackground.tsx
│   │   │   ├── ChatList.tsx        # User list
│   │   │   ├── MessageList.tsx     # Messages display
│   │   │   └── MessageInput.tsx    # Input field
│   │   │
│   │   └── pages/
│   │       ├── Login.tsx           # Login page
│   │       ├── Register.tsx        # Register page
│   │       └── Chat.tsx            # Main chat page
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── eslint.config.js
│
├── server/                          # Backend (Node.js)
│   ├── src/
│   │   ├── server.ts               # Server entry point
│   │   ├── app.ts                  # Express app setup
│   │   │
│   │   ├── config/
│   │   │   └── db.ts               # MongoDB connection
│   │   │
│   │   ├── models/
│   │   │   ├── User.ts             # User schema & methods
│   │   │   └── Message.ts          # Message schema
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   └── ai.controller.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── message.routes.ts
│   │   │   ├── ai.routes.ts
│   │   │   └── upload.routes.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  # JWT verification
│   │   │   └── upload.ts           # Multer config
│   │   │
│   │   ├── socket/
│   │   │   └── socket.ts           # Socket.IO setup
│   │   │
│   │   ├── types/
│   │   │   └── express.d.ts        # Express type extensions
│   │   │
│   │   └── utils/
│   │       └── generateToken.ts    # JWT generation
│   │
│   ├── uploads/                    # Uploaded files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── PROJECT_DOCUMENTATION.md        # This file
```

---

## Design Decisions

### 1. Socket.IO for Real-time Communication

**Why?**
- Automatic fallback from WebSocket to HTTP long-polling
- Simple event-based API
- Built-in room system for targeting specific users
- Better than polling (less bandwidth, real-time)

**Alternative:** WebRTC, gRPC, MQTT - Socket.IO is industry standard for web chat

---

### 2. JWT Authentication

**Why?**
- Stateless (no session storage needed)
- Works perfectly with Socket.IO
- Token contains all needed user info
- Can be decoded on client without secret key

**Token Structure:**
```
Header: { alg: "HS256", typ: "JWT" }
Payload: { id: "...", name: "...", email: "..." }
Signature: hmac(header.payload, JWT_SECRET)
```

**Flow:**
1. Backend creates token on login/register
2. Frontend stores in localStorage
3. Frontend sends in every API request header
4. Backend verifies signature using JWT_SECRET
5. Frontend decodes (without verification) to show user info

---

### 3. MongoDB + Mongoose

**Why?**
- Flexible schema (supports different message types)
- Scalable for real-time applications
- References between collections (User-Message relationships)
- Timestamps auto-managed

**Alternative:** PostgreSQL - would require more schema planning

---

### 4. Context API (not Redux)

**Why?**
- Simpler setup, less boilerplate
- Sufficient for this app's state complexity
- Built into React, no additional dependencies
- Perfect for authentication state

**When to upgrade to Redux:**
- Deeply nested component trees
- Complex global state interactions
- Time-travel debugging needed

---

### 5. Socket.IO Rooms for User Targeting

**Why?**
```typescript
socket.join(userId); // Each user in their own room

// Later: Send message only to specific user
io.to(receiver).emit("receiveMessage", msg);
```

**Benefits:**
- Efficient: Only target user receives event
- Scalable: Server doesn't broadcast to all users
- Simple: No need for manual user tracking

---

### 6. Real-time UI Updates

**Why both sides receive messages?**
```typescript
// Receiver gets notification
io.to(receiver).emit("receiveMessage", msg);

// Sender also gets their own message (optimistic UI)
io.to(userId).emit("receiveMessage", msg);
```

**Benefits:**
- Sender sees message immediately
- Both sides in sync
- No lag from database round-trip

---

### 7. File Upload with Multer

**Why not base64 encoding?**
- Base64 increases payload size by 33%
- Multer handles streaming (memory efficient)
- Better for large files

**Flow:**
1. Client sends FormData with file
2. Multer stores file in `/uploads`
3. Backend creates message with fileUrl
4. Client displays image/file from URL

---

## Interview Q&A

### Q1: Walk me through the authentication flow

**Answer:**
"When a user registers or logs in, they provide credentials. The backend validates these and creates a JWT token containing the user's id, name, and email. This token is sent to the frontend, decoded using jwt-decode library, and stored in localStorage.

AuthContext manages this token and user data globally. On subsequent app loads, we check localStorage for the token and restore the session automatically. All API requests include the token in the Authorization header as 'Bearer {token}', which the auth middleware on the backend verifies using the JWT_SECRET.

For socket connections, the token is passed as a query parameter and validated before allowing the connection."

---

### Q2: How does real-time messaging work?

**Answer:**
"We use Socket.IO for WebSocket communication. When a message is sent, the client emits a 'sendMessage' event containing the receiver ID and message content.

The server receives this, creates a Message document in MongoDB, and then emits the message to both the receiver and sender using Socket.IO rooms. Each user is automatically joined to a room named after their userId, so the server can target them directly with io.to(userId).emit().

Both sides receive the message in real-time via the 'receiveMessage' event listener, update their local state, and the UI renders the new message immediately. The sender sees status 'sent', while the receiver sees 'delivered'."

---

### Q3: How do you handle offline users?

**Answer:**
"All messages are saved to MongoDB regardless of whether the receiver is online. When a user reconnects and selects a conversation, we fetch the chat history from the database using GET /api/messages/{userId}.

The Socket.IO connection includes online status tracking - we maintain a Set of online user IDs on the server and broadcast this list to all connected clients. Offline users won't be in this list, so we can show a grey indicator instead of green online status.

If unread message notifications are needed (not currently implemented), we could add a notification system in the database and push notifications via email or mobile."

---

### Q4: What's the purpose of marking messages as seen?

**Answer:**
"The message status field has three states: 'sent', 'delivered', and 'read'. 

- 'sent': Message created and sent to receiver
- 'delivered': Receiver received it (message shown on screen)
- 'read': Receiver explicitly saw it (scrolled into view or marked)

When a user opens a chat with someone, we emit a 'markSeen' event to mark all messages from that sender as read. This lets the sender know their messages were seen, providing better user experience like traditional messaging apps (WhatsApp, iMessage)."

---

### Q5: Why use Context API instead of Redux?

**Answer:**
"For this application, Context API is sufficient because we primarily need to manage two pieces of global state: the authentication token and user information.

Redux would add significant boilerplate with actions, reducers, and selectors for minimal benefit here. Context API is built into React, requires less setup, and works perfectly for simpler state management.

If the app scaled to have complex state interactions across many deeply nested components, or if we needed time-travel debugging for development, we'd consider Redux or similar state management libraries."

---

### Q6: How is password security handled?

**Answer:**
"Passwords are never stored in plaintext. When a user registers, the password goes through bcryptjs with 10 salt rounds before being stored.

Bcrypt is a slow hashing algorithm specifically designed for passwords - it's intentionally slow to resist brute-force attacks. When a user logs in, we use the matchPassword method to compare the provided password against the stored hash.

The comparison is constant-time, meaning it always takes the same amount of time regardless of whether the password is correct, preventing timing attacks.

In production, we should also use HTTPS to encrypt data in transit, implement rate limiting on login endpoints, and consider adding 2FA."

---

### Q7: What happens when the server crashes?

**Answer:**
"Socket.IO has built-in reconnection logic. When the server goes down, the client detects the disconnection and automatically attempts to reconnect with exponential backoff.

While disconnected, the client can't send messages in real-time, but all messages are still queued and can be sent once reconnected. Users won't see real-time updates but can still use the REST API if the server comes back online.

For production reliability, we'd implement:
1. Load balancing across multiple server instances
2. Message queuing system (Redis, RabbitMQ) so messages don't get lost
3. Database clustering for high availability
4. Health checks and auto-recovery"

---

### Q8: How do you scale this to thousands of users?

**Answer:**
"The current architecture has several bottlenecks for large scale:

**Current Setup:**
- Single server with all Socket.IO connections
- Each connection consumes server memory
- Broadcasting to all users is inefficient

**Scaling Strategies:**

1. **Load Balancing:**
   - Multiple Node.js servers behind a load balancer
   - Socket.IO needs sticky sessions (route same user to same server)
   - Or use Redis adapter to sync Socket.IO events across servers

2. **Redis Adapter:**
   ```javascript
   // Enables Socket.IO to work across multiple servers
   const adapter = require('@socket.io/redis-adapter');
   io.adapter(adapter({ host: 'localhost', port: 6379 }));
   ```

3. **Message Queue:**
   - Use message brokers like RabbitMQ for asynchronous message delivery
   - Prevents bottlenecks when receivers are offline

4. **Database Optimization:**
   - Add indexes on sender/receiver fields
   - Implement message pagination (load older messages on scroll)
   - Archive old messages to separate storage

5. **CDN for File Uploads:**
   - Move file storage to S3 or Azure Blob Storage
   - Use CDN for faster delivery

6. **Horizontal Scaling:**
   - Container deployment (Docker + Kubernetes)
   - Auto-scaling based on CPU/memory usage"

---

### Q9: What about message encryption?

**Answer:**
"Currently, messages are transmitted over HTTPS/WebSocket and stored in plaintext in MongoDB. For enhanced security:

**End-to-End Encryption:**
- Client encrypts message before sending
- Only sender and receiver have decryption key
- Server can't see message content

**Implementation Options:**
1. TweetNaCl.js / libsodium - Cryptographic library
2. TweetCrypt - Pre-built for this use case
3. OpenPGP.js - OpenPGP implementation

**Trade-offs:**
- Adds complexity on client and server
- Can't implement server-side search
- Better user privacy and security
- Industry standard for high-security apps"

---

### Q10: How do you handle message ordering with Socket.IO?

**Answer:**
"Socket.IO preserves message order on a single connection - messages arrive in the order they were sent.

However, if a user is connected via multiple tabs/windows, they might receive duplicate events. To handle this:

1. **Use message IDs:**
   ```typescript
   socket.on('receiveMessage', (msg) => {
     // Check if message already in state
     if (!messages.find(m => m._id === msg._id)) {
       setMessages(prev => [...prev, msg]);
     }
   });
   ```

2. **Use timestamps:**
   - Sort messages by createdAt timestamp
   - Handles late-arriving messages

3. **Fetch history:**
   - When opening a chat, fetch full history from database
   - Ensures correct order regardless of connection issues"

---

## Troubleshooting

### Issue: "Socket connection fails with 'Authentication error'"

**Solution:**
1. Check token is valid and not expired
2. Ensure JWT_SECRET on server matches what client expects
3. Verify socket is initialized with token:
   ```typescript
   const socket = io('http://localhost:5000', {
     query: { token: authToken }
   });
   ```

### Issue: "Messages not appearing for receiver"

**Solution:**
1. Verify receiver is connected (check onlineUsers list)
2. Check server logs for Socket.IO events
3. Ensure correct receiver ID is being used
4. Check Message is saved to database (check MongoDB)
5. Verify socket rooms are set up correctly

### Issue: "CORS errors from frontend to backend"

**Solution:**
1. Check CORS is enabled in express app:
   ```typescript
   app.use(cors());
   ```
2. Or configure specific origins:
   ```typescript
   app.use(cors({
     origin: process.env.FRONTEND_URL
   }));
   ```
3. Check Socket.IO CORS settings:
   ```typescript
   const io = new Server(server, {
     cors: { origin: "*" }
   });
   ```

### Issue: "File uploads not working"

**Solution:**
1. Verify Multer is configured in middleware
2. Check `/uploads` folder exists and is writable
3. Ensure form sends multipart/form-data
4. Check file size limits in Multer config

### Issue: "Typing indicator stuck"

**Solution:**
1. Add timeout to auto-clear typing status:
   ```typescript
   useEffect(() => {
     if (typingUser) {
       const timer = setTimeout(() => setTypingUser(null), 3000);
       return () => clearTimeout(timer);
     }
   }, [typingUser]);
   ```
2. Always emit 'stopTyping' when input loses focus

---

## Summary

This Chat Application demonstrates a complete full-stack implementation with:

✅ **Frontend:** React + TypeScript with real-time updates via Socket.IO
✅ **Backend:** Express + MongoDB with REST API and WebSocket server
✅ **Authentication:** JWT-based secure authentication
✅ **Real-time:** Socket.IO for instant messaging and status updates
✅ **Database:** MongoDB with Mongoose for data persistence
✅ **Security:** Password hashing, token validation, CORS configuration
✅ **Scalability:** Foundation for horizontal scaling with proper separation of concerns

Perfect for learning full-stack development, interview preparation, and as a starter template for messaging applications!

---

**Last Updated:** January 28, 2026
