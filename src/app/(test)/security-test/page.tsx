"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function SecurityTestPage() {
    const { user, role } = useAuth();
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const testAllowedUpdate = async () => {
        if (!user) return addLog("Not logged in");
        try {
            await updateDoc(doc(db, "users", user.uid), {
                displayName: `Test User ${Math.floor(Math.random() * 1000)}`
            });
            addLog("✅ SUCCESS: Allowed field (displayName) update");
        } catch (e: any) {
            addLog(`❌ FAILED: Allowed field update - ${e.message}`);
        }
    };

    const testForbiddenUpdate = async () => {
        if (!user) return addLog("Not logged in");
        try {
            await updateDoc(doc(db, "users", user.uid), {
                role: "SUPER_ADMIN"
            });
            addLog("❌ FAILED: Security Breach! Protected field (role) was updated!");
        } catch (e: any) {
            addLog(`✅ SUCCESS: Protected field update blocked - ${e.message}`);
        }
    };

    const testUnexpectedField = async () => {
        if (!user) return addLog("Not logged in");
        try {
            await updateDoc(doc(db, "users", user.uid), {
                randomField123: "hacker"
            });
            addLog("❌ FAILED: Security Breach! Random field was added!");
        } catch (e: any) {
            addLog(`✅ SUCCESS: Random field update blocked - ${e.message}`);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Security Rule Verification</h1>

            <div className="bg-blue-900/20 p-4 rounded border border-blue-500/50">
                <h2 className="font-bold">Current Session</h2>
                <p>User ID: {user?.uid}</p>
                <p>Role: <span className="font-mono font-bold text-yellow-400">{role || "Loading..."}</span></p>
                {role === 'SUPER_ADMIN' && (
                    <p className="text-red-400 text-sm mt-2">
                        ⚠️ You are a SUPER_ADMIN. You bypass all restrictions!
                        To test security rules, you must use an account with role 'USER' or standard 'GYM_ADMIN'.
                    </p>
                )}
            </div>

            <div className="space-x-4">
                <button onClick={testAllowedUpdate} className="px-4 py-2 bg-green-600 text-white rounded">
                    Test Allowed (displayName)
                </button>
                <button onClick={testForbiddenUpdate} className="px-4 py-2 bg-red-600 text-white rounded">
                    Test Protected (role)
                </button>
                <button onClick={testUnexpectedField} className="px-4 py-2 bg-yellow-600 text-white rounded">
                    Test Random Field
                </button>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-auto font-mono text-sm">
                {logs.length === 0 ? "Ready to test..." : logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    );
}
