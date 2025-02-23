// Plant-based phrase generator
const PLANTS = [
  "bonsai",
  "bamboo",
  "orchid",
  "fern",
  "moss",
  "vine",
  "lily",
  "lotus",
  "pine",
  "willow",
  "maple",
  "sakura",
  "wisteria",
  "jasmine",
  "ivy",
  "rose",
  "tulip",
  "dahlia",
  "iris",
  "sage",
  "lavender",
  "thyme",
  "juniper",
  "cypress",
  "birch",
  "oak",
  "cedar",
  "palm",
  "succulent",
  "cactus",
];

const PLANT_PARTS = [
  "leaf",
  "stem",
  "root",
  "flower",
  "petal",
  "branch",
  "seed",
  "bud",
  "thorn",
  "tendril",
  "frond",
  "shoot",
  "sprout",
  "bloom",
  "blossom",
  "needle",
  "cone",
  "bark",
  "sap",
  "spore",
];

const ACTIONS = [
  "grows",
  "blooms",
  "sways",
  "dances",
  "whispers",
  "reaches",
  "unfolds",
  "stretches",
  "bends",
  "flows",
  "spirals",
  "climbs",
  "emerges",
  "awakens",
  "transforms",
  "flourishes",
  "breathes",
  "pulses",
  "weaves",
  "harmonizes",
];

const ADJECTIVES = [
  "gentle",
  "wild",
  "serene",
  "vibrant",
  "delicate",
  "ancient",
  "luminous",
  "graceful",
  "ethereal",
  "resilient",
  "mystical",
  "verdant",
  "tranquil",
  "radiant",
  "sacred",
  "eternal",
  "sublime",
  "pristine",
  "organic",
  "elemental",
];

const ENVIRONMENTS = [
  "garden",
  "forest",
  "meadow",
  "grove",
  "valley",
  "mountain",
  "stream",
  "pond",
  "field",
  "glade",
  "sanctuary",
  "oasis",
  "woodland",
  "marsh",
  "prairie",
  "jungle",
  "canyon",
  "hillside",
  "wetland",
  "terrace",
];

const WEATHER = [
  "sunlight",
  "rain",
  "mist",
  "wind",
  "storm",
  "fog",
  "dew",
  "frost",
  "breeze",
  "shadow",
  "moonlight",
  "twilight",
  "dawn",
  "dusk",
  "sunshine",
  "clouds",
  "rainbow",
  "thunder",
  "lightning",
  "snow",
];

const PATTERNS = [
  // Simple patterns
  ["{plant} {action} in {weather}"],
  ["{adj} {plant} {action}"],
  ["the {plant} {action} with {adj} grace"],
  ["{adj} {part} of {plant} {action}"],

  // Complex patterns
  ["as {weather} falls, {plant} {action}"],
  ["in the {adj} {env}, {plant} {action}"],
  ["{plant} and {plant} {action} together"],
  ["through {weather}, {adj} {plant} {action}"],

  // Poetic patterns
  ["like {adj} {plant}, {part} {action}"],
  ["{weather} makes the {plant} {action}"],
  ["between {plant} and {plant}, {adj} {part} {action}"],
  ["when {weather} meets {plant}, {adj} {part} {action}"],
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generatePhrase() {
  const pattern = getRandomElement(PATTERNS);
  let phrase = pattern[0];

  // Replace all tokens with random elements
  while (phrase.includes("{")) {
    if (phrase.includes("{plant}")) {
      phrase = phrase.replace("{plant}", getRandomElement(PLANTS));
    }
    if (phrase.includes("{part}")) {
      phrase = phrase.replace("{part}", getRandomElement(PLANT_PARTS));
    }
    if (phrase.includes("{action}")) {
      phrase = phrase.replace("{action}", getRandomElement(ACTIONS));
    }
    if (phrase.includes("{adj}")) {
      phrase = phrase.replace("{adj}", getRandomElement(ADJECTIVES));
    }
    if (phrase.includes("{env}")) {
      phrase = phrase.replace("{env}", getRandomElement(ENVIRONMENTS));
    }
    if (phrase.includes("{weather}")) {
      phrase = phrase.replace("{weather}", getRandomElement(WEATHER));
    }
  }

  return capitalize(phrase);
}

function generateMultiplePhrases(count = 1) {
  const phrases = [];
  for (let i = 0; i < count; i++) {
    phrases.push(generatePhrase());
  }
  return phrases;
}

export const PlantPhraseGenerator = {
  generatePhrase,
  generateMultiplePhrases,
};
