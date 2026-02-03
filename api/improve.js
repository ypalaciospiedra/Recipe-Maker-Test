export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { recipe, diet, maxTime, servings } = req.body || {};
    if (!recipe) return res.status(400).send("Missing recipe");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).send("Missing OPENAI_API_KEY");

    const prompt = `
You are a cooking assistant. Improve the recipe text below.

Constraints:
- Keep it within ~${maxTime} minutes
- Make ${servings} servings
- Respect diet notes: "${diet || "none"}"
- Make steps clearer and more consistent
- Add substitutions if ingredients are missing
- Keep the same general dish idea
Return ONLY the improved recipe text.

RECIPE:
${recipe}
`.trim();

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    if (!r.ok) return res.status(r.status).send(await r.text());

    const json = await r.json();

    const improved =
      json.output?.[0]?.content?.map(c => c.text).join("") ||
      json.output_text ||
      "";

    return res.status(200).json({ improved });
  } catch (e) {
    return res.status(500).send(e?.message || "Server error");
  }
}
