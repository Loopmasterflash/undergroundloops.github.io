// Firebase Configuration for UNDERGROUNDLOOPS v3 - NEW API KEY
const firebaseConfig = {
  apiKey: "AIzaSyALbfa5LSqPH2e7ZDgZwUaRoE2Lq46x5ys",
  authDomain: "undergroundloops.firebaseapp.com",
  projectId: "undergroundloops",
  storageBucket: "undergroundloops.firebasestorage.app",
  messagingSenderId: "971209771891",
  appId: "1:971209771891:web:ac3e793cac51386f7f9306"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const db = firebase.firestore();

console.log('✅ Firebase initialized successfully with NEW API KEY!');
