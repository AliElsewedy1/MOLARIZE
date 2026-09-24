import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route to provide Firebase config from environment variables if present
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDD3ouvrsyqwxorPWlQdKPgZACjUO5TiWs",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "ali-elsewedy-media.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "ali-elsewedy-media",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ali-elsewedy-media.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "721258793080",
    appId: process.env.FIREBASE_APP_ID || "1:721258793080:web:968f77abee49198fa3c58d",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-1CNDBSB0P4"
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Route handlers for direct paths
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MOLARIZE server running at http://0.0.0.0:${PORT}`);
});
