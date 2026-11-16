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
    name: '01. Furrow Lanes',
    subtitle: 'Balanced potato rows, central protected nursery, and hidden ambush boulders.',
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
    name: '02. Protected Nursery',
    subtitle: 'Tests Task 4: standard shortest route hugs seedling beds while Crop-Safe A* detours cleanly.',
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
    name: '03. Ambush Ridge',
    subtitle: 'Tests Task 5: multiple hidden obstacles trigger sequential online A* replans.',
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
