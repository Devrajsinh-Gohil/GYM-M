import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, limit, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";

export interface AttendanceResult {
  success: boolean;
  type: "CHECK_IN" | "CHECK_OUT";
  message: string;
}

export const processAttendance = async (userId: string, gymId: string): Promise<AttendanceResult> => {
  try {
    const attendanceRef = collection(db, "attendance");

    // 1. Check for an active session (status == 'PRESENT')
    const q = query(
      attendanceRef,
      where("userId", "==", userId),
      where("gymId", "==", gymId),
      where("status", "==", "PRESENT"),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // --- CHECK OUT ---
      const docRef = snapshot.docs[0].ref;
      const data = snapshot.docs[0].data();

      const checkInTime = data.checkInTime.toDate();
      const checkOutTime = new Date();
      const durationMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000); // Minutes

      // Update the existing document
      await updateDoc(docRef, {
        checkOutTime: serverTimestamp(),
        status: "COMPLETED",
        duration: durationMinutes
      });

      return {
        success: true,
        type: "CHECK_OUT",
        message: `See you next time! Session duration: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      };
    } else {
      // --- CHECK IN ---
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD for easy daily querying

      await addDoc(attendanceRef, {
        userId,
        gymId,
        checkInTime: serverTimestamp(),
        status: "PRESENT",
        date: dateStr,
        method: "QR_SCAN"
      });

      return {
        success: true,
        type: "CHECK_IN",
        message: "Welcome to the gym! Session started."
      };
    }

  } catch (error) {
    console.error("Attendance Error:", error);
    return {
      success: false,
      type: "CHECK_IN", // default
      message: "Failed to process attendance."
    };
  }
};
