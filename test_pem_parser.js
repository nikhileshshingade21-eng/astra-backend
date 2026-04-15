/**
 * This script tests the robustness of the PEM key parser.
 * It uses the exactly mangled key observed in the Railway environment variables.
 */

const mangledKey = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCqz2rw2eYYKe0L\\nyO0p1dDnKc7Q4eXRuscfphNtPHfJ9d0B6Wc6H5GVFgVRjTkUohp00X0c+y+9cJcS\\n0sQNRsafgm/xvqvnBapRg46hVeb3izn1KjqZ1xbG7dnGeY7vXEBT69nD0YCzNsBY\\I53BS7DfF4o+JOm0Qq871K9iYEDPvObmZ1GLVycdHWODtnilnZ9S7Z9ALZLghz/3\\nT/JyIa1fAgMBAAECggEAIjflO5TbZJHZnBfHcy8TZ4vXk779dFOPmoaBs8t+T+ZC\\nPSTN+jXiy1QbAqhg/AIxfJ+PCeREPxY0HaA9iE9acRAHbw18kI5w/V12kFmOKJ8q\\noDOyg6k0NevmSb2GZes8M9O2z2TD/KMGS4hjL2cs5blcBhLzLk65OAGe5ndmZ6Fq\\nPgeTbdV04OAtrV2Nev59b1zKJEFgHaMuj7mUWnnBoP04Kyk5dGu8SsxxT21bewmj\\ZOZJsOGuxWqglPlBsYkT/NUPaYYiM1RfSmsBY45S5c2XxaMPPUfZ/b91Ahtyd5rk\\nRrbPfP86ceqlJD1r4Uq5Y2RVJK6/ukiKmsebHG6yQQKBgQDXXOGoGzcQsElhDb4l\\nk4tQUu2j52GKWdl4u+dW+9EBqnET94ZQPi0Kks9i6i9PyNl39pfgb/Be9jiwH8XF\\no9vwYf7K/VYrzxxLLK+bTWrtd+ilVJ7FpGPl8XPNG0ty5DI6EdVzpDV0tmAjaNXW\\nhSlxXZaFHlGvoN/RcSkKWJ74QKBgQDLCmttQT5VoVBXxW624ZLum+69EmOnYzAC\\laTwxOZGKgPCicbRl5xh5N9MTDjFw90EYb/SFzXEdlzm7TWYyzgVjMHv+ed7EbTk\\nEq8ORwlK4N2howUAqj2aj0dOYzqK+shkJXz6yMwHqrXb9hd7E43WFPz2khg9hxJh\\nBqwB6BNRPwKBgEG6pVyLQdkkFKE8coZBa8mOJd1aZxi0p30DzG1t2bJqdKylZSbk\\ncxbBC+6ijuII6OaGKoBjabdx6odGizPw+NV68yq8+ynPwlDnSIlbrYDgke6zzul/\\nbMXnVXKKHBLqtrGmc8EhovcGGn10J5+jC6Y0iBSiHwmKZ9PWVVfNEbPBAoGADDWr\\nMh27RuD1eOG5f6ve7xRXbe0+KuGvEGi5S3U7t7ptEXTBjPcGA2kE+IyY2WOm1c2f\\nAF4+8HqBqa1YDMEjtUAKpYisn9z3uMNa3YvuBh+xlDe+ZETYgYPeMNuMuLDN/h+2\\n/Um34zojx39r+A27+MS4VYeBh6motEb3bwHqr3cCgYEAoKgJ3wLRxZkhH6/KdGt4\\nG55+KPcfhJVDOhDKgvSgTy4dOJC0UdxUZPqwNTEOIG3ehU5uLtsbAKgPzgquht/i\\nj9jD/vcsZW1bTp1df7KHpfKKpr8ulg+wh+Ej1vnZ+Q2TEiFADTicPZwmCYNddF6q\\ni0LZyGsV0rR7moyJ/AmX9QU=\\n-----END PRIVATE KEY-----\\n";

function defensiveClean(key) {
    if (!key || typeof key !== 'string') return key;

    // 1. Convert literal \\n to actual newlines
    let cleaned = key.replace(/\\n/g, '\n');

    // 2. Identify the content between headers
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    
    if (cleaned.includes(header) && cleaned.includes(footer)) {
        const startIndex = cleaned.indexOf(header) + header.length;
        const endIndex = cleaned.indexOf(footer);
        const body = cleaned.substring(startIndex, endIndex);
        
        // 3. Strip EVERYTHING that isn't a valid base64 character or newline
        // Valid for Base64: A-Z, a-z, 0-9, +, /, =, and \n
        const cleanedBody = body.replace(/[^A-Za-z0-9+/=\n]/g, '');
        
        return `${header}\n${cleanedBody}\n${footer}`;
    }

    // Fallback: simple character replacement if headers not found
    return cleaned.replace(/\\/g, '');
}

console.log("OLD KEY PREVIEW (First 100 chars):", mangledKey.substring(0, 100));
const fixed = defensiveClean(mangledKey);
console.log("\nFIXED KEY PREVIEW (First 100 chars):", fixed.substring(0, 100));

// Test for the specific stray backslash observation \\I53
if (mangledKey.includes('\\I53')) {
    console.log("\n[TEST] Found stray '\\I53' in mangled key.");
    if (!fixed.includes('\\')) {
        console.log("[TEST] Success: Extraneous backslash removed.");
    } else {
        console.log("[TEST] Failed: Backslash still present.");
    }
}
