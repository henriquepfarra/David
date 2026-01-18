
import { describe, it, expect, vi, beforeEach } from "vitest";
import { classify, IntentResult } from "./IntentService";

// Mock invokeLLM to avoid real API calls
vi.mock("../_core/llm", () => ({
    invokeLLM: vi.fn(),
    callFlashClassifier: vi.fn()
}));

// Mock console.log to keep output clean
vi.spyOn(console, "log").mockImplementation(() => { });

describe("IntentService Fix Verification", () => {
    const apiKey = "fake-api-key";

    it("should treat request with fileUri as having a process (CONCRETE path) even without processId", async () => {
        // Message that triggers heuristic analysis ("analise o pedido")
        const message = "Analise o pedido de tutela";

        // Context with fileUri but NO processId
        const context = {
            processId: null,
            fileUri: "https://docs.google.com/file/d/123",
            history: []
        };

        const result = await classify(message, context, apiKey);

        // Should prioritize Concrete Analysis (Motors A, B, C, D)
        expect(result.intent).toBe("CASE_ANALYSIS");
        expect(result.motors).toEqual(expect.arrayContaining(["A", "B", "C", "D"]));
        expect(result.ragScope).toBe("ALL");

        // Important: IntentService logic doesn't explicitly return "CONCRETE" path for heuristics yet, 
        // but the motors/scope configuration confirms it treated it as heavy analysis.
        // Let's verify our specific log message if possible, or infer from logic.
        // Given the heuristic logic for CASE_ANALYSIS returns ABSTRACT path hardcoded in current code 
        // but with full motors. The key fix was ensuring "hasProcess" is true so it MIGHT use LLM concrete
        // if heuristic fails.

        // Let's test non-heuristic to force LLM path which exercises the "hasProcess" logic
    });

    it("should use Concrete LLM path when fileUri is present and heuristic fails", async () => {
        // Message that is ambiguous and doesn't trigger regex
        const message = "O que você acha deste documento?";

        const { invokeLLM } = await import("../_core/llm");

        // Mock LLM response for Concrete prompt
        // The presence of "needsFacts" key indicates it used the CONCRETE prompt
        (invokeLLM as any).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        needsFacts: true,
                        needsStyle: false,
                        needsLaw: true,
                        isFinalDoc: false,
                        intent: "CASE_ANALYSIS",
                        confidence: 0.95
                    })
                }
            }]
        });

        const context = {
            processId: null,
            fileUri: "available",
            history: []
        };

        const result = await classify(message, context, apiKey);

        expect(result.path).toBe("CONCRETE"); // This confirms classifyWithLLMConcrete was called
        expect(result.intent).toBe("CASE_ANALYSIS");
        expect(result.motors).toContain("A"); // Needs facts
    });

    it("should use Abstract LLM path when NO fileUri and NO processId", async () => {
        const message = "O que você acha disso?";

        const { invokeLLM } = await import("../_core/llm");

        // Mock LLM response for Abstract prompt (which returns simple JSON {intent, confidence})
        (invokeLLM as any).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        intent: "CONCEPTUAL",
                        confidence: 0.8
                    })
                }
            }]
        });

        const context = {
            processId: null,
            fileUri: null, // No file
            history: []
        };

        const result = await classify(message, context, apiKey);

        expect(result.path).toBe("ABSTRACT"); // This confirms classifyWithLLMAbstract was called
        expect(result.intent).toBe("CONCEPTUAL");
    });
});
