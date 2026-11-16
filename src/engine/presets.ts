import { CellType, FieldPreset } from '../types/field';

const CHAR_MAP: Record<string, CellType> = {
  '.': 'SAFE',
  'P': 'POTATO_ROW',
  'C': 'PROTECTED',
  '#': 'OBSTACLE',
  '?': 'UNKNOWN_OBSTACLE',
  'S': 'START',
  'G': 'GOAL',
};

function parseMap(rows: string[]): CellType[][] {
  return rows.map((row) =>
    row.split('').map((ch) => CHAR_MAP[ch] ?? 'SAFE')
  );
}

export const FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'furrow-lanes',
    name: '01. Farm Tracks (Balanced)',
    subtitle: 'Potato rows, a delicate seedling patch in the middle, and 2 surprise rocks.',
    grid: parseMap([
      'S..P......P....P',
      '.#.P.PPPP.P.PP.P',
      '...P......P....P',
      '.PP..CCCC..#PP..',
      '.....CCCC..?....',
      '.PPP.CCCC.PPPP..',
      '.....#..........',
      '.PPP?.PPP..PPP..',
      '.....P...P...P..',
      '.P...P.#.P...P.#',
      '.P.PPP...PPP.P..',
      '.......#....?..G',
    ]),
  },
  {
    id: 'protected-nursery',
    name: '02. Seedling Nursery',
    subtitle: 'Great for Task 4: shows how Crop-Safe A* gives delicate seedlings extra space.',
    grid: parseMap([
      'S.........P....P',
      '.PPPP.PPP.P.PP.P',
      '......P........P',
      '..CCC.P.CCCCCC..',
      '..CCC...CCCCCC..',
      '..CCC.#.......?.',
      '......PPPP.PPP..',
      '.PPPP...........',
      '......CCC.#.PP..',
      '.PPP..CCC.......',
      '......CCC..PPP..',
      '...............G',
    ]),
  },
  {
    id: 'ambush-ridge',
    name: '03. Surprise Rock Maze',
    subtitle: 'Great for Task 5: several hidden rocks force the robot to rethink its path mid-trip.',
    grid: parseMap([
      'S...P.......P..P',
      '.PP.P.PPPPP.P..P',
      '....?.P.....?... ',
      '.####.P.CCC.PPP.',
      '......?.CCC.....',
      '.PPPP...CCC.PPP.',
      '......#.........',
      '.PPP.PPPP.PPP.#.',
      '..........?.....',
      '.PP.CCCC..PPPP..',
      '....CCCC........',
      '.............#.G',
    ].map((r) => r.slice(0, 16))),
  },
];

export function cloneGrid(grid: CellType[][]): CellType[][] {
  return grid.map((row) => [...row]);
}
