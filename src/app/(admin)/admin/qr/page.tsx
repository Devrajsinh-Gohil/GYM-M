"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

export default function AdminQRPage() {
  const { user } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGymDetails = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.gymId) {
          setGymId(userData.gymId);
          const gymDoc = await getDoc(doc(db, "gyms", userData.gymId));
          if (gymDoc.exists()) {
            setGymName(gymDoc.data().name);
          }
        }
      } catch (error) {
        console.error("Error fetching gym ID:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGymDetails();
  }, [user]);

  if (loading) return <div className="p-8">Loading QR Code...</div>;
  if (!gymId) return <div className="p-8">No Gym Associated.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gym QR Code</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{gymName || "Our Gym"}</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          Scan this code with the Gym App to Check-In or Check-Out.
        </p>

        <div className="p-4 bg-white border-4 border-gray-900 rounded-xl">
          <QRCode
            value={JSON.stringify({ gymId, type: "check-in" })}
            size={300}
            viewBox={`0 0 256 256`}
          />
        </div>

        <p className="mt-8 text-sm text-gray-400 font-mono">
          ID: {gymId}
        </p>
      </div>
    </div>
  );
}
