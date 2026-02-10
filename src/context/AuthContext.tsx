"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Make sure to sync this import
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    role: string | null; // "SUPER_ADMIN" | "GYM_ADMIN" | "USER"
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch user role from Firestore
                // Assuming there is a 'users' collection with the document ID as user.uid
                try {
                    // Optimization: Claims are faster, but Firestore is easier to inspect initially.
                    // For now, let's just fetch from Firestore to keep it simple.
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setRole(userDoc.data()?.role || "USER");
                    } else {
                        // Handle case where user is in Auth but not Firestore (e.g., initial signup gap)
                        setRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole(null);
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        setRole(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
