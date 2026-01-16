# Session Kickoff Template

Use this checklist at the start of a new chat to establish shared context.

```
Repo: jsreality-2021
Primary goal for this session: continue porting Java project jreality-2021 to JS project in this repo (jsreality-2021).

Key rules to follow:
- Follow docs/JAVA2JS_PORTING_GUIDELINES.md (rules ordered by priority).
- Overloads must be single runtime-dispatch function (no split names).
- JSDoc should use concrete JS types (number[]/number[][]) and real classes only.
- Use DEBUG.* notation for debug flags when relevant.

Known deviations (from docs/CURRENT_STATE_OF_JREALITY_PORT.md):
- JS DataList is simplified; no Java IntArrayArray/DoubleArrayArray hierarchy.
- Abstract geometry factory classes were removed/merged in JS.

Project structure / mapping:
- Java roots to consider: src-core, src-plugin, src-tool (jreality-2021).
- Charles Gunn sources go under jsreality with Charles Gunn header.

Current state / recent changes:
- [e.g., .nojekyll added for GitHub Pages]
- [e.g., test/test-jsrapp-example.html importmap path fixed]

What I want you to do:
- I will give specific instructions in the chat.
```
