"""
Navio — the Sportnavi guide chatbot over Azure OpenAI (gpt-4.1).

Reads the full system prompt (Navio persona + knowledge base baked in) from
SYSTEM_PROMPT.md and runs a terminal chat loop.

Run:  python chatbot.py
"""

import os
import sys
import warnings
from pathlib import Path

# Hide an unrelated, harmless plugin warning from the global Python env.
warnings.filterwarnings("ignore", message="ImportError while loading the .* plugin")

from dotenv import load_dotenv
from openai import OpenAI

# UTF-8 console output on Windows (German text, em-dashes).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

SYSTEM_PROMPT = (Path(__file__).parent / "SYSTEM_PROMPT.md").read_text(encoding="utf-8")


def main() -> None:
    load_dotenv()
    client = OpenAI(
        api_key=os.environ["AZURE_AI_CHATBOT_API_KEY"],
        base_url=os.environ["AZURE_AI_CHATBOT_OPENAI_ENDPOINT"],
    )
    model = os.environ["AZURE_AI_CHATBOT_DEPLOYMENT_NAME"]

    greeting = (
        "Hi, ich bin Navio 👋🏻\n"
        "Dein Guide durch die Sportnavi Welt. Wobei kann ich dir helfen?"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "assistant", "content": greeting},
    ]
    print(f"Navio  |  Model: {model}  |  type 'exit' to quit\n")
    print(f"Navio: {greeting}\n")

    while True:
        try:
            user = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not user:
            continue
        if user.lower() in {"exit", "quit"}:
            print("Bye!")
            break

        messages.append({"role": "user", "content": user})
        reply = client.chat.completions.create(
            model=model,
            temperature=0.4,
            messages=messages,
        ).choices[0].message.content.strip()
        messages.append({"role": "assistant", "content": reply})
        print(f"\nNavio: {reply}\n")


if __name__ == "__main__":
    main()
