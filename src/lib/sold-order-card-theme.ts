export const soldOrderCardTheme = {
  inProgress: {
    background: "#dce3f0",
    foreground: "#141820",
    muted: "#3d4a5c",
    border: "#b8c4d8",
    soldDate: "#4a5568",
    statusBorder: "#a8b4c8",
    statusHeading: "#4a5568",
  },
  complete: {
    background: "#0a0a0a",
    foreground: "#f3efe6",
    muted: "#b8b0a4",
    border: "#2a261f",
    complete: "#6b8f71",
  },
  stepDone: "#6b8f71",
  stepPending: "#e8940a",
} as const;

export function soldOrderCardIsDark(input: { shipped: boolean }) {
  return input.shipped;
}
