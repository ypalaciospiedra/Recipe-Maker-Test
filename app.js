const el = (id) => document.getElementById(id);

const ingredientsInput = el("ingredientsInput");
const pantryInput = el("pantryInput");
const servingsInput = el("servingsInput");
const timeInput = el("timeInput");
const dietInput = el("dietInput");

const generateBtn = el("generateBtn");
const regenBtn = el("regenBtn");
const makeCheaperBtn = el("makeCheaperBtn");
const makeHealthierBtn = el("makeHealthierBtn");

const output = el("output");
const status = el("status");

function setStatus(msg, isError=false){
  status.textContent = msg || "";
  status.className = "status" + (isError ? " error" : "");
}

function parseList(s){
  return (s || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniq(arr){
  return [...new Set(arr)];
}

function normalize(s){
  return (s || "").toLowerCase();
}

function hasAny(hay, needles){
  const h = normalize(hay);
  return needles.some(n => h.includes(n));
}

function classifyIngredients(ings){
  const proteins = [];
  const carbs = [];
  const veg = [];
  const fats = [];
  const other = [];

  const proteinKeys = ["chicken","turkey","beef","steak","pork","ham","bacon","salmon","tuna","shrimp","fish","tofu","tempeh","egg","eggs","lentil","beans","chickpea","yogurt","cottage","ground"];
  const carbKeys = ["rice","pasta","noodle","bread","tortilla","wrap","potato","sweet potato","quinoa","couscous","oats","ramen"];
  const vegKeys = ["onion","garlic","pepper","broccoli","spinach","kale","tomato","carrot","zucchini","mushroom","corn","peas","green bean","cucumber","lettuce","cabbage","cauliflower"];
  const fatKeys = ["olive oil","oil","butter","ghee","avocado","sesame oil","coconut oil","mayo","mayonnaise"];

  ings.forEach(i => {
    const t = normalize(i);
    if (proteinKeys.some(k => t.includes(k))) proteins.push(i);
    else if (carbKeys.some(k => t.includes(k))) carbs.push(i);
    else if (vegKeys.some(k => t.includes(k))) veg.push(i);
    else if (fatKeys.some(k => t.includes(k))) fats.push(i);
    else other.push(i);
  });

  return { proteins, carbs, veg, fats, other };
}

function inferCookingStyles(pantry){
  const p = pantry.map(normalize).join(" | ");
  const styles = [];

  if (hasAny(p, ["soy sauce","ginger","sesame","sriracha","rice vinegar","hoisin"])) styles.push("Asian-inspired");
  if (hasAny(p, ["cumin","paprika","chili","taco","lime","cilantro"])) styles.push("Tex-Mex");
  if (hasAny(p, ["oregano","basil","parmesan","italian","marinara"])) styles.push("Italian-ish");
  if (hasAny(p, ["curry","garam","turmeric","coriander"])) styles.push("Curry-style");
  if (hasAny(p, ["lemon","dill","thyme","rosemary"])) styles.push("Herby-lemon");
  if (styles.length === 0) styles.push("Classic");

  return uniq(styles);
}

function pickSeasoningBlend(pantry){
  const p = pantry.map(normalize);
  const common = ["salt","pepper"];
  const warm = ["garlic powder","onion powder","paprika","cumin","chili powder"];
  const herb = ["oregano","basil","thyme","rosemary","dill","parsley"];
  const spicy = ["cayenne","red pepper flakes","hot sauce","sriracha"];
  const umami = ["soy sauce","worcestershire","fish sauce","parmesan","miso"];
  const acids = ["lemon","lime","vinegar","rice vinegar"];

  const have = (arr) => arr.filter(x => p.includes(x));
  const picks = [
    ...have(common),
    ...pickSome(have(warm), 2),
    ...pickSome(have(herb), 1),
    ...pickSome(have(spicy), 1),
    ...pickSome(have(umami), 1),
    ...pickSome(have(acids), 1),
  ];

  return uniq(picks);
}

function pickSome(arr, n){
  const a = [...arr];
  const out = [];
  while(a.length && out.length < n){
    out.push(a.splice(Math.floor(Math.random()*a.length), 1)[0]);
  }
  return out;
}

function titleCase(s){
  return (s || "").split(" ").map(w => w ? (w[0].toUpperCase()+w.slice(1)) : w).join(" ");
}

function buildRecipe(mode){
  const ingredients = parseList(ingredientsInput.value);
  const pantry = parseList(pantryInput.value);
  const servings = Math.max(1, Number(servingsInput.value || 2));
  const maxTime = Math.max(5, Number(timeInput.value || 30));
  const diet = (dietInput.value || "").trim();

  if (!ingredients.length && !pantry.length){
    setStatus("Add at least some ingredients or pantry items first.", true);
    return "";
  }

  const { proteins, carbs, veg, fats, other } = classifyIngredients(ingredients);
  const style = pick(inferCookingStyles(pantry));
  const blend = pickSeasoningBlend(pantry);

  // Choose a format template
  const templates = [
    "Skillet Bowl",
    "Sheet Pan Roast",
    "One-Pot",
    "Stir-Fry",
    "Tacos/Wraps",
    "Soup/Stew",
    "Pasta-ish"
  ];

  let format = pick(templates);

  // Dietary nudges (best-effort)
  const dietLower = normalize(diet);
  const wantsLowCarb = dietLower.includes("low carb") || dietLower.includes("keto");
  const wantsHighProtein = dietLower.includes("high protein") || dietLower.includes("protein");
  const dairyFree = dietLower.includes("dairy-free") || dietLower.includes("dairy free");
  const vegetarian = dietLower.includes("vegetarian") || dietLower.includes("veg");

  // Mode adjustments
  const modeNote = mode === "cheaper" ? "Budget-first" : mode === "healthier" ? "Healthier" : "Standard";

  // Pick main components
  const protein = proteins.length ? pick(proteins) : (vegetarian ? (other.find(x => normalize(x).includes("tofu")) || other[0]) : null);
  const carb = carbs.length ? pick(carbs) : null;
  const veggies = veg.length ? pickSome(veg, Math.min(3, veg.length)) : pickSome(other, Math.min(2, other.length));

  // If low carb, deprioritize carbs
  const useCarb = carb && !wantsLowCarb;

  // If no protein and wants high protein, suggest beans/eggs if present
  const proteinFallback = proteins.length ? null : (
    other.find(x => normalize(x).includes("beans")) ||
    other.find(x => normalize(x).includes("lentil")) ||
    other.find(x => normalize(x).includes("egg")) ||
    null
  );

  // Choose cooking fat
  const fat = (fats.length ? pick(fats) : (pantry.find(x => normalize(x).includes("oil")) || "oil"));

  // Pick sauces from pantry if present
  const sauceCandidates = pantry.filter(x => {
    const t = normalize(x);
    return ["soy sauce","hot sauce","sriracha","marinara","tomato sauce","coconut milk","broth","stock","vinegar","lemon","lime","mayo","mustard"].some(k => t.includes(k));
  });
  const sauce = sauceCandidates.length ? pick(sauceCandidates) : null;

  // Build name
  const nameBits = [];
  if (mode === "cheaper") nameBits.push("Budget");
  if (mode === "healthier") nameBits.push("Light");
  if (style !== "Classic") nameBits.push(style.replace("-inspired",""));
  if (protein || proteinFallback) nameBits.push(titleCase((protein || proteinFallback)));
  if (useCarb) nameBits.push(titleCase(carb));
  nameBits.push(format);

  const recipeName = uniq(nameBits.filter(Boolean)).join(" ");

  // Time/complexity scaling
  const quick = maxTime <= 20;

  // Ingredients list (approx amounts)
  const ingLines = [];
  ingLines.push(`• ${servings} serving(s) worth of ${protein || proteinFallback || "your main ingredient"} (about ${servings * 4}–${servings * 6} oz total)`);
  if (useCarb) ingLines.push(`• ${useCarb} (about ${Math.ceil(servings * 0.5)} cup(s) dry / or enough for ${servings} servings)`);
  if (veggies.length) ingLines.push(`• Veggies: ${veggies.join(", ")}`);
  ingLines.push(`• ${fat} (1–2 tbsp)`);
  if (blend.length) ingLines.push(`• Seasoning blend: ${blend.join(", ")}`);
  if (sauce) ingLines.push(`• Optional sauce from pantry: ${sauce} (to taste)`);
  if (!dairyFree && pantry.some(x => normalize(x).includes("cheese"))) {
    if (mode !== "healthier") ingLines.push(`• Optional: a sprinkle of cheese (if you want)`);
  }

  // Steps template by format
  const steps = [];

  // Universal prep
  steps.push(`1) Prep: chop/trim your ingredients. If using ${useCarb || "a grain"}, get it cooking first so everything finishes together.`);

  if (format === "Sheet Pan Roast") {
    steps.push(`2) Heat oven to 425°F. Toss ${veggies.length ? "your veggies" : "your ingredients"} with ${fat}, salt + pepper, and any spices you like.`);
    steps.push(`3) Add ${protein || "your main ingredient"} to the pan, season, and roast until cooked through (about ${quick ? "12–18" : "18–25"} min, depending on size).`);
    steps.push(`4) Finish: add a splash of ${sauce || "lemon/vinegar"} if you have it. Serve${useCarb ? " over " + useCarb : ""}.`);
  } else if (format === "Soup/Stew") {
    steps.push(`2) In a pot, warm ${fat}. Sauté onions/veg first (5 min), then add ${protein || "your main ingredient"} and cook until lightly browned.`);
    steps.push(`3) Add liquid if you have it (broth/stock/water). Simmer ${quick ? "10–15" : "20–30"} min. Season as you go with ${blend.length ? blend.join(", ") : "salt + pepper"}.`);
    if (useCarb) steps.push(`4) Add ${useCarb} near the end if it’s quick-cooking (or serve the stew over it).`);
    steps.push(`5) Finish with ${sauce || "acid (lemon/vinegar)"} if available, then taste and adjust seasoning.`);
  } else if (format === "Stir-Fry") {
    steps.push(`2) Heat a skillet on medium-high. Add ${fat}. Cook ${protein || "your main ingredient"} until browned/cooked.`);
    steps.push(`3) Add veggies and cook until crisp-tender (${quick ? "4–6" : "6–8"} min).`);
    steps.push(`4) Season with ${blend.length ? blend.join(", ") : "salt + pepper"} and add ${sauce || "a splash of vinegar/lemon"} to brighten.`);
    steps.push(`5) Serve${useCarb ? " over " + useCarb : ""}.`);
  } else if (format === "One-Pot") {
    steps.push(`2) Warm ${fat} in a pot. Sauté aromatics/veg (3–5 min). Add ${protein || "your main ingredient"} and cook until lightly browned.`);
    if (useCarb) {
      steps.push(`3) Add ${useCarb} + enough water/broth to cook it. Bring to a simmer and cover.`);
      steps.push(`4) Cook until tender, stirring once or twice (${quick ? "12–18" : "18–25"} min).`);
    } else {
      steps.push(`3) Add a little water/broth if needed and cover to steam veggies until tender (${quick ? "8–12" : "12–18"} min).`);
    }
    steps.push(`5) Season well with ${blend.length ? blend.join(", ") : "salt + pepper"} and finish with ${sauce || "something acidic (lemon/vinegar)"} if you have it.`);
  } else if (format === "Tacos/Wraps") {
    steps.push(`2) In a skillet, cook ${protein || "your main ingredient"} in ${fat} with spices (${blend.length ? blend.join(", ") : "salt + pepper"}).`);
    steps.push(`3) Add veggies and cook until tender. Taste and adjust seasoning.`);
    steps.push(`4) Build wraps/tacos with what you have. Add ${sauce || "a squeeze of lemon/lime"} if available.`);
    steps.push(`5) Optional: serve with any side you have (rice, salad, roasted veg).`);
  } else if (format === "Pasta-ish") {
    steps.push(`2) Boil ${useCarb || "pasta/noodles"} if you have it. Save a splash of cooking water.`);
    steps.push(`3) In a skillet, warm ${fat}. Cook ${protein || "your main ingredient"} then add veggies.`);
    steps.push(`4) Toss in cooked pasta + a splash of water. Season with ${blend.length ? blend.join(", ") : "salt + pepper"} and add ${sauce || "tomato/soy/lemon"} if you have it.`);
    steps.push(`5) Finish and serve. Taste, adjust salt, and add pepper/acid.`);
  } else { // Skillet Bowl
    steps.push(`2) In a skillet, warm ${fat}. Cook ${protein || "your main ingredient"} until done.`);
    steps.push(`3) Add veggies and cook until tender (${quick ? "5–7" : "7–10"} min).`);
    steps.push(`4) Season with ${blend.length ? blend.join(", ") : "salt + pepper"} and add ${sauce || "a squeeze of lemon/vinegar"} if available.`);
    steps.push(`5) Serve in bowls${useCarb ? " over " + useCarb : ""}.`);
  }

  // Cheap/healthy tweaks
  const tweaks = [];
  if (mode === "cheaper") {
    tweaks.push("Lean on pantry staples (rice/pasta/beans) and skip optional extras.");
    tweaks.push("Stretch the protein by adding more veggies or beans if you have them.");
    tweaks.push("Use cheaper seasoning combos (salt, pepper, garlic powder, paprika) and a splash of vinegar/lemon to boost flavor.");
  }
  if (mode === "healthier") {
    tweaks.push("Use a bit less oil and keep veggies slightly crisp (don’t overcook).");
    tweaks.push("Add an extra veggie if you have it; use whole grains if available.");
    tweaks.push("Balance the plate: protein + lots of veg + modest carbs.");
  }
  if (wantsHighProtein && !protein && proteinFallback) {
    tweaks.push("High-protein note: your best protein option here is " + proteinFallback + ".");
  }
  if (wantsLowCarb) {
    tweaks.push("Low-carb note: skip grains; serve as a veggie bowl or wrap in lettuce if you have it.");
  }

  // Optional add-ons (max 3)
  const addOns = [];
  const addOnIdeas = [
    "a lemon/lime",
    "a can of beans or chickpeas",
    "frozen mixed vegetables",
    "a jar sauce (marinara/teriyaki)",
    "tortillas or bread",
    "plain yogurt",
    "shredded cheese",
    "fresh herbs"
  ];
  while(addOns.length < 3){
    const c = pick(addOnIdeas);
    if (!addOns.includes(c)) addOns.push(c);
  }

  // Build output
  const summary = `${modeNote} ${style.toLowerCase()} recipe built from what you listed. Designed for ~${maxTime} minutes and ${servings} serving(s).`;

  return [
    `1) Recipe name`,
    recipeName,
    ``,
    `2) Quick summary`,
    summary,
    ``,
    `3) Ingredients`,
    ...ingLines,
    ``,
    `4) Steps`,
    ...steps,
    ``,
    `5) Time + servings`,
    `• Time: ~${maxTime} minutes (approx)`,
    `• Servings: ${servings}`,
    ``,
    `6) Optional add-ons (up to 3 items)`,
    `• ${addOns.join("\n• ")}`,
    ``,
    `7) Tips to make it better`,
    `• Taste near the end and add a little acid (lemon/vinegar) if you have it.`,
    `• Add salt in small pinches — it’s the fastest way to improve flavor.`,
    `• If it feels flat, add a warm spice (paprika/cumin) or a tiny bit of heat.`,
    ...(tweaks.length ? ["", `Extra tweaks (${modeNote}):`, ...tweaks.map(t => `• ${t}`)] : [])
  ].join("\n");
}

function generate(mode){
  setStatus("");
  const txt = buildRecipe(mode);
  if (txt) {
    output.value = txt;
    setStatus("Done. You can regenerate or tweak cheaper/healthier.");
  }
}

generateBtn.addEventListener("click", () => generate("standard"));
regenBtn.addEventListener("click", () => generate("standard"));
makeCheaperBtn.addEventListener("click", () => generate("cheaper"));
makeHealthierBtn.addEventListener("click", () => generate("healthier"));
aiImproveBtn.addEventListener("click", async () => {
  try {
    setStatus("Asking AI to improve your recipe...");
    aiImproveBtn.disabled = true;

    const current = output.value.trim();
    if (!current) {
      setStatus("Generate a recipe first, then try AI Improve.", true);
      return;
    }

    const payload = {
      recipe: current,
      diet: (dietInput.value || "").trim(),
      maxTime: Number(timeInput.value || 30),
      servings: Number(servingsInput.value || 2)
    };

    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    output.value = data.improved || current;

    setStatus("Done. AI improved the recipe.");
  } catch (e) {
    setStatus("AI improvement failed: " + (e?.message || e), true);
  } finally {
    aiImproveBtn.disabled = false;
  }
});


// Defaults
ingredientsInput.value = "chicken breast, rice, onion, bell pepper";
pantryInput.value = "salt, black pepper, garlic powder, paprika, cumin, olive oil";
setStatus("Ready. Add your ingredients and click Generate.");
