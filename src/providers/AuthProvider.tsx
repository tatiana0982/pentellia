"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/config/firebaseClient";
import { User } from "@/models/user.model";


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}


const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {

        const response = await fetch(`/api/users/${user.uid}`);
        const { data } = await response.json();

        setUser(data)

      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);


  // const sendForgotPasswordLink = async (email: string) => {
  //   await sendPasswordResetEmail(auth, email);
  // };


  // const removeToken = async () => {
  //   await fetch("/api/logout", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //   });
  // };

  

  const value: AuthContextType = {
    user,
    isLoading: user === null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

