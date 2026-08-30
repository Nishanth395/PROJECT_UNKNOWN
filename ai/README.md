# AI & Intent Extraction Module

Owned by: **Member 5 (AI & Matching Lead)**

## Purpose
This directory contains the decoupled AI analytical engine responsible for extracting categories, skills, and urgency from unstructured problem descriptions.

> **CRITICAL RULE**: This module is purely stateless ($Text \rightarrow JSON$) and has **no direct database connection**.

## Planned Structure
```text
ai/
├── parser.py          # Main interface: extract_intent_and_skills()
├── adapters/          # LLM integrations (Gemini / OpenAI structured output)
├── prompts/           # System prompts and domain skill taxonomy
├── tests/             # Intent parser unit tests
└── README.md
```
