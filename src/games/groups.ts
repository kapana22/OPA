export interface GameGroupMode {
  id: string;
  title: string;
}

export interface GameGroup {
  id: string;
  modes: GameGroupMode[];
}

export const groupedGames: GameGroup[] = [
  {
    id: 'tableread',
    modes: [
      { id: 'majority', title: 'Herd Mentality' },
      { id: 'line', title: "Where’s the Line?" },
      { id: 'person', title: 'Rate Them' },
    ],
  },
];
