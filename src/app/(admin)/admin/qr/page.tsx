"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Printer, Download, QrCode as QrCodeIcon, Sparkles } from "lucide-react";

export default function AdminQRPage() {
  const { user } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState("");
  const [gymLocation, setGymLocation] = useState("");
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
            const gymData = gymDoc.data();
            setGymName(gymData.name);
            setGymLocation(gymData.location || "");
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${gymName}-QR-Code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading QR Code...</p>
        </div>
      </div>
    );
  }

  if (!gymId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCodeIcon className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-900 font-bold mb-1">No Gym Associated</p>
          <p className="text-sm text-gray-500">Please contact support</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gym QR Code</h1>
          <p className="text-gray-600 mt-1">Download or print for member check-ins</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-sm hover-lift"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>
      </div>

      {/* QR Code Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-black/10 blur-3xl"></div>

          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold mb-2">{gymName}</h2>
            {gymLocation && (
              <p className="text-emerald-100 text-lg">{gymLocation}</p>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-12 flex flex-col items-center">
          <p className="text-gray-600 text-center mb-8 max-w-md text-lg">
            Members can scan this code with the Gym App to check in or check out instantly.
          </p>

          <div className="p-8 bg-white border-4 border-gray-900 rounded-3xl shadow-2xl">
            <QRCode
              id="qr-code"
              value={JSON.stringify({ gymId, type: "check-in" })}
              size={320}
              viewBox={`0 0 256 256`}
            />
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 font-medium mb-1">Gym ID</p>
            <p className="text-gray-900 font-mono font-bold">{gymId}</p>
          </div>

          {/* Instructions */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Print or Display</h3>
              <p className="text-sm text-gray-600">Print this QR code or display it at your gym entrance</p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Members Scan</h3>
              <p className="text-sm text-gray-600">Members use the app to scan the code</p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Auto Check-in</h3>
              <p className="text-sm text-gray-600">Attendance is tracked automatically</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-code, #qr-code * {
            visibility: visible;
          }
          #qr-code {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
