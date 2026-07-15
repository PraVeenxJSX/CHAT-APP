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
| Tailwind CSS | 4.1.18 | Styling (v4 with Vite integration) |
| Vite | 7.2.4 | Build Tool |
| jwt-decode | 4.0.0 | JWT Parsing |
| Three.js / R3F / Drei | 0.185.1 | 3D Graphics (Landing Canvas, interactive phoenix companion) |
| Framer Motion | 12.42.2 | Interactive UI transitions & page reveals |
| GSAP / Animejs | Latest | High-fidelity landing page micro-animations |
| Lenis | 1.3.25 | Smooth scrolling |
| wavesurfer.js | 7.12.4 | Audio waveform rendering & playback |
| emoji-picker-react | 4.18.0 | Message reaction and emoji input panel |
| @react-oauth/google | 0.13.4 | Google Sign-in client library |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | Latest LTS | Runtime |
| Express | 5.2.1 | Web Framework (v5) |
| TypeScript | 5.9.3 | Type Safety |
| MongoDB | Latest | Database |
| Mongoose | 9.0.1 | ODM for MongoDB |
| Socket.IO | 4.8.1 | WebSocket Library |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password Hashing |
| Multer | 2.0.2 | File & audio upload streaming |
| OpenAI | 6.10.0 | AI Smart Replies Integration (gpt-4o-mini) |
| google-auth-library | 10.6.1 | Verifying Google Sign-in ID tokens |

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,                      // User's full display name (required)
  username: String,                  // Unique username (sparse, lowercased, validated)
  email: String,                     // Unique email (required)
  password: String,                  // Hashed with bcryptjs (salt rounds: 10) (optional for Google OAuth)
  googleId: String,                  // Google profile ID (optional, for OAuth linkage)
  avatar: String,                    // Path to profile image (uploads/...) or Google picture URL
  statusMessage: String,             // Custom status message (default: "")
  dob: String,                       // Date of birth (YYYY-MM-DD)
  showDob: Boolean,                  // Privacy setting to expose DOB (default: false)
  showOnlineStatus: Boolean,         // Privacy setting to show active indicator (default: true)
  createdAt: Date,                   // Auto-generated
  updatedAt: Date                    // Auto-generated
}
```

**Key Points:**
- Password is automatically hashed on pre-save if modified.
- Google OAuth links automatically to password-based accounts sharing the same email.
- Real-time checking of @username uniqueness with fallback recommendation engine.

### Message Collection

```javascript
{
  _id: ObjectId,
  sender: ObjectId,                  // Reference to User (required)
  receiver: ObjectId,                // Reference to User (for legacy/direct fallback)
  conversationId: ObjectId,          // Reference to Conversation (direct or group)
  content: String,                   // Message text (required if type is "text")
  type: String,                      // "text" | "image" | "file" | "audio" | "sticker"
  fileUrl: String,                   // URL to asset served statically from /uploads
  fileType: String,                  // MIME type (e.g. image/png, application/pdf, audio/webm)
  status: String,                    // "sent" | "delivered" | "read"
  reactions: [                       // Array of emojis attached to the message
    {
      userId: ObjectId,              // User who reacted
      emoji: String                  // Reaction emoji character
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Collection

```javascript
{
  _id: ObjectId,
  type: String,                      // "direct" | "group" (required)
  participants: [ObjectId],          // References to User documents (indexed)
  name: String,                      // Group name (default: "")
  avatar: String,                    // Group avatar image URL (default: "")
  description: String,               // Group description / rules (default: "")
  admin: ObjectId,                   // Creator / primary owner
  admins: [ObjectId],                // Users with admin capabilities
  onlyAdminsCanMessage: Boolean,     // Restricts message posting to admins (default: false)
  disappearingMessagesSeconds: Number, // Seconds before message disappears (0 = Off)
  mutedMembers: [                    // Array of users who muted notifications
    {
      userId: ObjectId,
      until: Date                    // Date until mute expires (null = infinite)
    }
  ],
  lastMessage: ObjectId,             // Reference to last Message doc
  createdAt: Date,
  updatedAt: Date
}
```

### GroupInvitation Collection

```javascript
{
  _id: ObjectId,
  groupId: ObjectId,                 // Reference to Conversation (group) (required)
  invitedBy: ObjectId,               // Reference to User (required)
  invitedUser: ObjectId,             // Reference to User (required)
  status: String,                    // "pending" | "accepted" | "declined" | "expired"
  inviteCode: String,                // Unique token code (sparse)
  expiresAt: Date,                   // Auto-deleted via MongoDB TTL index (default: 7 days)
  createdAt: Date,
  updatedAt: Date
}
```

---

## Features

### ✅ User Authentication & Accounts
- **Credentials Auth**: Standard registration and login with bcrypt hashing (10 salt rounds).
- **Google OAuth**: Fast login and account linking via Google Sign-In with automated profile image and email verification.
- **Session Persistence**: JWT-based session persistence restored automatically from localStorage on app reload.
- **Profile Settings**: Update display name, customize @username (availability validated on keypress with recommendation system), upload custom avatars, edit status messages, and enter Date of Birth.
- **Privacy Controls**: Toggles to show/hide date of birth and online/offline status indicators.

### ✅ Rich Real-time Messaging
- **Instant WebSocket Delivery**: Immediate message dispatch and broadcast using Socket.IO connection rooms.
- **Message Formats**: Text, images (lightbox preview), static files (downloadable files with icon overlays), audio (microphone voice notes), and stickers.
- **Voice Messages**: Record WebM files using MediaRecorder, upload them via Multer, and render them as interactive waveforms (using `wavesurfer.js`) with custom playback controls.
- **Seen Status Tracking**: Tracks sent → delivered → seen status syncs.
- **Typing Indicators**: Live typing notifications ("User is typing...") that dismiss on stopped-typing triggers and auto-clear timeouts.
- **Message Reactions**: Attach and toggle emojis on any message bubble, sync-broadcasting reaction arrays in real-time.

### ✅ Group Conversations & Management
- **Group Creation**: Create group dialog with multi-member selection, custom names, and descriptions.
- **Group Settings Panel**: Update group name, description, and avatar; add members, promote/demote administrators, and remove participants.
- **Permissions Restricting**: Admin toggle to restrict write permissions to group admins only.
- **Mute Alerts**: Option to mute group conversation notifications for 8 hours, 1 week, or Always.
- **Disappearing Messages**: Automatically age-out and clear old messages after 24 hours, 7 days, or 90 days.
- **Invitation Network**: Create direct pending group invitations, list active pending invitations, or share link codes to invite users directly.

### ✅ WebRTC Audio & Video Calling
- **WebRTC Peer-to-Peer Calls**: One-to-one and group voice/video calls.
- **Perfect Negotiation**: Perfect negotiation mesh WebRTC client protocol (`useWebRTC.ts`) handling polite/impolite states, rolling back SDP collision states, and negotiating track changes.
- **ICE Configuration Endpoints**: STUN/TURN connection routes serving Google STUN and custom TURN credentials.
- **Audio/Video Layouts**: Responsive remote user video grid, local PiP stream overlay, and active mic/camera toggles.
- **Call Minimization**: Call screen minimizes to a floating status bubble (caller name + elapsed time) so users can browse chats and type messages during calls.

### ✅ AI-Powered Smart Replies
- **Smart suggestions**: Renders 4 AI-generated contextual reply boxes tailored to the last received text message.
- **Context Generation**: Queries OpenAI (`gpt-4o-mini`) via server-side controller, receiving strict prompt-formatted array suggestions in real-time.

### ✅ Premium UI/UX & Design
- **Responsive Layout**: Sidebar collapses on mobile devices to optimize workspace real estate.
- **High-Fidelity Animations**: Animated page transitions with Framer Motion, micro-animations with GSAP/Anime.js, and smooth scrolling with Lenis.
- **Interactive 3D WebGL Elements**: Landing page featuring a Three.js interactive Canvas with floating 3D orbits that explode into particle rings on hover and click.
- **3D Phoenix Companion**: Interactive WebGL bird model perched on active orbits, flying between orbits on burst, and tracking mouse coordinate movements.

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

### 8. Google OAuth Authentication Flow

```
1. Client initializes @react-oauth/google provider.
2. User clicks "Sign in with Google" button.
3. Google client SDK performs authentication and returns an ID Token credential.
4. Frontend POSTs `/api/auth/google` with { credential }.
5. Server validates token using OAuth2Client.verifyIdToken() from google-auth-library.
6. Extract profile info: email, name, avatar (picture URL), and googleId.
7. Checks if a user already exists in MongoDB with this googleId or email:
   - If user exists by email but googleId is unlinked, update document with googleId and picture avatar.
   - If user doesn't exist, create a new User document using email prefix as display name.
8. Server returns generated JWT token containing user info.
9. Client updates AuthContext, stores token, and redirects to /chat.
```

---

### 9. WebRTC Calling & Signaling Flow

WebRTC establishes peer-to-peer media streaming using Socket.IO as a signaling channel.

#### Signaling Flow Diagram:
```
Caller (Offerer)                 Socket.IO Server                 Callee (Answerer)
    │                                  │                                  │
    │─── call:invite ─────────────────►│                                  │
    │    (type, target, caller)        │─── call:invite ─────────────────►│
    │                                  │    (show incoming modal)         │
    │                                  │                                  │
    │                                  │◄── call:accept (or reject) ──────│
    │◄── call:accept ──────────────────│                                  │
    │                                  │                                  │
    │   [Perfect Negotiation Setup]    │                                  │
    │   (Create PeerConnection,        │                                  │
    │    impolite = true)              │    [Perfect Negotiation Setup]   │
    │                                  │    (Create PeerConnection,       │
    │─── call:offer ──────────────────►│     impolite = false)            │
    │    (SDP offer)                   │─── call:offer ──────────────────►│
    │                                  │                                  │
    │                                  │◄── call:answer ──────────────────│
    │◄── call:answer ──────────────────│    (SDP answer)                  │
    │    (SDP answer)                  │                                  │
    │                                  │                                  │
    │─── call:ice ────────────────────►│                                  │
    │    (ICE candidate)               │─── call:ice ────────────────────►│
    │                                  │    (ICE candidate)               │
    │◄── call:ice ─────────────────────│◄── call:ice ─────────────────────│
    │                                  │                                  │
    │                 ===================================                 │
    │                 ==== Peer-to-Peer Media Flow ======                 │
    │                 ===================================                 │
```

#### Perfect Negotiation Rules:
- The caller is designated as **impolite** (initiates all session description negotiations, ignores collision offers from callee).
- The callee is designated as **polite** (rolls back their own local description state if a signaling collision happens, accepting the impolite offer instead).
- This approach avoids signaling state deadlocks in multi-device group calling.
- Track changes (e.g. mic/cam mute/unmute) automatically trigger renegotiation, exchanging updated SDP declarations.

---

### 10. Group Chats & Administrative Permissions

Group chats introduce shared conversations containing multiple participants:
- **Conversation Documents**: Store type (`"group"`), `participants` IDs, `admin` owner, and an array of `admins`.
- **Admin Verification**: Middleware and sockets check user roles:
  ```typescript
  const isAdmin = conversation.admin.toString() === userId || conversation.admins.includes(userId);
  ```
- **Only Admins Can Message**: If true, when a non-admin emits `sendMessage`, the Socket.IO handler rejects the event, returning a `sendMessageError` to the client.
- **Disappearing Messages**: Frontend/backend check disappearing seconds settings and schedule cleanup.
- **Mute Settings**: Users can mute group alerts. The server stores `{ userId, until }` in `mutedMembers` to exclude users from active push/notification workflows.

---

### 11. AI Reply Suggestions

```
1. Client receives a new message via Socket.IO: receiveMessage.
2. If the message type is "text" and from a remote partner, trigger suggestions fetching.
3. Client calls POST /api/ai/suggestions with { message: content } in body.
4. Controller receives message content, checks OPENAI_API_KEY.
5. Create OpenAI chat completion:
   - Model: gpt-4o-mini
   - Messages: System prompt ("You are a chat assistant. Reply ONLY with a JSON array of short reply suggestions. Do not add explanation.") + User message content.
6. Server parses response, extracting JSON array, and sends back to client.
7. Client renders 4 contextual reply bubbles above the message input bar.
8. Selecting a bubble appends suggestion to input state and dismisses suggestions.
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Creates a credentials-based user.
- **Request:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
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
Logs in a credentials-based user.
- **Request:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:** Same as register

#### POST `/api/auth/google`
Authenticates a user via Google OAuth2 ID token.
- **Request:**
  ```json
  {
    "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
  }
  ```
- **Response:**
  ```json
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://lh3.googleusercontent.com/a/...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### User Routes (`/api/users`)

#### GET `/api/users`
Returns all registered users (excluding current user).
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
  ```json
  [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Alice",
      "username": "alice_smith",
      "email": "alice@example.com",
      "avatar": "/uploads/avatar-123.jpg",
      "statusMessage": "In a meeting",
      "dob": "1995-12-01",
      "showDob": true,
      "showOnlineStatus": true
    }
  ]
  ```

#### GET `/api/users/me`
Gets current logged in user's profile info.
- **Headers:** `Authorization: Bearer {token}`
- **Response:** Same format as a single user object.

#### GET `/api/users/check-username`
Checks if a @username is available.
- **Query Params:** `username`
- **Headers:** `Authorization: Bearer {token}`
- **Response (Available):**
  ```json
  { "available": true }
  ```
- **Response (Unavailable):**
  ```json
  {
    "available": false,
    "reason": "Already taken",
    "suggestions": ["johndoe1", "johndoe_42", "johndoe.3"]
  }
  ```

#### PUT `/api/users/profile`
Updates current user's profile parameters. Supports multipart/form-data for avatar file uploading.
- **Headers:** `Authorization: Bearer {token}`
- **Request Body (FormData):**
  - `name`: String (optional)
  - `username`: String (optional)
  - `statusMessage`: String (optional)
  - `dob`: String (YYYY-MM-DD, optional)
  - `showDob`: Boolean (optional)
  - `showOnlineStatus`: Boolean (optional)
  - `avatar`: File (optional, multipart file)
- **Response:** Updated user object.

---

### Message Routes (`/api/messages`)

#### GET `/api/messages/:userId`
Legacy API to fetch message history for direct chat.
- **Headers:** `Authorization: Bearer {token}`

#### POST `/api/messages/upload`
Uploads a file/audio attachment for chat.
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:** Form data containing `file`
- **Response:**
  ```json
  {
    "fileUrl": "/uploads/voice-17188.webm",
    "fileType": "audio/webm"
  }
  ```

---

### Conversation Routes (`/api/conversations`)

#### GET `/api/conversations`
Gets all conversations the current user participates in.
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
  ```json
  [
    {
      "_id": "607f1f77bcf86cd799439034",
      "type": "group",
      "name": "Design Team",
      "participants": [...],
      "admins": [...],
      "lastMessage": {...},
      "updatedAt": "2026-07-15T09:30:00Z"
    }
  ]
  ```

#### POST `/api/conversations/direct`
Get or create a direct conversation with a partner.
- **Headers:** `Authorization: Bearer {token}`
- **Request:** `{ "partnerId": "607f1f77bcf86cd799439012" }`
- **Response:** Conversation object.

#### POST `/api/conversations/group`
Creates a new group conversation.
- **Headers:** `Authorization: Bearer {token}`
- **Request:**
  ```json
  {
    "name": "Tech Chat",
    "description": "General discussions",
    "participantIds": ["607f1f77bcf86cd799439012", "607f1f77bcf86cd799439013"]
  }
  ```
- **Response:** Populated group Conversation object.

#### GET `/api/conversations/:conversationId/messages`
Gets all messages in a specific conversation.
- **Headers:** `Authorization: Bearer {token}`
- **Response:** Array of Message objects.

#### PUT `/api/conversations/:id`
Updates group metadata (name, description, participants, disappearing messages, avatar).
- **Headers:** `Authorization: Bearer {token}`
- **Request Body (FormData / JSON):** Fields to update.
- **Response:** Updated Conversation object.

#### POST `/api/conversations/:id/mute`
Mute/unmute conversation alerts.
- **Headers:** `Authorization: Bearer {token}`
- **Request:** `{ "durationHours": 8 }` (or `null` to unmute)
- **Response:** `{ "muted": true, "until": "2026-07-15T18:00:00Z" }`

#### POST `/api/conversations/:id/leave`
Leaves group conversation.
- **Headers:** `Authorization: Bearer {token}`

---

### Group Invitation Routes (`/api/group-invitations`)

#### GET `/api/group-invitations/invitations`
Gets all pending group invitations for the current user.
- **Headers:** `Authorization: Bearer {token}`

#### POST `/api/group-invitations/invitations`
Invites a user to a group conversation.
- **Headers:** `Authorization: Bearer {token}`
- **Request:** `{ "groupId": "...", "invitedUser": "..." }`

#### POST `/api/group-invitations/invitations/:invitationId/accept` (or `/decline`)
Accepts or declines a pending group invitation.
- **Headers:** `Authorization: Bearer {token}`

#### GET `/api/group-invitations/groups/:groupId/invite-link`
Gets the shareable invitation code/link for a group.
- **Headers:** `Authorization: Bearer {token}`

#### POST `/api/group-invitations/join/:inviteCode`
Joins a group using a shareable invite code.
- **Headers:** `Authorization: Bearer {token}`

---

### Call Signaling Routes (`/api/calls`)

#### GET `/api/calls/ice-servers`
Fetches WebRTC ICE servers configuration (STUN/TURN settings).
- **Headers:** `Authorization: Bearer {token}`
- **Response:**
  ```json
  {
    "iceServers": [
      { "urls": ["stun:stun.l.google.com:19302", ...] },
      { "urls": "turn:your-turn-server.com", "username": "...", "credential": "..." }
    ]
  }
  ```

---

### AI Routes (`/api/ai`)

#### POST `/api/ai/suggestions`
Gets reply suggestions for a message.
- **Headers:** `Authorization: Bearer {token}`
- **Request:** `{ "message": "Are we meeting today?" }`
- **Response:** `["Yes, at 2 PM", "No, it is canceled", "I am running late", "What time?"]`


---

## Socket.IO Events

### Client → Server Events

#### `join`
Manually joins user's room (called on connection)
```javascript
socket.emit("join", { userId: user._id });
```

#### `sendMessage`
Sends a new message to a user or conversation
```javascript
socket.emit("sendMessage", {
  receiver: "607f1f77bcf86cd799439012",      // Optional: For direct messaging
  conversationId: "607f1f77bcf86cd799439034", // Optional: For group/convo messaging
  content: "Hello there!",
  type: "text",                               // "text" | "image" | "file" | "audio" | "sticker"
  fileUrl: "/uploads/file.png",               // Optional: URL to attachment
  fileType: "image/png"                       // Optional: MIME type
});
```

#### `typing`
Notifies receiver(s) that user is typing
```javascript
socket.emit("typing", { 
  receiver: "607f1f77bcf86cd799439012",       // Optional: direct partner
  conversationId: "607f1f77bcf86cd799439034"  // Optional: group chat
});
```

#### `stopTyping`
Notifies receiver(s) that user stopped typing
```javascript
socket.emit("stopTyping", { 
  receiver: "607f1f77bcf86cd799439012",
  conversationId: "607f1f77bcf86cd799439034"
});
```

#### `markSeen`
Marks messages from sender as read
```javascript
socket.emit("markSeen", { senderId: "607f1f77bcf86cd799439012" });
```

#### `addReaction`
Adds or toggles a reaction on a message
```javascript
socket.emit("addReaction", { 
  messageId: "607f1f77bcf86cd7994390aa", 
  emoji: "❤️" 
});
```

#### WebRTC Signaling Events
- `call:invite`: Initiates a voice/video call.
- `call:cancel`: Cancels an outgoing call before acceptance.
- `call:accept`: Accepts an incoming call.
- `call:reject`: Rejects an incoming call.
- `call:busy`: Returns busy status to caller.
- `call:offer`: Exchanges local WebRTC SDP offer.
- `call:answer`: Exchanges remote WebRTC SDP answer.
- `call:ice`: Exchanges ICE candidate.
- `call:toggle`: Mute/unmute microphone or turn camera on/off.
- `call:hangup`: Ends call session.

---

### Server → Client Events

#### `receiveMessage`
Broadcast when a new message is sent (sent with "delivered" to receiver and "sent" to sender)
```javascript
{
  _id: "607f191e810c19729de860ea",
  sender: { _id: "507f1f77bcf86cd799439011" },
  receiver: { _id: "507f1f77bcf86cd799439012" }, // Optional
  conversationId: "607f1f77bcf86cd799439034",   // Optional
  content: "Hello!",
  type: "text",
  status: "delivered",
  createdAt: Date
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
{ 
  sender: "607f1f77bcf86cd799439011",
  conversationId: "607f1f77bcf86cd799439034" // Optional: for group chats
}
```

#### `stopTyping`
Notifies that a user stopped typing
```javascript
{ 
  sender: "607f1f77bcf86cd799439011",
  conversationId: "607f1f77bcf86cd799439034"
}
```

#### `messagesSeen`
Notifies sender that messages were read
```javascript
{ receiverId: "607f1f77bcf86cd799439012" }
```

#### `reactionUpdate`
Broadcasting reactions update on a message
```javascript
{ 
  messageId: "607f1f77bcf86cd7994390aa", 
  reactions: [
    { userId: "607f1f77bcf86cd799439012", emoji: "❤️" }
  ] 
}
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
- Flexible schema (supports different message types and dynamic conversation shapes)
- Scalable for real-time applications
- References between collections (User-Message-Conversation relationships)
- Timestamps auto-managed

**Alternative:** PostgreSQL - would require more schema migrations and planning

---

### 4. Context API (not Redux)

**Why?**
- Simpler setup, less boilerplate
- Sufficient for this app's state complexity
- Built into React, no additional dependencies
- Perfect for authentication and socket connection states

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
- Simple: No need for manual user-to-socket ID mappings

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
- Better for large files and audio recording uploads

**Flow:**
1. Client sends FormData with file
2. Multer stores file in `/uploads`
3. Backend creates message with fileUrl
4. Client displays image/file from URL

---

### 8. WebRTC Perfect Negotiation
**Why?**
- Decouples signaling and negotiation logic from application state.
- Designates polite and impolite peers to handle SDP offer collisions automatically.
- Simplifies multi-party connection setups (Mesh grid calling).
- Resolves signaling synchronization locks without complex state-machine overrides.

---

### 9. Google OAuth Integration
**Why?**
- Eliminates friction for user onboarding.
- Ensures verified email fields and profiles.
- Seamlessly links credentials accounts with Google IDs, avoiding duplicate database rows.

---

### 10. Three.js for 3D Landing Canvas
**Why?**
- Delivers a premium, state-of-the-art visual style immediately.
- Custom WebGL shading on interactive distorting spheres provides high-fidelity aesthetics.
- The 3D Phoenix companion dynamically perches and travels between spheres, bringing life to the Landing copy.

---

### 11. OpenAI Smart Reply Suggestions
**Why?**
- Uses `gpt-4o-mini` with a focused system prompt to generate highly context-aware replies.
- JSON-only response structure guarantees reliable parsing on the Express server.
- Streamlines messaging user experience on mobile screens by reducing typing overhead.

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

### Q11: How does Perfect Negotiation work in the WebRTC calling implementation?

**Answer:**
"Perfect negotiation splits WebRTC peers into 'polite' and 'impolite' roles. When a caller initiates a connection, they are impolite; the callee is polite.
If both sides attempt to create and send an offer simultaneously (a signaling collision), the polite callee automatically rolls back their local description and accepts the incoming offer. The impolite caller simply ignores the callee's collision offer.
This logic, implemented in `useWebRTC.ts`, prevents signaling deadlocks and handles network renegotiations (like switching cameras or mutes) transparently."

---

### Q12: How are permissions checked for group chats and settings?

**Answer:**
"Permissions are validated at both the REST API layer and the Socket.IO layer.
When creating or updating a group (such as adding members or updating disappearing message timers), the Express routes query the Conversation database to ensure the requesting user is listed as an admin or owner.
For real-time messaging, if the group has `onlyAdminsCanMessage` enabled, the Socket.IO server checks if the sender's ID is in the conversation's `admins` array. If they are not, the message is blocked and an error socket event is returned, preventing malicious spoofing."

---

### Q13: How does the AI Smart Reply system generate recommendations?

**Answer:**
"When a user receives a text message, the client calls GET `/api/ai/suggestions` passing the received content.
The server receives the text and queries OpenAI's chat completions API using the `gpt-4o-mini` model. The system prompt directs the AI to act as a chat assistant and return ONLY a JSON-formatted array of 4 short reply options.
The server parses the JSON response and returns the array to the client. If the API fails or doesn't return JSON, it fails gracefully by returning an empty array, avoiding app crashes."

---

### Q14: How does Google OAuth authentication and account linking work under the hood?

**Answer:**
"We use the `@react-oauth/google` SDK on the client to initiate the sign-in flow. When the user successfully signs in, Google returns a secure ID Token credential.
This credential is sent to `/api/auth/google`. The backend uses `google-auth-library` to decrypt and verify the ID Token against our Google Client ID.
Once verified, we extract the Google ID, name, email, and picture. We query MongoDB for a user with the same Google ID or email. If found, we link the accounts (if not already linked) and update the avatar picture. If not found, we create a new User document. Finally, we issue our own custom JWT token, allowing the user to start their chat session."

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

**Last Updated:** July 15, 2026
