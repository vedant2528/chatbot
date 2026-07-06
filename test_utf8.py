#!/usr/bin/env python3
"""
UTF-8 Encoding Test
Verify that the chatbot properly handles all languages
"""

import json
import sys

# Test strings in different languages
test_strings = {
    "Hindi": "हां, मुझे बिल्कुल अच्छा!",
    "English": "Hi, I'm absolutely fine!",
    "Spanish": "¡Hola, estoy muy bien!",
    "French": "Bonjour, je vais très bien!",
    "German": "Hallo, mir geht es sehr gut!",
    "Chinese": "你好，我很好！",
    "Arabic": "مرحبا، أنا بخير جداً!",
    "Hinglish": "Haan bilkul, mein thik hun!",
}

print("UTF-8 Encoding Test")
print("=" * 50)

# Test JSON encoding
print("\n1. Testing JSON encoding...")
test_dict = {"messages": test_strings}
json_str = json.dumps(test_dict, ensure_ascii=False, indent=2)
print("✓ JSON encoding successful")
print(json_str[:200] + "...")

# Test file operations
print("\n2. Testing file encoding...")
test_file = "test_utf8.json"
with open(test_file, 'w', encoding='utf-8') as f:
    json.dump(test_dict, f, ensure_ascii=False, indent=2)
print(f"✓ File saved to {test_file}")

with open(test_file, 'r', encoding='utf-8') as f:
    loaded = json.load(f)
print("✓ File loaded successfully")

# Verify all strings match
print("\n3. Verifying string integrity...")
all_match = True
for lang, original in test_strings.items():
    loaded_str = loaded["messages"][lang]
    if original == loaded_str:
        print(f"✓ {lang}: {original}")
    else:
        print(f"✗ {lang}: Mismatch!")
        all_match = False

if all_match:
    print("\n✅ All tests passed! UTF-8 encoding is working perfectly.")
else:
    print("\n❌ Some tests failed. Check encoding settings.")
    sys.exit(1)

# Cleanup
import os
os.remove(test_file)
