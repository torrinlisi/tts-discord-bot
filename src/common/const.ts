export const voices = {
  Albertinand: {
    id: "Yo20RdqMMwUUnwNTV5FD",
    stability: ".5",
    style: ".5",
    speed: "1",
    similarity: ".8",
    volume: 0.4,
  },
  "Ka-Reetz": {
    id: "Tc9ZKGNwOzWdsa2m6q3M",
    stability: ".4",
    style: ".5",
    speed: ".8",
    similarity: ".9",
    volume: 1,
  },
};

export enum VOICES {
  ALBERTINAND = "Albertinand",
  KAREETZ = "Ka-Reetz",
}

// probably could do it better but it's good enough for now
export const reverseLookup: Record<string, VOICES> = {
  Yo20RdqMMwUUnwNTV5FD: VOICES.ALBERTINAND,
  Tc9ZKGNwOzWdsa2m6q3M: VOICES.KAREETZ,
};
