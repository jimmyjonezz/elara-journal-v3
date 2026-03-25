async embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      input: text,
      model: process.env.VOYAGE_MODEL || "voyage-4-lite"
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Voyage API error: ${errText}`)
  }

  const data: any = await res.json()

  // --- ЛОГ (оставь временно) ---
  console.log("VOYAGE RAW:", JSON.stringify(data).slice(0, 300))

  // --- поддержка всех форматов ---
  if (data.embeddings && data.embeddings.length > 0) {
    return data.embeddings[0]
  }

  if (data.data && data.data.length > 0 && data.data[0].embedding) {
    return data.data[0].embedding
  }

  throw new Error("Voyage embedding failed: empty response")
}
