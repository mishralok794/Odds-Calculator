export interface StrategySample {
  id: string;
  name: string;
  description: string;
  outcomes: number[];
}

// Twenty deterministic 120-ball sequences with different scoring profiles.
const profiles = [
  ['Balanced innings', 'Mix of dots, singles, boundaries and occasional sixes', [30, 32, 12, 3, 15, 1, 7]],
  ['Low-scoring innings', 'More dot balls and singles, fewer boundaries', [42, 34, 12, 2, 8, 0, 2]],
  ['Boundary-heavy innings', 'Frequent fours and sixes', [20, 23, 10, 2, 25, 1, 19]],
  ['Singles rotation', 'Mostly singles with a steady scoring pattern', [24, 48, 15, 3, 8, 0, 2]],
  ['Powerplay burst', 'High boundary frequency', [25, 25, 10, 2, 22, 1, 15]],
  ['Slow middle overs', 'A dot-ball-heavy middle phase profile', [40, 35, 12, 2, 8, 0, 3]],
  ['Late acceleration', 'Sequence builds toward more boundaries later', [28, 30, 13, 3, 16, 1, 9]],
  ['Six-hitting display', 'More sixes than the balanced sample', [25, 24, 11, 2, 18, 1, 19]],
  ['Four-rich innings', 'Frequent fours and fewer sixes', [25, 29, 12, 2, 24, 1, 7]],
  ['Dot-ball pressure', 'Longer stretches of scoreless balls', [48, 28, 10, 2, 9, 0, 3]],
  ['Steady chase', 'Stable mix suited to a controlled chase', [27, 38, 16, 3, 11, 1, 4]],
  ['Unpredictable scoring', 'Wide variation between dots and boundaries', [34, 27, 12, 3, 15, 1, 8]],
  ['Opening overs', 'A brisk start with regular boundaries', [26, 30, 13, 3, 19, 1, 8]],
  ['Defensive innings', 'Conservative scoring with many dots', [46, 33, 12, 2, 6, 0, 1]],
  ['Aggressive innings', 'High-risk, high-boundary scoring profile', [21, 22, 11, 3, 22, 1, 20]],
  ['Mixed-format sample', 'Balanced distribution with varied streaks', [32, 30, 13, 3, 14, 1, 7]],
  ['Boundary drought', 'Mostly singles and twos with few boundaries', [32, 38, 18, 4, 6, 0, 2]],
  ['Sixes at the finish', 'Six-heavy scoring profile throughout the sample', [26, 27, 12, 2, 15, 1, 17]],
  ['Dot and boundary mix', 'Alternating low and high scoring events', [38, 24, 9, 2, 18, 1, 8]],
  ['Even scoring', 'Relatively even spread of run outcomes', [25, 24, 14, 6, 14, 5, 16]],
] as const;

function seededSequence(seed: number, weights: readonly number[]): number[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return Array.from({ length: 120 }, () => {
    const roll = next() * total;
    let cumulative = 0;
    for (let run = 0; run < weights.length; run += 1) {
      cumulative += weights[run];
      if (roll < cumulative) return run;
    }
    return 6;
  });
}

export const STRATEGY_SAMPLES: StrategySample[] = profiles.map(([name, description, weights], index) => ({
  id: `sample-${index + 1}`,
  name,
  description,
  outcomes: seededSequence(20261119 + index * 7919, weights),
}));
