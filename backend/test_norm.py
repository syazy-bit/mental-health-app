from app.safety.normalizers import normalize_text

tests = [
    ("Hindi", "मैं तनाव में हूँ"),
    ("Assamese", "মই মানসিক চাপত আছোঁ"),
    ("Mixed", "I am तनाव में हूँ"),
    ("Punctuation", "Hello... world--how are you?"),
    ("Contractions", "I don't know, self-harm"),
    ("Empty", ""),
    ("Whitespace", "   "),
]

with open("norm_output.txt", "w", encoding="utf-8") as f:
    for name, text in tests:
        result = normalize_text(text)
        f.write(f"{name}: {repr(result)}\n")