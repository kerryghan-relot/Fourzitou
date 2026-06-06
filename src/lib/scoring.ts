export type ScoreEntry = {
  userId: string;
  stars: number;
  crown: boolean;
  poop: boolean;
};

export type AggregatedScore = {
  averageStars: number;
  crownCount: number;
  poopCount: number;
  voterCount: number;
};

export function aggregateScores(scores: ScoreEntry[]): AggregatedScore {
  if (scores.length === 0) {
    return { averageStars: 0, crownCount: 0, poopCount: 0, voterCount: 0 };
  }

  const votersWithStars = scores.filter((s) => s.stars > 0);
  const averageStars =
    votersWithStars.length > 0
      ? votersWithStars.reduce((sum, s) => sum + s.stars, 0) / votersWithStars.length
      : 0;

  return {
    averageStars: Math.round(averageStars * 10) / 10,
    crownCount: scores.filter((s) => s.crown).length,
    poopCount: scores.filter((s) => s.poop).length,
    voterCount: votersWithStars.length,
  };
}

export function validateStars(stars: number): boolean {
  return Number.isInteger(stars) && stars >= 0 && stars <= 5;
}

export function getCrownItemIdForUser(
  scores: Array<{ itemId: string; userId: string; crown: boolean }>,
  userId: string
): string | null {
  return scores.find((s) => s.userId === userId && s.crown)?.itemId ?? null;
}
