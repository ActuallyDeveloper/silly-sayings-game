export interface BlackCard {
  id: number;
  text: string;
  pick: number;
  pack: PackId;
}

export interface WhiteCard {
  id: number;
  text: string;
  pack: PackId;
}

export type PackId = "classic" | "pg13" | "nsfw" | "popculture" | "custom";

export interface CardPack {
  id: PackId;
  name: string;
  emoji: string;
  description: string;
  blackCount: number;
  whiteCount: number;
}

export const cardPacks: CardPack[] = [
  { id: "classic", name: "Classic", emoji: "🃏", description: "The original Cards Against Humanity experience", blackCount: 30, whiteCount: 60 },
  { id: "pg13", name: "PG-13", emoji: "😇", description: "Family-friendlier prompts & answers", blackCount: 20, whiteCount: 50 },
  { id: "nsfw", name: "NSFW", emoji: "🔞", description: "Adults only. You've been warned.", blackCount: 15, whiteCount: 40 },
  { id: "popculture", name: "Pop Culture", emoji: "🎬", description: "Movies, music, memes & internet culture", blackCount: 15, whiteCount: 40 },
  { id: "custom", name: "My Cards", emoji: "✏️", description: "Your custom-created cards", blackCount: 0, whiteCount: 0 },
];

// ===== CLASSIC PACK =====
const classicBlack: BlackCard[] = [
  { id: 1, text: "What's that smell?", pick: 1, pack: "classic" },
  { id: 2, text: "I got 99 problems but _ ain't one.", pick: 1, pack: "classic" },
  { id: 3, text: "Maybe she's born with it. Maybe it's _.", pick: 1, pack: "classic" },
  { id: 4, text: "What's the next Happy Meal toy?", pick: 1, pack: "classic" },
  { id: 5, text: "_ is a slippery slope that leads to _.", pick: 2, pack: "classic" },
  { id: 6, text: "In a world ravaged by _, our only solace is _.", pick: 2, pack: "classic" },
  { id: 7, text: "During sex, I like to think about _.", pick: 1, pack: "classic" },
  { id: 8, text: "What ended my last relationship?", pick: 1, pack: "classic" },
  { id: 9, text: "I drink to forget _.", pick: 1, pack: "classic" },
  { id: 10, text: "I'm sorry, Professor, but I couldn't complete my homework because of _.", pick: 1, pack: "classic" },
  { id: 11, text: "What's a girl's best friend?", pick: 1, pack: "classic" },
  { id: 12, text: "What never fails to liven up the party?", pick: 1, pack: "classic" },
  { id: 13, text: "The class field trip was completely ruined by _.", pick: 1, pack: "classic" },
  { id: 14, text: "When I'm in prison, I'll have _ to keep me company.", pick: 1, pack: "classic" },
  { id: 15, text: "What's my secret power?", pick: 1, pack: "classic" },
  { id: 16, text: "What do old people smell like?", pick: 1, pack: "classic" },
  { id: 17, text: "In his new summer blockbuster, Arnold Schwarzenegger is _.", pick: 1, pack: "classic" },
  { id: 18, text: "Life for American Indians was forever changed when the White Man introduced them to _.", pick: 1, pack: "classic" },
  { id: 19, text: "Instead of coal, Santa now gives the bad children _.", pick: 1, pack: "classic" },
  { id: 20, text: "What's the most emo?", pick: 1, pack: "classic" },
  { id: 21, text: "Next on ESPN2, the World Series of _.", pick: 1, pack: "classic" },
  { id: 22, text: "What's Batman's guilty pleasure?", pick: 1, pack: "classic" },
  { id: 23, text: "TSA guidelines now prohibit _ on airplanes.", pick: 1, pack: "classic" },
  { id: 24, text: "White people like _.", pick: 1, pack: "classic" },
  { id: 25, text: "What's the crustiest?", pick: 1, pack: "classic" },
  { id: 26, text: "What did I bring back from Mexico?", pick: 1, pack: "classic" },
  { id: 27, text: "What will always get you laid?", pick: 1, pack: "classic" },
  { id: 28, text: "Why can't I sleep at night?", pick: 1, pack: "classic" },
  { id: 29, text: "What are my parents hiding from me?", pick: 1, pack: "classic" },
  { id: 30, text: "What helps Obama unwind?", pick: 1, pack: "classic" },
];

const classicWhite: WhiteCard[] = [
  { id: 1, text: "Being on fire.", pack: "classic" },
  { id: 2, text: "Racism.", pack: "classic" },
  { id: 3, text: "Old-people smell.", pack: "classic" },
  { id: 4, text: "A micropenis.", pack: "classic" },
  { id: 5, text: "Women in yogurt commercials.", pack: "classic" },
  { id: 6, text: "Classist undertones.", pack: "classic" },
  { id: 7, text: "Not giving a shit about the Third World.", pack: "classic" },
  { id: 8, text: "The Rapture.", pack: "classic" },
  { id: 9, text: "Being a motherfucking sorcerer.", pack: "classic" },
  { id: 10, text: "A disappointing birthday party.", pack: "classic" },
  { id: 11, text: "Puppies!", pack: "classic" },
  { id: 12, text: "A windmill full of corpses.", pack: "classic" },
  { id: 13, text: "My soul.", pack: "classic" },
  { id: 14, text: "Lady Gaga.", pack: "classic" },
  { id: 15, text: "A bag of magic beans.", pack: "classic" },
  { id: 16, text: "Dying.", pack: "classic" },
  { id: 17, text: "The American Dream.", pack: "classic" },
  { id: 18, text: "Emotions.", pack: "classic" },
  { id: 19, text: "Nicolas Cage.", pack: "classic" },
  { id: 20, text: "Friends with benefits.", pack: "classic" },
  { id: 21, text: "Figgy pudding.", pack: "classic" },
  { id: 22, text: "A cooler full of organs.", pack: "classic" },
  { id: 23, text: "Scientology.", pack: "classic" },
  { id: 24, text: "Inappropriate yodeling.", pack: "classic" },
  { id: 25, text: "Viagra.", pack: "classic" },
  { id: 26, text: "Charisma.", pack: "classic" },
  { id: 27, text: "A tiny horse.", pack: "classic" },
  { id: 28, text: "Poor life choices.", pack: "classic" },
  { id: 29, text: "Passive-aggressive Post-it notes.", pack: "classic" },
  { id: 30, text: "Self-loathing.", pack: "classic" },
  { id: 31, text: "Getting really high.", pack: "classic" },
  { id: 32, text: "Daddy issues.", pack: "classic" },
  { id: 33, text: "The Force.", pack: "classic" },
  { id: 34, text: "Object permanence.", pack: "classic" },
  { id: 35, text: "A mime having a stroke.", pack: "classic" },
  { id: 36, text: "Saxophone solos.", pack: "classic" },
  { id: 37, text: "Hot cheese.", pack: "classic" },
  { id: 38, text: "Pretending to care.", pack: "classic" },
  { id: 39, text: "A sassy black woman.", pack: "classic" },
  { id: 40, text: "Explosions.", pack: "classic" },
  { id: 41, text: "Kanye West.", pack: "classic" },
  { id: 42, text: "Alcoholism.", pack: "classic" },
  { id: 43, text: "The miracle of childbirth.", pack: "classic" },
  { id: 44, text: "A really cool hat.", pack: "classic" },
  { id: 45, text: "Soup that is too hot.", pack: "classic" },
  { id: 46, text: "Grandma.", pack: "classic" },
  { id: 47, text: "Darth Vader.", pack: "classic" },
  { id: 48, text: "Arnold Schwarzenegger.", pack: "classic" },
  { id: 49, text: "Skeletor.", pack: "classic" },
  { id: 50, text: "Estrogen.", pack: "classic" },
  { id: 51, text: "A sea of troubles.", pack: "classic" },
  { id: 52, text: "A sad handjob.", pack: "classic" },
  { id: 53, text: "The KKK.", pack: "classic" },
  { id: 54, text: "The Big Bang.", pack: "classic" },
  { id: 55, text: "Natalie Portman.", pack: "classic" },
  { id: 56, text: "The Devil himself.", pack: "classic" },
  { id: 57, text: "Vikings.", pack: "classic" },
  { id: 58, text: "Boogers.", pack: "classic" },
  { id: 59, text: "Christopher Walken.", pack: "classic" },
  { id: 60, text: "Doing the right thing.", pack: "classic" },
];

// ===== PG-13 PACK =====
const pg13Black: BlackCard[] = [
  { id: 201, text: "What's the worst thing to find in your lunchbox?", pick: 1, pack: "pg13" },
  { id: 202, text: "My teacher said I was special because of _.", pick: 1, pack: "pg13" },
  { id: 203, text: "The school talent show was ruined by _.", pick: 1, pack: "pg13" },
  { id: 204, text: "What keeps me up at night?", pick: 1, pack: "pg13" },
  { id: 205, text: "My grandma's secret ingredient is _.", pick: 1, pack: "pg13" },
  { id: 206, text: "The worst superpower would be _.", pick: 1, pack: "pg13" },
  { id: 207, text: "What ruined the family reunion?", pick: 1, pack: "pg13" },
  { id: 208, text: "The zoo had to close because of _.", pick: 1, pack: "pg13" },
  { id: 209, text: "My imaginary friend turned out to be _.", pick: 1, pack: "pg13" },
  { id: 210, text: "The worst thing about summer camp is _.", pick: 1, pack: "pg13" },
  { id: 211, text: "My autobiography will be called '_'.", pick: 1, pack: "pg13" },
  { id: 212, text: "What would make school actually fun?", pick: 1, pack: "pg13" },
  { id: 213, text: "The class pet escaped and found _.", pick: 1, pack: "pg13" },
  { id: 214, text: "If I could uninvent one thing, it would be _.", pick: 1, pack: "pg13" },
  { id: 215, text: "The worst birthday present is _.", pick: 1, pack: "pg13" },
  { id: 216, text: "My New Year's resolution is to stop _.", pick: 1, pack: "pg13" },
  { id: 217, text: "What did the fortune cookie say?", pick: 1, pack: "pg13" },
  { id: 218, text: "The school cafeteria is now serving _.", pick: 1, pack: "pg13" },
  { id: 219, text: "The weirdest thing in the lost and found is _.", pick: 1, pack: "pg13" },
  { id: 220, text: "Mom said I can't have _ for dinner.", pick: 1, pack: "pg13" },
];

const pg13White: WhiteCard[] = [
  { id: 201, text: "A kazoo solo.", pack: "pg13" },
  { id: 202, text: "Forgetting your pants.", pack: "pg13" },
  { id: 203, text: "A very judgmental cat.", pack: "pg13" },
  { id: 204, text: "Socks with sandals.", pack: "pg13" },
  { id: 205, text: "An awkward silence.", pack: "pg13" },
  { id: 206, text: "Accidentally replying all.", pack: "pg13" },
  { id: 207, text: "Your browser history.", pack: "pg13" },
  { id: 208, text: "Glitter. Everywhere.", pack: "pg13" },
  { id: 209, text: "A participation trophy.", pack: "pg13" },
  { id: 210, text: "Sleeping through your alarm.", pack: "pg13" },
  { id: 211, text: "Dad jokes.", pack: "pg13" },
  { id: 212, text: "An uncomfortable amount of cheese.", pack: "pg13" },
  { id: 213, text: "Tripping over nothing.", pack: "pg13" },
  { id: 214, text: "A strongly worded letter.", pack: "pg13" },
  { id: 215, text: "Waving back at someone who wasn't waving at you.", pack: "pg13" },
  { id: 216, text: "A group project.", pack: "pg13" },
  { id: 217, text: "Free WiFi.", pack: "pg13" },
  { id: 218, text: "A surprise quiz.", pack: "pg13" },
  { id: 219, text: "Stepping on a LEGO.", pack: "pg13" },
  { id: 220, text: "The friend who always says 'I told you so.'", pack: "pg13" },
  { id: 221, text: "A passive-aggressive birthday card.", pack: "pg13" },
  { id: 222, text: "Leaving a voicemail.", pack: "pg13" },
  { id: 223, text: "Autocorrect.", pack: "pg13" },
  { id: 224, text: "That one weird uncle.", pack: "pg13" },
  { id: 225, text: "A motivational poster.", pack: "pg13" },
  { id: 226, text: "Bubble wrap.", pack: "pg13" },
  { id: 227, text: "A haunted Furby.", pack: "pg13" },
  { id: 228, text: "Crocs.", pack: "pg13" },
  { id: 229, text: "Accidentally liking an old photo.", pack: "pg13" },
  { id: 230, text: "The snooze button.", pack: "pg13" },
  { id: 231, text: "A conspiracy theory about pigeons.", pack: "pg13" },
  { id: 232, text: "Forgetting someone's name immediately.", pack: "pg13" },
  { id: 233, text: "An existential crisis.", pack: "pg13" },
  { id: 234, text: "Running out of toilet paper.", pack: "pg13" },
  { id: 235, text: "A dramatic exit.", pack: "pg13" },
  { id: 236, text: "Photobombing.", pack: "pg13" },
  { id: 237, text: "A 3-hour meeting that could have been an email.", pack: "pg13" },
  { id: 238, text: "The sound of someone chewing.", pack: "pg13" },
  { id: 239, text: "Putting on wet socks.", pack: "pg13" },
  { id: 240, text: "A very long receipt.", pack: "pg13" },
  { id: 241, text: "Forgetting why you walked into a room.", pack: "pg13" },
  { id: 242, text: "A rubber duck.", pack: "pg13" },
  { id: 243, text: "The wrong type of cheese.", pack: "pg13" },
  { id: 244, text: "A questionable life choice.", pack: "pg13" },
  { id: 245, text: "Being put on hold.", pack: "pg13" },
  { id: 246, text: "A PowerPoint presentation.", pack: "pg13" },
  { id: 247, text: "Eating cereal for dinner.", pack: "pg13" },
  { id: 248, text: "A tiny hat on a big dog.", pack: "pg13" },
  { id: 249, text: "The wifi password.", pack: "pg13" },
  { id: 250, text: "An unreasonably long grocery list.", pack: "pg13" },
];

// ===== NSFW PACK =====
const nsfwBlack: BlackCard[] = [
  { id: 301, text: "What's my safe word?", pick: 1, pack: "nsfw" },
  { id: 302, text: "The strip club now offers _ as a VIP service.", pick: 1, pack: "nsfw" },
  { id: 303, text: "What really happens at bachelorette parties?", pick: 1, pack: "nsfw" },
  { id: 304, text: "The most disturbing thing I found in my partner's search history was _.", pick: 1, pack: "nsfw" },
  { id: 305, text: "My therapist says _ is not a healthy coping mechanism.", pick: 1, pack: "nsfw" },
  { id: 306, text: "_ + alcohol = terrible decisions.", pick: 1, pack: "nsfw" },
  { id: 307, text: "The Walk of Shame™ is nothing compared to _.", pick: 1, pack: "nsfw" },
  { id: 308, text: "What did the fraternity get in trouble for this time?", pick: 1, pack: "nsfw" },
  { id: 309, text: "My Tinder bio says I'm really into _.", pick: 1, pack: "nsfw" },
  { id: 310, text: "The morning-after pill can't fix _.", pick: 1, pack: "nsfw" },
  { id: 311, text: "What's the worst thing to whisper during a first date?", pick: 1, pack: "nsfw" },
  { id: 312, text: "I'm not addicted to _, I can stop whenever I want.", pick: 1, pack: "nsfw" },
  { id: 313, text: "The sex ed class covered _ this year.", pick: 1, pack: "nsfw" },
  { id: 314, text: "My OnlyFans specializes in _.", pick: 1, pack: "nsfw" },
  { id: 315, text: "_ is the reason I was banned from the bar.", pick: 1, pack: "nsfw" },
];

const nsfwWhite: WhiteCard[] = [
  { id: 301, text: "Coat hanger abortions.", pack: "nsfw" },
  { id: 302, text: "A bleached asshole.", pack: "nsfw" },
  { id: 303, text: "Two midgets shitting into a bucket.", pack: "nsfw" },
  { id: 304, text: "Tentacle porn.", pack: "nsfw" },
  { id: 305, text: "Pixelated bukkake.", pack: "nsfw" },
  { id: 306, text: "A snapping turtle biting the tip of your penis.", pack: "nsfw" },
  { id: 307, text: "Jerking off into a pool of children's tears.", pack: "nsfw" },
  { id: 308, text: "Picking up girls at the abortion clinic.", pack: "nsfw" },
  { id: 309, text: "An erection that lasts longer than four hours.", pack: "nsfw" },
  { id: 310, text: "Firing a rifle into the air while balls deep in a squealing hog.", pack: "nsfw" },
  { id: 311, text: "A Super Soaker full of cat pee.", pack: "nsfw" },
  { id: 312, text: "Mouth herpes.", pack: "nsfw" },
  { id: 313, text: "Sexual tension.", pack: "nsfw" },
  { id: 314, text: "Roofies.", pack: "nsfw" },
  { id: 315, text: "A stray pube.", pack: "nsfw" },
  { id: 316, text: "Extremely tight pants.", pack: "nsfw" },
  { id: 317, text: "Teenage pregnancy.", pack: "nsfw" },
  { id: 318, text: "Making a skin suit out of its victims.", pack: "nsfw" },
  { id: 319, text: "Dead babies.", pack: "nsfw" },
  { id: 320, text: "The clitoris.", pack: "nsfw" },
  { id: 321, text: "My vagina.", pack: "nsfw" },
  { id: 322, text: "The placenta.", pack: "nsfw" },
  { id: 323, text: "Pooping back and forth. Forever.", pack: "nsfw" },
  { id: 324, text: "An Oedipus complex.", pack: "nsfw" },
  { id: 325, text: "Chunks of dead hitchhiker.", pack: "nsfw" },
  { id: 326, text: "Altar boys.", pack: "nsfw" },
  { id: 327, text: "Pedophiles.", pack: "nsfw" },
  { id: 328, text: "Ethnic cleansing.", pack: "nsfw" },
  { id: 329, text: "MechaHitler.", pack: "nsfw" },
  { id: 330, text: "Auschwitz.", pack: "nsfw" },
  { id: 331, text: "A drive-by shooting.", pack: "nsfw" },
  { id: 332, text: "Preteens.", pack: "nsfw" },
  { id: 333, text: "Crippling debt.", pack: "nsfw" },
  { id: 334, text: "Lockjaw.", pack: "nsfw" },
  { id: 335, text: "Britney Spears at 55.", pack: "nsfw" },
  { id: 336, text: "Lance Armstrong's missing testicle.", pack: "nsfw" },
  { id: 337, text: "A middle-aged man on roller blades.", pack: "nsfw" },
  { id: 338, text: "Underprivileged children.", pack: "nsfw" },
  { id: 339, text: "Amputees.", pack: "nsfw" },
  { id: 340, text: "Glenn Beck catching a Mexican cold.", pack: "nsfw" },
];

// ===== POP CULTURE PACK =====
const popcultureBlack: BlackCard[] = [
  { id: 401, text: "The next Marvel movie is about a hero who fights crime with _.", pick: 1, pack: "popculture" },
  { id: 402, text: "The real reason the Titanic sank was _.", pick: 1, pack: "popculture" },
  { id: 403, text: "Netflix's latest hit series is about _.", pick: 1, pack: "popculture" },
  { id: 404, text: "The new iPhone feature is _.", pick: 1, pack: "popculture" },
  { id: 405, text: "Taylor Swift's next album is inspired by _.", pick: 1, pack: "popculture" },
  { id: 406, text: "The secret to going viral on TikTok is _.", pick: 1, pack: "popculture" },
  { id: 407, text: "Elon Musk just tweeted about _.", pick: 1, pack: "popculture" },
  { id: 408, text: "The worst crossover episode ever: _ meets _.", pick: 2, pack: "popculture" },
  { id: 409, text: "The Grammy for Best New Artist goes to _.", pick: 1, pack: "popculture" },
  { id: 410, text: "Disney+ just announced a live-action remake of _.", pick: 1, pack: "popculture" },
  { id: 411, text: "The newest trending meme is about _.", pick: 1, pack: "popculture" },
  { id: 412, text: "The Super Bowl halftime show featured _.", pick: 1, pack: "popculture" },
  { id: 413, text: "AI will eventually replace _.", pick: 1, pack: "popculture" },
  { id: 414, text: "The podcast nobody asked for: The _ Experience.", pick: 1, pack: "popculture" },
  { id: 415, text: "What's trending on Twitter right now?", pick: 1, pack: "popculture" },
];

const popcultureWhite: WhiteCard[] = [
  { id: 401, text: "Baby Yoda.", pack: "popculture" },
  { id: 402, text: "A Fortnite dance at a funeral.", pack: "popculture" },
  { id: 403, text: "The Kardashians.", pack: "popculture" },
  { id: 404, text: "An AI-generated influencer.", pack: "popculture" },
  { id: 405, text: "The Metaverse.", pack: "popculture" },
  { id: 406, text: "A cancelled celebrity.", pack: "popculture" },
  { id: 407, text: "NFTs of people's feet.", pack: "popculture" },
  { id: 408, text: "Doom scrolling at 3 AM.", pack: "popculture" },
  { id: 409, text: "Florida Man.", pack: "popculture" },
  { id: 410, text: "Crypto bros.", pack: "popculture" },
  { id: 411, text: "A gender reveal party gone wrong.", pack: "popculture" },
  { id: 412, text: "Main character energy.", pack: "popculture" },
  { id: 413, text: "ChatGPT writing your wedding vows.", pack: "popculture" },
  { id: 414, text: "Getting ratio'd on Twitter.", pack: "popculture" },
  { id: 415, text: "A TikTok dance challenge.", pack: "popculture" },
  { id: 416, text: "Quiet quitting.", pack: "popculture" },
  { id: 417, text: "The multiverse.", pack: "popculture" },
  { id: 418, text: "An unhinged LinkedIn post.", pack: "popculture" },
  { id: 419, text: "Spotify Wrapped.", pack: "popculture" },
  { id: 420, text: "The Eras Tour.", pack: "popculture" },
  { id: 421, text: "A parasocial relationship.", pack: "popculture" },
  { id: 422, text: "Siri misunderstanding everything.", pack: "popculture" },
  { id: 423, text: "Influencer apology videos.", pack: "popculture" },
  { id: 424, text: "The simulation theory.", pack: "popculture" },
  { id: 425, text: "Going goblin mode.", pack: "popculture" },
  { id: 426, text: "A deepfake of your boss.", pack: "popculture" },
  { id: 427, text: "Your Uber driver's life story.", pack: "popculture" },
  { id: 428, text: "The Marvel post-credits scene.", pack: "popculture" },
  { id: 429, text: "A Twitter/X rebrand.", pack: "popculture" },
  { id: 430, text: "Binge-watching instead of sleeping.", pack: "popculture" },
  { id: 431, text: "A wholesome Reddit thread.", pack: "popculture" },
  { id: 432, text: "The Barbie movie.", pack: "popculture" },
  { id: 433, text: "Elon Musk's next big idea.", pack: "popculture" },
  { id: 434, text: "Being 'today years old' when you learned something.", pack: "popculture" },
  { id: 435, text: "A podcast hosted by two comedians.", pack: "popculture" },
  { id: 436, text: "The algorithm.", pack: "popculture" },
  { id: 437, text: "An ASMR video of _.", pack: "popculture" },
  { id: 438, text: "Beyoncé.", pack: "popculture" },
  { id: 439, text: "A hot take nobody agrees with.", pack: "popculture" },
  { id: 440, text: "Deleting your post after zero likes.", pack: "popculture" },
];

// Combined accessors
export const allBlackCards = [...classicBlack, ...pg13Black, ...nsfwBlack, ...popcultureBlack];
export const allWhiteCards = [...classicWhite, ...pg13White, ...nsfwWhite, ...popcultureWhite];

// Legacy exports for backward compat
export const blackCards = allBlackCards;
export const whiteCards = allWhiteCards;

export function getCardsByPacks(packs: PackId[]): { blacks: BlackCard[]; whites: WhiteCard[] } {
  return {
    blacks: allBlackCards.filter((c) => packs.includes(c.pack)),
    whites: allWhiteCards.filter((c) => packs.includes(c.pack)),
  };
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
