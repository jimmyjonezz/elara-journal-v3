# Elara Journal v3

AI-powered journaling system with memory, reflection, and adaptive behavior.

---

## Overview

Elara Journal v3 is an experimental AI system designed to evolve from a simple text generator into a self-improving cognitive system.

It generates journal entries, analyzes them, stores memory, and uses past experience to influence future outputs.

---

## Core Features

* Journal entry generation (LLM-based)
* Semantic memory (vector embeddings)
* Reflection system (self-analysis)
* Feedback loop for behavior improvement
* Automated execution (GitHub Actions)

---

## Architecture

```
domain      → entities
interfaces  → contracts
services    → logic
core        → orchestration
infra       → external APIs
```

---

## Pipeline

```
buildContext → generate → embed → reflect → evaluate → store → publish
```

---

## Tech Stack

* **Generation:** Ollama Cloud
* **Embeddings:** Voyage AI
* **Runtime:** Node.js + TypeScript
* **Execution:** GitHub Actions
* **Storage:** JSON (Git-backed)

---

## Memory System

* Short-term memory (recent entries)
* Semantic memory (vector similarity)
* Reflective memory (self-analysis)

---

## Reflection System

Each entry is analyzed to extract:

* quality score
* issues
* improvements
* themes

These signals are injected into future generations.

---

## Feedback Loop

```
entry → reflection → next entry
```

This enables gradual behavioral change.

---

## Setup

### 1. Install dependencies

```
npm install
```

---

### 2. Environment variables

```
VOYAGE_API_KEY=your_key
OLLAMA_API_KEY=your_key
```

---

### 3. Run locally

```
npx ts-node main.ts
```

---

### 4. GitHub Actions

Runs automatically via cron.

---

## Current Status

* Generation: stable
* Embeddings: active
* Memory: active
* Reflection: integrated
* Feedback loop: basic

---

## Roadmap

* stronger reflection influence
* self-state modeling
* memory optimization
* vector database integration
* external interfaces (web / bot)

---

## Goal

Transform the system from:

```
text generator → adaptive cognitive system
```

---
