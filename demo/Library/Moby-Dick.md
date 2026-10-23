---
author: Herman Melville
year: 1851
status: Finished
rating: 4
cover: "[[Cover - Moby-Dick.png]]"
tags:
  - book
---
A whaling voyage, told by the one sailor who comes back.

## After reading

- [x] Finish the Epilogue
- [x] Reread "The Whiteness of the Whale"
- [/] Work through the essays in the Norton edition
- [!] Return the library copy by Friday
- [?] Who is Ishmael telling this to, and how long after?
- [-] Log every ship the Pequod meets (gave up at the sixth)
- [ ] Watch John Huston's 1956 film

## Marginalia

- ["] Call me Ishmael.
- [*] Father Mapple's sermon, chapter 9
- [b] Chapter 42, "The Whiteness of the Whale"
- [i] Published in London first, as *The Whale*
- [p] The cetology chapters are funnier than their reputation
- [c] Ahab doesn't appear until chapter 28

## Counting names

```python
# How often each name comes up in the Project Gutenberg text.
import re
from collections import Counter
from pathlib import Path

text = Path("moby-dick.txt").read_text(encoding="utf-8").lower()
counts = Counter(re.findall(r"[a-z]+", text))

for name in ("whale", "ahab", "ishmael", "queequeg", "starbuck"):
    print(f"{name:>9} {counts[name]:>5}")
```
