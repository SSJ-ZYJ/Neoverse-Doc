---
title: Markdown Syntax Examples
description: Rich GFM and Mermaid diagram syntax support
---

This document demonstrates basic Markdown, GitHub Flavored Markdown (GFM), and Mermaid diagram syntax.

## 1. Basic Markdown Syntax

### Headers

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

```md
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

### Emphasis

*Italic text*
**Bold text**
***Bold italic text***

```md
*Italic text*
**Bold text**
***Bold italic text***
```

### Lists

**Unordered list:**

* Item A
* Item B
  * Sub-item B.1
  * Sub-item B.2

**Ordered list:**

1. First item
2. Second item
3. Third item

### Links & Images

[SSJ's Blog](https://blog.shenshijun.space/)

![SSJ's Avatar](https://q2.qlogo.cn/headimg_dl?dst_uin=1764341276&spec=0 "This is SSJ's avatar title")

### Inline Code

You can embed a small snippet of code in text, like `console.log('Hello World')`.

### Horizontal Rules

---

```md
---
```

## 2. GitHub Flavored Markdown (GFM) Syntax

### Task Lists

* [x] Complete requirements analysis
* [x] Write example documentation
* [ ] Submit code and deploy to production

### Tables

| Feature | Support | Notes |
| :--- | :---: | ---: |
| Table support | Perfect | Center and right alignment |
| Task lists | Perfect | GFM standard |
| Strikethrough | Perfect | `~~text~~` |

### Strikethrough

This is some ~~struck-through text~~.

### Autolinks

You can directly visit my blog: <https://blog.shenshijun.space/>

### Blockquotes

> This is a first-level blockquote.
> > This is a nested second-level blockquote.
> >
> > **Note:** Other Markdown syntax can also be used within blockquotes.

### Alerts

GitHub supports special blockquote syntax to render colored and iconified callout blocks:

> [!NOTE]
> This is a note providing useful supplementary information.

---

> [!TIP]
> This is a tip providing suggestions or shortcuts.

---

> [!IMPORTANT]
> This is important information highlighting key context.

---

> [!WARNING]
> This is a warning reminding you to proceed with caution to avoid issues.

---

> [!CAUTION]
> This is a caution informing you of actions that may lead to destructive consequences.

### Collapsible Details

Collapsible detail blocks are supported, suitable for hiding supplementary notes, advanced content, or lengthy comments:

> [!DETAILS]
>
> This is a collapsible content block that is collapsed by default. You can place additional information, example code, or lengthy explanations here.

Default expanded detail block:

> [!DETAILS+] Expanded by Default
>
> Use the `[!DETAILS+]` syntax to make the collapsible block expanded by default.

### Collapsible Block Variants

In addition to the basic `[!DETAILS]`, several semantic collapsible block types are supported using the `[!DETAILS-XXX]` syntax:

#### FAQ

> [!DETAILS-FAQ] What is Neoverse?
>
> Neoverse is a future-oriented documentation platform committed to providing an elegant documentation reading experience.

#### Answer

> [!DETAILS-ANSWER] How can I contribute?
>
> You can participate by submitting Pull Requests, reporting Issues, or improving documentation.

#### Example

> [!DETAILS-EXAMPLE] Organizing Code Examples with Collapsible Blocks
>
> You can place longer code examples inside collapsible blocks, allowing readers to expand them as needed, keeping documentation concise.
>
> ```cpp
> // src/example.cpp
> #include <iostream>
> int main() {
>     std::cout << "Hello, Neoverse!" << std::endl;
>     return 0;
> }
> ```

#### Hint

> [!DETAILS-HINT] Keyboard Shortcut Tips
>
> Use `Ctrl + K` to quickly open the search dialog, improving documentation browsing efficiency.

### Syntax-Highlighted Code Blocks

The code blocks in this document support the following enhanced features:

* Automatic file path detection from top comments
* File path display in the code block title bar
* Built-in copy button in the top-right corner for one-click copying
* Preserving all of fumadocs' original code highlighting and line number features

### Example 1: JavaScript Code Block

```javascript
// src/utils/helper.js
export function greet(name) {
  return `Hello, ${name}!`;
}

export const add = (a, b) => a + b;
```

### Example 2: TypeScript Code Block

```typescript
// src/components/Button.tsx
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}
```

### Example 3: HTML Code Block

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Project</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

### Example 4: Shell Script

```bash
# scripts/deploy.sh
#!/bin/bash

echo "Starting deployment..."
npm run build
rsync -avz ./dist/ user@server:/var/www/html
echo "Deployment complete!"
```

### Example 5: Python Code Block

```python
# app/main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

### Example 6: Code Block Without File Path

Regular code blocks (without top comments) still work normally, just without the file path title:

```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}
```

## 2. Mermaid Diagram Syntax

### Flowchart

```mermaid
graph TD;
    A[Start] --> B{Condition};
    B -- Yes --> C[Execute Task A];
    B -- No --> D[Execute Task B];
    C --> E[End];
    D --> E;
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Database

    Client->>Server: Send login request
    activate Server
    Server->>Database: Query user info
    activate Database
    Database-->>Server: Return verification result
    deactivate Database
    Server-->>Client: Return Token
    deactivate Server
```

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running : Start
    Running --> Paused : Pause
    Paused --> Running : Resume
    Running --> Finished : Stop
    Finished --> [*]
```
