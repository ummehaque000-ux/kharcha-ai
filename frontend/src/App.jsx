import { useState, useEffect } from "react";
import ExpenseChart from "./ExpenseChart";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // ==========================================
  // LOAD ALL EXPENSES FROM BACKEND
  // ==========================================

  const loadExpenses = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/expenses");
      const realData = await response.json();

      setExpenses(realData);
    } catch (error) {
      console.error("Failed to load expenses", error);
    }
  };

  // Load expenses when page opens
  useEffect(() => {
    loadExpenses();
  }, []);

  // ==========================================
  // VOICE ROBOT FUNCTION
  // ==========================================

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Your browser does not support voice AI. Please use Google Chrome.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;

      // Show what the user said
      setTranscript(spokenText);

      try {
        // ==========================================
        // STEP A: Send speech to Gemini
        // ==========================================

        const aiResponse = await fetch("http://localhost:5000/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: spokenText,
          }),
        });

        const aiData = await aiResponse.json();

        // Remove markdown if Gemini returns ```json
        const cleanJsonString = aiData.result
          .replace(/```json/g, "")
          .replace(/```/g, "");

        const extractedExpense = JSON.parse(cleanJsonString);

        // ==========================================
        // STEP B: Save expense to database
        // ==========================================

        await fetch("http://localhost:5000/api/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(extractedExpense),
        });

        // ==========================================
        // STEP C: Reload expenses
        // ==========================================

        loadExpenses();
      } catch (error) {
        console.error(error);
        alert("Something went wrong in the pipeline!");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // ==========================================
  // RECEIPT SCANNER FUNCTION
  // ==========================================

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      try {
        const base64String = reader.result.split(",")[1];

        const response = await fetch("http://localhost:5000/api/scan-receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64String,
          }),
        });

        const data = await response.json();

        alert("AI Successfully Scanned:\n\n" + data.result);
      } catch (error) {
        console.error(error);
        alert("Failed to scan receipt.");
      } finally {
        setIsScanning(false);
      }
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-10 mt-10">
        Kharcha-AI Dashboard
      </h1>

      {/* Voice + Upload Section */}
      <div className="mb-8 flex flex-col items-center">
        {/* Microphone Button */}
        <Button
          onClick={startListening}
          className={`w-40 h-40 rounded-full text-xl shadow-lg text-white transition-all ${
            isListening
              ? "bg-red-500 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isListening ? "Listening..." : "🎤 Record"}
        </Button>

        {/* Upload Receipt Button */}
        <div className="mt-6">
          <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg shadow inline-block">
            {isScanning ? "Scanning Image... 📄" : "📷 Upload Receipt"}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Voice Transcript */}
        {transcript && (
          <p className="mt-6 text-lg font-medium text-gray-700 bg-white p-4 rounded-lg shadow text-center max-w-sm border-l-4 border-blue-500">
            You said: "{transcript}"
          </p>
        )}
      </div>

      {/* This is our new automated pie chart! */}
      <ExpenseChart />

      {/* This is our Recent Spending list */}
      <div className="w-full max-w-md mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Recent Spending
        </h2>

        {expenses.map((item) => (
          <Card key={item.id} className="mb-3">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-medium text-gray-800">{item.category}</span>

              <span className="text-red-500 font-bold">₹{item.amount}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
