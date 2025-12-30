
import "dotenv/config";
import { transcribeAudio } from "../server/_core/llm";
import { invokeLLM } from "../server/_core/llm";

async function testFeatures() {
    console.log("--- Testing Audio & Enhancer Features ---");
    console.log("API Configured:", !!process.env.FORGE_API_KEY);
    console.log("API URL:", process.env.FORGE_API_URL);

    // Test 1: Enhancer (LLM)
    console.log("\n1. Testing Prompt Enhancer...");
    try {
        const response = await invokeLLM({
            messages: [
                { role: "user", content: "Test prompt: improve this text." }
            ],
            max_tokens: 10
        });
        const content = response.choices[0]?.message?.content;
        const output = typeof content === 'string' ? content : JSON.stringify(content);
        console.log("✅ Enhancer Check Passed. Response:", output?.substring(0, 50));
    } catch (error: any) {
        console.error("❌ Enhancer Failed:", error.message);
    }

    // Test 2: Audio (Transcribe)
    console.log("\n2. Testing Audio Transcription...");
    // Minimal 1kb silence wav/webm base64 or similar to test connection, 
    // but since we need a valid audio file for Whisper, we might just check if the function throws "Invalid file" vs "Network error".
    // Sending garbage base64 should trigger an API error from Forge/OpenAI, proving we reached the endpoint.
    try {
        await transcribeAudio("UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    } catch (error: any) {
        console.log("ℹ️ Audio Result:", error.message);
        if (error.message.includes("400") || error.message.includes("Invalid")) {
            console.log("✅ Connection reached (Error 400 is expected for bad audio data).");
        } else {
            console.error("❌ Network/Logic Error:", error);
        }
    }
}

testFeatures();
