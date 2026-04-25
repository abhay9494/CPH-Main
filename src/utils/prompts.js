// ==========================================================
// 🎯 DUAL-BRAIN SNIPER PROMPTS
// ==========================================================

const PROMPTS = {
    // 💻 CODE ENGINE PROMPTS
    OA_AUTOMATION: (language) => `Output ONLY functional code in ${language || 'c++'}. CRITICAL RULES:
- Do NOT output any greetings, explanations, or comments.
- Use single letter variable names.
- Give me code with a main function so that I can run locally.
- Don't change the function signature given in the image. See function signature and test cases from the image.
- Give me test cases to be put in cph extension of vs code (only those test cases which are visible in the image) like this:
test case1
input
expected output
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    REFACTOR: `Refactor the above code. Output ONLY functional code. CRITICAL RULES:
- Do NOT output any greetings, explanations, or comments.
- If the original code uses a for loop, see if a while loop or a higher-order function (like map or filter) fits better.
- Break large functions into smaller helper functions.
- If specific independent tasks happen in a sequence, change the order of initialization if it doesn't affect the output.
- Structurally invert nested if statements by checking for invalid conditions and returning early.
- Replace long switch statements or if-else chains with a Map (Dictionary) or Array lookup.
- Algorithms often iterate forward (0 to N). Change this to backward iteration (N to 0) or use recursion.
- Extract complex conditions into variables with semantic names.
- Do not use classes.
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    FIX_ERROR: `Look at the code written by me in the code editor of the screenshot attached and see the compiler error or wrong answer present. CRITICAL RULES:
- Output ONLY the fully corrected functional code.
- Do NOT output any greetings, general explanations, or extra text.
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    // 🗣️ VOICE ENGINE PROMPTS
    VOICE_CONTEXT: `Read the attached problem or code. Do NOT output the solution or read it out loud. Just ingest the context silently. Be prepared to answer verbal questions about its logic, approach, or time complexity if I ask you through the microphone. Reply with a short confirmation that you understand.`
};

module.exports = PROMPTS;