import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNJQlfGRCn8g5kFUJ8fILd56RZELf50kw",
  authDomain: "cark-52f88.firebaseapp.com",
  projectId: "cark-52f88",
  storageBucket: "cark-52f88.firebasestorage.app",
  messagingSenderId: "863597988390",
  appId: "1:863597988390:web:873afd41ada639a999b4e7",
  measurementId: "G-LRZ58XVYX3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
