// Firebase Configuration for UNDERGROUNDLOOPS v2
const firebaseConfig = {
  apiKey: "AIzaSyC1MF9Yk34ojsILyfmJHKyJmjkVOKEEL40",
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

console.log('✅ Firebase initialized successfully!');
