
import os
import time
import requests

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

MODELS = list(dict.fromkeys([
    os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash"
]))


def generate_text(prompt, json_mode=False):

    if not API_KEY:
        raise ValueError("Gemini API key is missing.")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    if json_mode:
        payload["generationConfig"] = {
            "responseMimeType": "application/json"
        }

    errors = []

    for model in MODELS:

        model = model.removeprefix("models/")

        url = (
            "https://generativelanguage.googleapis.com"
            f"/v1beta/models/{model}:generateContent"
        )

        print(f"Trying model: {model}", flush=True)

        try:

            response = requests.post(
                url,
                headers={
                    "x-goog-api-key": API_KEY
                },
                json=payload,
                timeout=45
            )

            if response.status_code in (
                429, 500, 502, 503, 504, 404
            ):

                print(
                    f"{model} failed: "
                    f"{response.status_code}",
                    flush=True
                )

                errors.append(
                    f"{model}: {response.status_code}"
                )

                time.sleep(1)

                continue

            if response.status_code in (401, 403):
                raise ValueError(
                    "Check your Gemini API key "
                    "and account permissions."
                )

            if not response.ok:

                errors.append(
                    f"{model}: {response.status_code}"
                )

                continue

            data = response.json()

            candidates = data.get("candidates", [])

            if not candidates:
                errors.append(f"{model}: No response")
                continue

            candidate = candidates[0]

            if candidate.get("finishReason") not in (
                None, "STOP"
            ):
                errors.append(f"{model}: Incomplete response")
                continue

            parts = candidate.get(
                "content", {}
            ).get("parts", [])

            text = "".join(
                part.get("text", "")
                for part in parts
                if not part.get("thought", False)
            )

            if text.strip():

                print(
                    f"SUCCESS: {model}",
                    flush=True
                )

                return text.strip()

            errors.append(f"{model}: Empty response")

        except requests.exceptions.RequestException as error:

            print(
                f"Connection failed: {model}",
                flush=True
            )

            errors.append(
                f"{model}: Connection error"
            )

            continue

    raise ValueError(
        "All configured Gemini models failed. "
        + "; ".join(errors)
    )
