// Multi-themed phrase generator
// Plant theme
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

const PLANT_ACTIONS = [
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

const PLANT_ADJECTIVES = [
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

const PLANT_PATTERNS = [
  // Very short patterns
  ["{plant} {action}"],
  ["{adj} {plant}"],
  ["{plant} in {weather}"],

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

// Surf theme
const SURF_ELEMENTS = [
  "wave",
  "swell",
  "tide",
  "beach",
  "shore",
  "reef",
  "break",
  "barrel",
  "curl",
  "lineup",
  "point",
  "crest",
  "foam",
  "whitewash",
  "rip current",
  "sandbar",
  "jetty",
  "coast",
  "horizon",
  "sunset",
];

const SURF_GEAR = [
  "surfboard",
  "longboard",
  "shortboard",
  "fish",
  "gun",
  "leash",
  "wax",
  "wetsuit",
  "fins",
  "traction pad",
  "rash guard",
  "board shorts",
  "booties",
  "hood",
  "gloves",
];

const SURF_ACTIONS = [
  "breaks",
  "crashes",
  "rolls",
  "barrels",
  "peels",
  "forms",
  "rises",
  "builds",
  "pumps",
  "carves",
  "cuts back",
  "drops in",
  "hangs ten",
  "nose rides",
  "bottom turns",
  "floats",
  "airs",
  "tubes",
  "wipes out",
  "paddles out",
];

const SURF_ADJECTIVES = [
  "glassy",
  "hollow",
  "clean",
  "choppy",
  "epic",
  "perfect",
  "massive",
  "pumping",
  "firing",
  "overhead",
  "double overhead",
  "macking",
  "gnarly",
  "radical",
  "sick",
  "stoked",
  "barreling",
  "offshore",
  "onshore",
  "tubular",
];

const SURF_PATTERNS = [
  // Very short patterns
  ["{adj} {element}"],
  ["surf's up"],
  ["riding {element}"],

  ["{adj} {element} {action} at dawn"],
  ["the {adj} {element} {action} perfectly"],
  ["surfer rides the {adj} {element}"],
  ["{gear} glides through {adj} {element}"],
  ["dawn patrol finds {adj} {element}"],
  ["sunset session with {adj} {element}"],
  ["waiting for the {element} to {action}"],
  ["first light reveals {adj} {element}"],
  ["locals only at the {adj} {element}"],
  ["endless summer of {adj} {element}"],
];

// Music theme
const INSTRUMENTS = [
  "guitar",
  "piano",
  "drums",
  "bass",
  "violin",
  "saxophone",
  "trumpet",
  "synthesizer",
  "flute",
  "cello",
  "harp",
  "banjo",
  "accordion",
  "clarinet",
  "theremin",
  "ukulele",
  "trombone",
  "oboe",
  "marimba",
  "sitar",
];

const MUSIC_ELEMENTS = [
  "melody",
  "rhythm",
  "harmony",
  "beat",
  "chord",
  "note",
  "scale",
  "riff",
  "solo",
  "groove",
  "hook",
  "bridge",
  "verse",
  "chorus",
  "breakdown",
  "drop",
  "bassline",
  "lick",
  "progression",
  "arpeggio",
];

const MUSIC_ACTIONS = [
  "plays",
  "resonates",
  "echoes",
  "flows",
  "builds",
  "fades",
  "soars",
  "grooves",
  "jams",
  "improvises",
  "harmonizes",
  "syncopates",
  "swings",
  "rocks",
  "pulses",
  "vibes",
  "drops",
  "crescendos",
  "decrescendos",
  "loops",
];

const MUSIC_ADJECTIVES = [
  "melodic",
  "rhythmic",
  "harmonic",
  "acoustic",
  "electric",
  "ambient",
  "jazzy",
  "funky",
  "soulful",
  "bluesy",
  "classical",
  "electronic",
  "psychedelic",
  "hypnotic",
  "dreamy",
  "groovy",
  "mellow",
  "intense",
  "ethereal",
  "dissonant",
];

const MUSIC_PATTERNS = [
  // Very short patterns
  ["{adj} {instrument}"],
  ["{element} flows"],
  ["midnight {element}"],

  ["{adj} {instrument} {action} through the night"],
  ["the {element} {action} with {adj} feeling"],
  ["{instrument} and {instrument} {action} together"],
  ["midnight {element} {action} in {adj} waves"],
  ["lost in the {adj} {element}"],
  ["finding {adj} {element} in the silence"],
  ["when {instrument} meets {element}, magic happens"],
  ["the {adj} {element} of {instrument} {action}"],
  ["improvising {adj} {element} on {instrument}"],
  ["the {instrument} {action} a {adj} {element}"],
];

// Dad jokes theme
const DAD_JOKE_SETUPS = [
  // Short jokes first
  "What's a shark's favorite game?",
  "Why can't you trust atoms?",
  "What do you call a fish with no eye?",
  "Time flies like what?",
  "What's brown and sticky?",
  "What do you call a deer with no eyes?",
  "What's E.T. short for?",
  "Why did the scarecrow win an award?",
  "What do you call a fake noodle?",
  "What's Forrest Gump's password?",

  "Why don't scientists trust atoms?",
  "Did you hear about the mathematician who's afraid of negative numbers?",
  "Why don't skeletons fight each other?",
  "What do you call a fake noodle?",
  "Why did the scarecrow win an award?",
  "How do you organize a space party?",
  "Why don't eggs tell jokes?",
  "What's the best time to go to the dentist?",
  "Why couldn't the bicycle stand up by itself?",
  "What do you call a fish wearing a crown?",
  "How do you make a tissue dance?",
  "Why did the golfer bring two pairs of pants?",
  "What's brown and sticky?",
  "Why don't melons get married?",
  "What did the ocean say to the beach?",
  "Why did the tomato turn red?",
  "What's orange and sounds like a parrot?",
  "Why did the coffee file a police report?",
  "How does a penguin build its house?",
  "What do you call a bear with no teeth?",
];

const DAD_JOKE_PUNCHLINES = [
  // Punchlines for short jokes
  "Swallow the leader!",
  "They make up everything!",
  "Fsh!",
  "An arrow!",
  "A stick!",
  "No idea!",
  "He's got little legs!",
  "He was outstanding in his field!",
  "An impasta!",
  "1forrest1!",

  "Because they make up everything!",
  "He'll stop at nothing to avoid them!",
  "They don't have the guts!",
  "An impasta!",
  "Because he was outstanding in his field!",
  "You planet!",
  "They'd crack each other up!",
  "Tooth-hurty!",
  "It was two tired!",
  "A kingfish!",
  "Put a little boogie in it!",
  "In case he got a hole in one!",
  "A stick!",
  "Because they cantaloupe!",
  "Nothing, it just waved!",
  "Because it saw the salad dressing!",
  "A carrot!",
  "It got mugged!",
  "Igloos it together!",
  "A gummy bear!",
];

const DAD_JOKE_PATTERNS = [["{setup} {punchline}"]];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generatePlantPhrase() {
  const pattern = getRandomElement(PLANT_PATTERNS);
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
      phrase = phrase.replace("{action}", getRandomElement(PLANT_ACTIONS));
    }
    if (phrase.includes("{adj}")) {
      phrase = phrase.replace("{adj}", getRandomElement(PLANT_ADJECTIVES));
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

function generateSurfPhrase() {
  const pattern = getRandomElement(SURF_PATTERNS);
  let phrase = pattern[0];

  // Replace all tokens with random elements
  while (phrase.includes("{")) {
    if (phrase.includes("{element}")) {
      phrase = phrase.replace("{element}", getRandomElement(SURF_ELEMENTS));
    }
    if (phrase.includes("{gear}")) {
      phrase = phrase.replace("{gear}", getRandomElement(SURF_GEAR));
    }
    if (phrase.includes("{action}")) {
      phrase = phrase.replace("{action}", getRandomElement(SURF_ACTIONS));
    }
    if (phrase.includes("{adj}")) {
      phrase = phrase.replace("{adj}", getRandomElement(SURF_ADJECTIVES));
    }
  }

  return capitalize(phrase);
}

function generateMusicPhrase() {
  const pattern = getRandomElement(MUSIC_PATTERNS);
  let phrase = pattern[0];

  // Replace all tokens with random elements
  while (phrase.includes("{")) {
    if (phrase.includes("{instrument}")) {
      phrase = phrase.replace("{instrument}", getRandomElement(INSTRUMENTS));
    }
    if (phrase.includes("{element}")) {
      phrase = phrase.replace("{element}", getRandomElement(MUSIC_ELEMENTS));
    }
    if (phrase.includes("{action}")) {
      phrase = phrase.replace("{action}", getRandomElement(MUSIC_ACTIONS));
    }
    if (phrase.includes("{adj}")) {
      phrase = phrase.replace("{adj}", getRandomElement(MUSIC_ADJECTIVES));
    }
  }

  return capitalize(phrase);
}

function generateDadJokePhrase() {
  // Sort jokes by total length and prefer shorter ones
  const jokeIndices = Array.from(
    { length: DAD_JOKE_SETUPS.length },
    (_, i) => i
  );

  // Sort indices by total joke length (setup + punchline)
  jokeIndices.sort((a, b) => {
    const lengthA = DAD_JOKE_SETUPS[a].length + DAD_JOKE_PUNCHLINES[a].length;
    const lengthB = DAD_JOKE_SETUPS[b].length + DAD_JOKE_PUNCHLINES[b].length;
    return lengthA - lengthB;
  });

  // Pick from the shortest 10 jokes with higher probability
  const index =
    jokeIndices[Math.floor(Math.random() * Math.min(10, jokeIndices.length))];
  return `${DAD_JOKE_SETUPS[index]} ${DAD_JOKE_PUNCHLINES[index]}`;
}

function generatePhrase() {
  // Randomly select a theme
  const themes = [
    generatePlantPhrase,
    generateSurfPhrase,
    generateMusicPhrase,
    generateDadJokePhrase,
  ];

  // Try up to 3 times to get a phrase under 70 characters
  for (let attempt = 0; attempt < 3; attempt++) {
    const randomTheme = getRandomElement(themes);
    const phrase = randomTheme();

    // If phrase is under 70 characters, return it
    if (phrase.length <= 70) {
      return phrase;
    }
  }

  // If we couldn't get a short enough phrase after 3 attempts,
  // generate one more and truncate it to 70 characters
  const randomTheme = getRandomElement(themes);
  const phrase = randomTheme();
  return phrase.length <= 70 ? phrase : phrase.substring(0, 67) + "...";
}

function generateMultiplePhrases(count = 1) {
  const phrases = [];
  for (let i = 0; i < count; i++) {
    phrases.push(generatePhrase());
  }
  return phrases;
}

export const PhraseGenerator = {
  generatePhrase,
  generateMultiplePhrases,
  // Export individual theme generators for direct access if needed
  generatePlantPhrase,
  generateSurfPhrase,
  generateMusicPhrase,
  generateDadJokePhrase,
};
