"""
test_connection.py — Verify TinyFish API connection before building the full app.

Usage:
    cd backend/
    python test_connection.py

Expected output:
    ✅ TinyFish connection successful
    🔴 LIVE BROWSER: https://tf-xxx.fra0-tinyfish.unikraft.app/stream/0
    ⏳ Navigate to page to extract products
    ⏳ Check for product information
    ✅ Result: {"products": [...]}
"""

import os
import json
from dotenv import load_dotenv

load_dotenv()

def test_tinyfish_connection():
    api_key = os.getenv("TINYFISH_API_KEY")
    if not api_key:
        print("❌ TINYFISH_API_KEY not set in .env")
        print("   Get your key at: https://agent.tinyfish.ai/api-keys")
        return False

    print(f"🔑 API key found: {api_key[:12]}...")

    try:
        from tinyfish import TinyFish
        client = TinyFish()
        print("✅ TinyFish SDK imported successfully\n")
    except ImportError:
        print("❌ tinyfish not installed. Run: pip install tinyfish")
        return False

    print("🚀 Sending test request to scrapeme.live/shop...")
    print("   (This verifies SSE streaming works end-to-end)\n")

    try:
        with client.agent.stream(
            url="https://scrapeme.live/shop",
            goal="""Extract the first 3 product names and prices from this shop page.
Return ONLY this JSON (no extra text):
{
  "products": [
    {"name": "string", "price": "string"}
  ]
}""",
            browser_profile="lite",
            proxy_config={"enabled": False},
        ) as stream:
            for event in stream:
                # Handle both dict and object-style events
                if isinstance(event, dict):
                    event_type = event.get("type")
                else:
                    event_type = getattr(event, "type", None)

                if event_type == "STARTED":
                    run_id = event.get("run_id") if isinstance(event, dict) else getattr(event, "run_id", "")
                    print(f"  🚀 STARTED — run_id: {run_id}")

                elif event_type == "STREAMING_URL":
                    url = event.get("streaming_url") if isinstance(event, dict) else getattr(event, "url", "")
                    print(f"  🔴 LIVE BROWSER (open this in your browser to watch):")
                    print(f"     {url}\n")

                elif event_type == "PROGRESS":
                    purpose = event.get("purpose") if isinstance(event, dict) else getattr(event, "action_description", "")
                    print(f"  ⏳ {purpose}")

                elif event_type == "HEARTBEAT":
                    print("  💓 heartbeat")

                elif event_type == "COMPLETE":
                    result = event.get("result") if isinstance(event, dict) else getattr(event, "result_json", None)
                    if isinstance(result, str):
                        result = json.loads(result)
                    print(f"\n  ✅ COMPLETE!")
                    print(f"  Result: {json.dumps(result, indent=2)}")
                    return True

    except Exception as e:
        print(f"\n❌ TinyFish API error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your TINYFISH_API_KEY in .env")
        print("  2. Make sure you have API credits: https://accelerator.tinyfish.ai")
        print("  3. Check status: https://status.tinyfish.ai")
        return False

    print("\n⚠️  Stream ended without COMPLETE event")
    return False


if __name__ == "__main__":
    print("=" * 60)
    print("  PriorAuth Pulse — TinyFish Connection Test")
    print("=" * 60 + "\n")

    success = test_tinyfish_connection()

    print("\n" + "=" * 60)
    if success:
        print("  ✅ SUCCESS — TinyFish is working. Ready to build!")
        print("\n  Next steps:")
        print("  1. Set MONGO_URI in .env")
        print("  2. Run: uvicorn app.main:app --reload")
        print("  3. Open: http://localhost:8000/docs")
    else:
        print("  ❌ FAILED — Fix the errors above before proceeding")
    print("=" * 60)
