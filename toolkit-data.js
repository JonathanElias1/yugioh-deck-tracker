// Toolkit Pool - Generic Staples Shared Across All Decks
// Pick 6-10 cards before each match

const toolkitPool = {
  tooPowerful: [
    { name: "Dark Hole", quantity: 8, limit: 1 },
    { name: "Raigeki", quantity: 5, limit: 1 },
    { name: "Lightning Vortex", quantity: 5, limit: 1 },
    { name: "Lightning Storm", quantity: 3, limit: 1 },
    { name: "Heavy Storm", quantity: 12, limit: 1 },
    { name: "Mirror Force", quantity: 1, limit: 1 },
    { name: "Torrential Tribute", quantity: 6, limit: 1 },
    { name: "Snatch Steal", quantity: 8, limit: 1 },
    { name: "Change of Heart", quantity: 9, limit: 1 },
    { name: "Pot of Greed", quantity: 7, limit: 1 },
    { name: "Graceful Charity", quantity: 2, limit: 1 },
    { name: "Monster Reborn", quantity: 7, limit: 1 },
    { name: "Premature Burial", quantity: 7, limit: 1 },
    { name: "Brain Control", quantity: 4, limit: 1 },
    { name: "Card Destruction", quantity: 6, limit: 1 },
    { name: "Giant Trunade", quantity: 6, limit: 1 },
    { name: "Painful Choice", quantity: 1, limit: 1 }
  ],
  standard: [
    { name: "Mystical Space Typhoon", quantity: 14 },
    { name: "Dust Tornado", quantity: 11 },
    { name: "Stamping Destruction", quantity: 8 },
    { name: "De-Spell", quantity: 6 },
    { name: "Fissure", quantity: 9 },
    { name: "Compulsory Evacuation Device", quantity: 12 },
    { name: "Nobleman of Crossout", quantity: 9 },
    { name: "Sakuretsu Armor", quantity: 4 },
    { name: "Trap Hole", quantity: 7 },
    { name: "Bottomless Trap Hole", quantity: 3 },
    { name: "Soul Exchange", quantity: 4 },
    { name: "Creature Swap", quantity: 8 },
    { name: "Enemy Controller", quantity: 3 },
    { name: "Scapegoat", quantity: 3 },
    { name: "Call of the Haunted", quantity: 10 },
    { name: "Soul Charge", quantity: 2 },
    { name: "Reload", quantity: 15 },
    { name: "Jar of Greed", quantity: 4 },
    { name: "Reckless Greed", quantity: 7 },
    { name: "Magical Mallet", quantity: 4 },
    { name: "Solemn Judgment", quantity: 0 },
    { name: "Seven Tools of the Bandit", quantity: 2 },
    { name: "Magic Jammer", quantity: 8 },
    { name: "Magic Drain", quantity: 4 },
    { name: "Spell Shield Type-8", quantity: 3 },
    { name: "Divine Wrath", quantity: 2 },
    { name: "Skill Drain", quantity: 1 },
    { name: "Mind Crush", quantity: 2 },
    { name: "Trap Dustshoot", quantity: 3 },
    { name: "Black Horn of Heaven", quantity: 1 },
    { name: "Ash Blossom & Joyous Spring", quantity: 3 },
    { name: "Effect Veiler", quantity: 3 },
    { name: "Infinite Impermanence", quantity: 2 },
    { name: "Ghost Belle & Haunted Mansion", quantity: 4 },
    { name: "Magic Cylinder", quantity: 3 },
    { name: "Mirror Wall", quantity: 1 },
    { name: "Threatening Roar", quantity: 2 },
    { name: "Waboku", quantity: 7 },
    { name: "Foolish Burial", quantity: 3 }
  ]
};

// Make available globally
window.toolkitPool = toolkitPool;
