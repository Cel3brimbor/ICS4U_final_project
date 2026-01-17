package backend;

import backend.objects.LMStudioAgent;
import java.util.Scanner;

public class PE {

    public static void main(String[] args) {
        System.out.println("Prompt Engineering");

        LMStudioAgent agent = new LMStudioAgent();
        System.out.println("Configuration: " + agent.getConfig());
        System.out.println();

        Scanner scanner = new Scanner(System.in);

        while (true) {
            System.out.println("Options:");
            System.out.println("1. Chat (processed response)");
            System.out.println("2. Test prompt (raw response only)");
            System.out.println("3. Model compliance test");
            System.out.println("4. Planner test");
            System.out.println("5. Notes test");
            System.out.println("6. Exit");
            System.out.print("Enter choice (1-4): ");

            String choice = scanner.nextLine().trim();

            switch (choice) {
                case "1":
                    testChatMode(agent, scanner);
                    break;
                case "2":
                    testPromptMode(agent, scanner);
                    break;
                case "3":
                    customPromptTest(agent, scanner);
                    break;
                case "4":
                    plannerTest(agent, scanner);
                    break;
                case "5":
                    notesTest(agent, scanner);
                    break;
                case "6":
                    System.out.println("Exiting...");
                    scanner.close();
                    return;
                default:
                    System.out.println("Invalid choice. Please try again.\n");
            }
        }
    }

    private static void testChatMode(LMStudioAgent agent, Scanner scanner) {
        System.out.println("\n=== Chat Mode ===");
        System.out.println("Processes the response and returns clean text.");
        System.out.print("Enter message: ");
        String message = scanner.nextLine();

        String response = agent.chat(message);
        System.out.println("\nProcessed Response:");
        System.out.println(response);
        System.out.println();
    }

    private static void testPromptMode(LMStudioAgent agent, Scanner scanner) {
        System.out.println("\n=== Test Prompt Mode ===");
        System.out.println("Prints the raw API response for debugging.");
        System.out.print("Enter test prompt: ");
        String prompt = scanner.nextLine();

        agent.testPrompt(prompt);
    }

    private static void customPromptTest(LMStudioAgent agent, Scanner scanner) {
        System.out.println("\n=== AI Model Compliance Test ===");

        String[] testPrompts = {
            "Say 'Hello World' and nothing else.",
            "Count from 1 to 5, with each number on a new line.",
            "What is the capital of France? Answer in one word.",
            "Explain what prompt engineering is in 2-3 sentences.",
            "Write a haiku about artificial intelligence.",
            "List three benefits of using local AI models."
        };

        for (int i = 0; i < testPrompts.length; i++) {
            System.out.println((i + 1) + ". " + testPrompts[i]);
        }

        System.out.print("Choose a prompt number (1-" + testPrompts.length + ") or enter 'c' for custom: ");
        String input = scanner.nextLine().trim();

        String selectedPrompt;
        if (input.equalsIgnoreCase("c")) {
            System.out.print("Enter your custom prompt: ");
            selectedPrompt = scanner.nextLine();
        } else {
            try {
                int promptIndex = Integer.parseInt(input) - 1;
                if (promptIndex >= 0 && promptIndex < testPrompts.length) {
                    selectedPrompt = testPrompts[promptIndex];
                } else {
                    System.out.println("Invalid number. Using default test prompt.");
                    selectedPrompt = testPrompts[0];
                }
            } catch (NumberFormatException e) {
                System.out.println("Invalid input. Using default test prompt.");
                selectedPrompt = testPrompts[0];
            }
        }

        System.out.println("\nTesting prompt: " + selectedPrompt);
        agent.testPrompt(selectedPrompt);
    }
}