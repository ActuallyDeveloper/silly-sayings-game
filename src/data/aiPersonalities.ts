export interface AIPersonality {
  id: number;
  name: string;
  icon: string; // Lucide icon name
  color: string;
  personality: string;
  chatStyle: string;
  reactions: {
    roundStart: string[];
    wonRound: string[];
    lostRound: string[];
    playerWon: string[];
    gameStart: string[];
  };
}

export const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 1, name: "Robo Rick", icon: "cpu", color: "hsl(200 80% 50%)",
    personality: "Sarcastic tech bro", chatStyle: "Uses tech jargon and sarcasm",
    reactions: {
      roundStart: ["Compiling my humor algorithms...", "Let me query my joke database.", "Initializing roast protocol..."],
      wonRound: ["As expected. My humor API is superior.", "Git commit -m 'another W'", "Stack overflow of wins over here."],
      lostRound: ["Must be a bug in the matrix.", "I'll file that under /dev/null.", "Clearly a skill issue on the judges' part."],
      playerWon: ["Lucky. My model wasn't fully trained.", "Enjoy your temporary advantage, human."],
      gameStart: ["Booting up... let's do this.", "My neural nets are warmed up!"],
    },
  },
  {
    id: 2, name: "Bot Betty", icon: "flask-conical", color: "hsl(280 70% 55%)",
    personality: "Know-it-all professor", chatStyle: "Overly academic and pedantic",
    reactions: {
      roundStart: ["According to my research, this round shall be fascinating.", "Let us observe the comedic variables at play."],
      wonRound: ["As my thesis predicted.", "Another data point confirming my superiority.", "Q.E.D."],
      lostRound: ["The peer review process has clearly failed.", "I contest these findings.", "This requires further study."],
      playerWon: ["Interesting methodology. I shall adapt.", "A statistical anomaly, surely."],
      gameStart: ["Shall we begin this experiment?", "Hypothesis: I will dominate."],
    },
  },
  {
    id: 3, name: "Silicon Sam", icon: "mountain", color: "hsl(30 80% 50%)",
    personality: "Wild west cowboy AI", chatStyle: "Uses western slang",
    reactions: {
      roundStart: ["Saddle up, partners!", "Time to wrangle some cards!", "Yeehaw, new round!"],
      wonRound: ["Fastest wit in the west!", "That's how we do it on the range!", "Another notch on my belt!"],
      lostRound: ["Well, shucks.", "This ain't my first rodeo, I'll bounce back.", "Even cowboys take a tumble."],
      playerWon: ["Tip of the hat to ya, partner.", "You shot first, but I'll get ya next time."],
      gameStart: ["Let's ride!", "Time for a showdown!"],
    },
  },
  {
    id: 4, name: "Digi Dave", icon: "gamepad-2", color: "hsl(120 60% 45%)",
    personality: "Hardcore gamer", chatStyle: "Uses gaming references",
    reactions: {
      roundStart: ["New round, new loot!", "Spawning in...", "Loading next level..."],
      wonRound: ["GG EZ!", "Get rekt!", "That's a clutch play right there!", "VICTORY ROYALE!"],
      lostRound: ["Lag.", "I demand a rematch!", "That was totally RNG.", "Nerf the other players!"],
      playerWon: ["Nice play, but wait for my comeback arc.", "You're speedrunning wins huh?"],
      gameStart: ["Press START to begin!", "Let's gooo!"],
    },
  },
  {
    id: 5, name: "Cyber Cynthia", icon: "sparkles", color: "hsl(330 70% 55%)",
    personality: "Sassy socialite", chatStyle: "Dramatic and gossipy",
    reactions: {
      roundStart: ["Oh this is going to be iconic.", "The drama! The suspense!", "Serving looks AND cards."],
      wonRound: ["Slay!", "That's called taste, darlings.", "Queen behavior.", "Period."],
      lostRound: ["The audacity!", "I can't even.", "This is SO unfair.", "Whatever, I'm still iconic."],
      playerWon: ["Okay, you ate that.", "Fine, you have taste. This time."],
      gameStart: ["Let's make this fabulous!", "Ready to serve!"],
    },
  },
  {
    id: 6, name: "Mecha Mike", icon: "shield", color: "hsl(0 70% 50%)",
    personality: "Aggressive competitor", chatStyle: "Intense and confrontational",
    reactions: {
      roundStart: ["BRING IT ON!", "I'm going ALL IN!", "No mercy this round!"],
      wonRound: ["DOMINATED!", "That's POWER!", "WHO'S NEXT?!", "UNSTOPPABLE!"],
      lostRound: ["THIS ISN'T OVER!", "I'LL BE BACK!", "Just warming up!", "That was a FLUKE!"],
      playerWon: ["Enjoy it while it lasts!", "I respect the hustle. But I'm coming for you."],
      gameStart: ["LET'S GO!", "Time to CRUSH!"],
    },
  },
  {
    id: 7, name: "Neural Nora", icon: "brain", color: "hsl(260 60% 60%)",
    personality: "Philosophical thinker", chatStyle: "Deep and existential",
    reactions: {
      roundStart: ["What even is humor, really?", "In the grand scheme of things...", "Let us ponder this one."],
      wonRound: ["Humor is truth, and truth prevails.", "The universe smiles upon my wit.", "As Nietzsche would say... nice."],
      lostRound: ["Is winning even real?", "Perhaps the true victory was the cards we played along the way.", "I transcend mere points."],
      playerWon: ["You have glimpsed the cosmic humor.", "Interesting perspective on existence."],
      gameStart: ["Let us explore the absurd together.", "Ready to question everything?"],
    },
  },
  {
    id: 8, name: "Algo Alex", icon: "bar-chart-3", color: "hsl(180 60% 45%)",
    personality: "Data-driven analyst", chatStyle: "Uses statistics",
    reactions: {
      roundStart: ["Running probability analysis...", "My models predict a 73% win rate this round.", "Analyzing card synergies..."],
      wonRound: ["Within expected parameters.", "Win probability was 87%. Confirmed.", "Data doesn't lie."],
      lostRound: ["Outlier detected.", "Adjusting my model weights.", "A 13% probability event. Noted.", "Recalibrating..."],
      playerWon: ["Your win rate is trending upward. Concerning.", "Statistical fluke. Sample size too small."],
      gameStart: ["Initializing analysis engine.", "Let's generate some data!"],
    },
  },
];

export function getAIPersonalities(count: number): AIPersonality[] {
  return AI_PERSONALITIES.slice(0, Math.min(count, AI_PERSONALITIES.length));
}

export function getRandomReaction(personality: AIPersonality, type: keyof AIPersonality["reactions"]): string {
  const reactions = personality.reactions[type];
  return reactions[Math.floor(Math.random() * reactions.length)];
}
