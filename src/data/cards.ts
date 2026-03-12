export interface BlackCard {
  id: number;
  text: string;
  pick: number; // how many white cards to pick
}

export interface WhiteCard {
  id: number;
  text: string;
}

export const blackCards: BlackCard[] = [
  { id: 1, text: "What's that smell?", pick: 1 },
  { id: 2, text: "I got 99 problems but _ ain't one.", pick: 1 },
  { id: 3, text: "Maybe she's born with it. Maybe it's _.", pick: 1 },
  { id: 4, text: "What's the next Happy Meal toy?", pick: 1 },
  { id: 5, text: "_ is a slippery slope that leads to _.", pick: 2 },
  { id: 6, text: "In a world ravaged by _, our only solace is _.", pick: 2 },
  { id: 7, text: "During sex, I like to think about _.", pick: 1 },
  { id: 8, text: "What ended my last relationship?", pick: 1 },
  { id: 9, text: "I drink to forget _.", pick: 1 },
  { id: 10, text: "I'm sorry, Professor, but I couldn't complete my homework because of _.", pick: 1 },
  { id: 11, text: "What's a girl's best friend?", pick: 1 },
  { id: 12, text: "What never fails to liven up the party?", pick: 1 },
  { id: 13, text: "The class field trip was completely ruined by _.", pick: 1 },
  { id: 14, text: "When I'm in prison, I'll have _ to keep me company.", pick: 1 },
  { id: 15, text: "What's my secret power?", pick: 1 },
  { id: 16, text: "What do old people smell like?", pick: 1 },
  { id: 17, text: "In his new summer blockbuster, Arnold Schwarzenegger is _.", pick: 1 },
  { id: 18, text: "Life for American Indians was forever changed when the White Man introduced them to _.", pick: 1 },
  { id: 19, text: "Instead of coal, Santa now gives the bad children _.", pick: 1 },
  { id: 20, text: "What's the most emo?", pick: 1 },
  { id: 21, text: "_ + _ = _.", pick: 2 },
  { id: 22, text: "Next on ESPN2, the World Series of _.", pick: 1 },
  { id: 23, text: "Step 1: _. Step 2: _. Step 3: Profit.", pick: 2 },
  { id: 24, text: "When I was tripping on acid, _ turned into _.", pick: 2 },
  { id: 25, text: "That's right, I killed _. How, you ask? _.", pick: 2 },
];

export const whiteCards: WhiteCard[] = [
  { id: 1, text: "Being on fire." },
  { id: 2, text: "Racism." },
  { id: 3, text: "Old-people smell." },
  { id: 4, text: "A micropenis." },
  { id: 5, text: "Women in yogurt commercials." },
  { id: 6, text: "Classist undertones." },
  { id: 7, text: "Not giving a shit about the Third World." },
  { id: 8, text: "Coat hanger abortions." },
  { id: 9, text: "The Rapture." },
  { id: 10, text: "Being a motherfucking sorcerer." },
  { id: 11, text: "A disappointing birthday party." },
  { id: 12, text: "Puppies!" },
  { id: 13, text: "A robust mongoloid." },
  { id: 14, text: "A windmill full of corpses." },
  { id: 15, text: "Two midgets shitting into a bucket." },
  { id: 16, text: "My soul." },
  { id: 17, text: "A bleached asshole." },
  { id: 18, text: "The placenta." },
  { id: 19, text: "Lady Gaga." },
  { id: 20, text: "A bag of magic beans." },
  { id: 21, text: "Dying." },
  { id: 22, text: "The American Dream." },
  { id: 23, text: "Emotions." },
  { id: 24, text: "Pooping back and forth. Forever." },
  { id: 25, text: "Nicolas Cage." },
  { id: 26, text: "Friends with benefits." },
  { id: 27, text: "Figgy pudding." },
  { id: 28, text: "A cooler full of organs." },
  { id: 29, text: "Scientology." },
  { id: 30, text: "Inappropriate yodeling." },
  { id: 31, text: "A falcon with a cap on its head." },
  { id: 32, text: "Viagra." },
  { id: 33, text: "Charisma." },
  { id: 34, text: "A tiny horse." },
  { id: 35, text: "Poor life choices." },
  { id: 36, text: "Passive-aggressive Post-it notes." },
  { id: 37, text: "Self-loathing." },
  { id: 38, text: "Getting really high." },
  { id: 39, text: "Daddy issues." },
  { id: 40, text: "A middle-aged man on roller blades." },
  { id: 41, text: "The Force." },
  { id: 42, text: "Object permanence." },
  { id: 43, text: "A mime having a stroke." },
  { id: 44, text: "Saxophone solos." },
  { id: 45, text: "Hot cheese." },
  { id: 46, text: "Pretending to care." },
  { id: 47, text: "A gassy antelope." },
  { id: 48, text: "A sassy black woman." },
  { id: 49, text: "The terrorists." },
  { id: 50, text: "A snapping turtle biting the tip of your penis." },
  { id: 51, text: "Explosions." },
  { id: 52, text: "Kanye West." },
  { id: 53, text: "An Oedipus complex." },
  { id: 54, text: "Alcoholism." },
  { id: 55, text: "My vagina." },
  { id: 56, text: "The miracle of childbirth." },
  { id: 57, text: "A really cool hat." },
  { id: 58, text: "Soup that is too hot." },
  { id: 59, text: "Grandma." },
  { id: 60, text: "Making a skin suit out of its victims." },
];

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
