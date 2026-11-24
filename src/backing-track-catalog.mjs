// SPDX-License-Identifier: MPL-2.0

// Static YouTube video IDs. See docs/backing-tracks.md for sources and selection criteria.
import { bassPracticeTracks } from './bass-practice-tracks.mjs';
import { guitarPracticeTracks } from './guitar-practice-tracks.mjs';
import { arpeggioPracticeTracks } from './arpeggio-practice-tracks.mjs';

const major = ['major', 'major-pentatonic', 'major-blues'];
const minor = ['natural-minor', 'minor-pentatonic', 'minor-blues'];
const dominantBlues = [
  'minor-pentatonic',
  'major-pentatonic',
  'minor-blues',
  'major-blues',
  'mixolydian',
];
const dorian = ['dorian', 'minor-pentatonic'];
const cliffSmith = 'Cliff Smith Backing Tracks';

// Each row contains the slow, medium and fast recordings on the indicated tonic.
function arrangements(titles, style, scales, bpms, rows) {
  return rows.flatMap((ids, root) =>
    ids.map((videoId, i) => ({
      videoId,
      root,
      title: titles[i],
      creator: cliffSmith,
      style,
      scales,
      bpm: bpms[i],
      instrument: 'guitar',
    })),
  );
}

// Fretmeup's original, key-specific lessons are listed chromatically from C to B.
function guitarModeSeries(title, scale, style, bpm, videoIds) {
  return videoIds.map((videoId, root) => ({
    videoId,
    root,
    title,
    creator: 'Fretmeup',
    style,
    scales: [scale],
    bpm,
    instrument: 'guitar',
  }));
}

export const backingCatalog = [
  ...guitarPracticeTracks,
  ...arpeggioPracticeTracks,
  ...guitarModeSeries('Country pop · tonic pedal', 'major', 'country', 140, [
    'V0d5sllC0eA',
    'bXtPV6jRaQo',
    '2j6sPNH1u1w',
    'vpxiCTJtfd4',
    'M72AtUR1P6Y',
    'BxwOgW-0oIw',
    'rLCh-dUuvss',
    '8qF80WRtsSY',
    'jeyKRmrhH1I',
    'e2MuqdAE_bQ',
    'sVVYTt7UewM',
    'X1SM5qgU7Aw',
  ]),
  ...guitarModeSeries('Dorian funk groove', 'dorian', 'funk', 110, [
    'SCo4c5KwgMc',
    'mqEVGl8ZclA',
    'EHJUqpVlzSw',
    'eBx4T-TWnCE',
    'xG5nscm3dcw',
    'Py8AtX40WuQ',
    'xxHzDU7PuHk',
    'TeL8xxX0OgY',
    'ft2W6LxeC-U',
    'L9qphoAE4Wc',
    'pE_-nvGaizQ',
    'VGh2qFth4dI',
  ]),
  ...guitarModeSeries('Phrygian ska groove', 'phrygian', 'reggae', 85, [
    'bXPNvLAI_30',
    'xdHGLzKuMTU',
    'Kg_1Av373Lo',
    'aPPk74zKJbM',
    'N7y3Zjs9Fa8',
    '2856s0qymq8',
    'EBMziLIC96M',
    '7_Xej3FGgpY',
    'w2-jQTF-ihg',
    'dm6tMWUGcEE',
    'rc6CeZl0ELg',
    'TlAcCGW3540',
  ]),
  ...guitarModeSeries('Lydian light rock', 'lydian', 'rock', 80, [
    'y09cxUO7aAo',
    'Y3gFoROpGxA',
    'FgvdMw3iuVg',
    '_lMoDiEdgEg',
    'DIWIBEktYAs',
    'prEDIi7sZU8',
    'evVdrBT2Dq8',
    'xpnjfY9c9kQ',
    'NWGZNvij-LA',
    'tSw0QOfDTow',
    'MbtD2xApLQE',
    'W8JCZ_jIbSs',
  ]),
  ...guitarModeSeries('Mixolydian pop rock', 'mixolydian', 'rock', 120, [
    'OywSOmcSzZk',
    'V74I6kIBqSE',
    'SEESKQhNTok',
    'mXG9ZqkE9ZQ',
    'YkTzbwmOlMA',
    'lL8_H19ZHnw',
    '78DyJgqMbAw',
    '9je0OL1OSDA',
    'MgpmAsFP5Ic',
    'rgT33tOHLK4',
    '0sXNO5O6t8c',
    'CkIUz-ZpYOw',
  ]),
  ...guitarModeSeries('Aeolian soul rock', 'natural-minor', 'rock', 120, [
    'oF1EtST2Q7M',
    '5C1zf4ctBEA',
    'iDAPmaF11UQ',
    'SK2CQERBZWs',
    'ubR8-sCBoiE',
    'Nbz_HPQNIv4',
    'PBmFdsUhCsA',
    'KwT2vUKziXY',
    'JCwqR6mKs5Y',
    '0DDbDsdbe1k',
    '29u-VPlKPS0',
    'sSZ9m-1Ovys',
  ]),
  ...guitarModeSeries('Locrian light rock', 'locrian', 'rock', 100, [
    'Fe972mzJWY8',
    'PHDiMam29FI',
    'RigswTJxgW0',
    'kK0iWDY2Ojo',
    'gR2SYqac-P8',
    'gAO7miEvv2I',
    'RbT20GK-gss',
    'U2Pa09G79oY',
    'QiDXl7ZrQmI',
    'u5QaDT7eLzM',
    'JPgSy2cH9P0',
    'Mz_rlT50L-k',
  ]),
  ...arrangements(
    ['Rock ballad · I–vi–ii–V', 'Pop rock · I–vi–ii–V', 'Shuffle · I–vi–ii–V'],
    'rock',
    major,
    [60, 120, 140],
    [
      ['cp9dIas-HyI', 'IasR4OfbsvA', 'PuuYMdjaDSY'], // C
      ['C6jDzw0DKfM', 'dl7GB7ch9jg', '0BQFQV4RFis'], // D♭
      ['UE13ne9IzqA', 'd4zJJ0OcGrg', 'NBxv2yXX4f4'], // D
      ['D8ioccRszwY', 'RQM6RZoP6Ig', 'hSJE3OKxwdA'], // E♭
      ['Lnyq86SoJUE', 'CxDVio5gqnM', 'W29W8ORkTKM'], // E
      ['K5dgsXujj64', 'TV6yDHvL5ZU', 'qrYKMOny5Y4'], // F
      ['6moEGuRs9SY', 'f8NrcqGgUQk', '7S2Slem8c9Q'], // F♯
      ['Lkgou_TJfjk', 'WorK3TX4vbQ', 'HChVqsoJxU0'], // G
      ['ke6-PNmi7IY', 'FvE4TwyU4bM', '0CWWE_PAJfo'], // A♭
      ['B8SmjkH_iyI', 'FVyiy-QAYD8', 'I1GYr774Vek'], // A
      ['-QhSnxuFx5U', 'gkXcJfqHSeU', 'egIBxVPdmXw'], // B♭
      ['AeT7zFy3sfo', 'GWOXO5xZGXM', 'TuudtM46io4'], // B
    ],
  ),
  ...arrangements(
    ['Swing quartet · ii–V–I', 'Piano trio · ii–V–I', 'Fast swing · ii–V–I'],
    'jazz',
    major,
    [60, 130, 240],
    [
      ['voXYhY4rcwQ', 'V-8W2gUPxYE', 'lX1NpfydgN8'], // C
      ['JhEwWshBEYg', 'NiL24Q8Q6q8', 'of-WKC71tDs'], // D♭
      ['Pk5k1-pq6sY', 'PA1f1sfPPWo', 'VrXP_WKDIlk'], // D
      ['MXOZhyOHuds', '0OLkZ38MSIk', 'gNsVSnFdDAk'], // E♭
      ['RmHGdTLwNb0', 'K8irLyZPPMg', 'zNIoOc3xuf8'], // E
      ['ZS_myHaAZH8', 'LgNZCuBx6rg', 'N23Zz3bfwQo'], // F
      ['GlJmVLYVz2s', '7gn-FBForQU', 'MV0cANKca7I'], // F♯
      ['LKg-VCu5px4', 'LQg-q0BR948', 'VZtec3d1Z0s'], // G
      ['GaIt7bh66NM', 'AchXXmC8BHo', 'LgjSoLd_mjA'], // A♭
      ['Em8Oy6O-7ZU', 'wLUVgJkTtTg', 'yHjUdlyx4Ak'], // A
      ['jBR6rTBZqUg', 'DoOjdFPzS2I', '4Gf-at5hKpI'], // B♭
      ['hZz9ElYg3aE', 'tj2It3Sfk1k', 'aFI0mYuxrDw'], // B
    ],
  ),
  ...arrangements(
    ['Organ trio · minor blues', 'Guitar trio · minor blues', 'Texas minor blues'],
    'blues',
    [...minor, 'harmonic-minor'],
    [60, 120, 180],
    [
      ['P4by6S6mcBI', 'kauL_kmRRZ8', 'b5YOEQVUcFY'], // C
      ['80DTxMTxJkE', 'UcD4gqfg0ro', '281Yx43ySzk'], // D♭
      ['YMNgdUnZJ5g', 'I9LBlyoT_kk', 'HzTwHXptr98'], // D
      ['082wrF4WQy8', 'wbg9VOz3oB8', 'yzw-zTJnYtc'], // E♭
      ['ZuG6WPIAm5U', 'CcwvcenGzVU', 'l9NGDDgWf_o'], // E
      ['OrfctpEMsWc', 'OlLIxZ4UDws', 'ZM8PeS7d4hM'], // F
      ['tuHoCVmZMgY', 'r4B8FTp0qr8', '_UgxbhuOZm4'], // F♯
      ['56AwNayFQj4', '9wZ9bs4ibQo', 'y6RDCxXVX9E'], // G
      ['dQMOPRprt34', 'T7Pli4f9d04', 'ipLJF2-m11Q'], // A♭
      ['1UYjjVPhQ58', 'xSPqzDRcvjc', '5F4Nn32AwMI'], // A
      ['8Po6oCdM4MA', '7kBdcTGoM-Y', 'qoDgwpBG-tE'], // B♭
      ['CEBnRzvVeTw', 'ihDV3Ki-Zpk', '7E3MueecCWo'], // B
    ],
  ),
  ...arrangements(
    ['Organ trio · 12-bar blues', 'Guitar trio · 12-bar blues', 'Texas 12-bar blues'],
    'blues',
    [...dominantBlues, 'dorian'],
    [60, 120, 180],
    [
      ['wpg5aQ8jnV0', '7OEcvWw7d4M', 'VZ8-pQ0ZxzA'], // C
      ['chQLgWVNvCg', 'lE9P5YK_-tk', 'ThH8ExgKP-0'], // D♭
      ['PHDRWFSJ6Vw', 'mhN5Dsc9d2Y', 'kOUGmsCByug'], // D
      ['5HJZObTrByU', 'IMbD68BMb60', 'le4ihlLiNkE'], // E♭
      ['JBFMvizGDiI', '6zsQkFfZAlo', 'xeEbvhiJMcE'], // E
      ['PXSqSZYh-0U', 'wD8W62-Kddc', '4VrGGHkO-PI'], // F
      ['2kCyeH48yRs', 'sUAOkQ568U0', 'sQwqiryIHr0'], // F♯
      ['utYggSK_vps', 'OJJ6C4jA7F0', 'bDMmdHDgVY0'], // G
      ['mRPe54tV5ns', 'NYXDcvs5wfw', 'F4vUMOQR7PQ'], // A♭
      ['sQGcIWF29t4', 'RISDymCUzSQ', '8HjFLEkdsk0'], // A
      ['cGoKUFdeyG4', 'GpTr1lfG0WY', 'Ci7-7O6YITE'], // B♭
      ['ZZtviqNMysI', 'D24OOUYe7Io', '0gRfUNCYyls'], // B
    ],
  ),
  ...[
    {
      videoId: 'Wp7I6w-Y8IQ',
      root: 5,
      title: 'Pop rock · I–IV–vi–V',
      creator: 'TGuitar',
      style: 'rock',
      scales: ['major', 'major-pentatonic'],
      bpm: 95,
    },
    {
      videoId: '5J2PYeJqF5o',
      root: 2,
      title: 'D Dorian Groove Jam',
      creator: 'Quist',
      style: 'funk',
      scales: dorian,
      bpm: 90,
    },
    {
      videoId: 'rOsD47AHFjc',
      root: 9,
      title: 'A Dorian Funk',
      creator: 'Etienne de Loriol - Guitar Lessons',
      style: 'funk',
      scales: dorian,
      bpm: 100,
    },
    {
      videoId: '9AwuUDmZr2Q',
      root: 9,
      title: 'A Minor Rock Ballad',
      creator: 'Reedz Jam Tracks',
      style: 'rock',
      scales: minor,
      bpm: 80,
    },
    {
      videoId: 'dP3dI21x3nc',
      root: 9,
      title: 'A Minor Heavy Metal',
      creator: 'PainInTheAxe',
      style: 'metal',
      scales: minor,
      bpm: 150,
    },
    {
      videoId: 'iO7nx5Dg0kE',
      root: 4,
      title: 'Metal Guitar in E Minor',
      creator: 'Sweet Jam Tracks',
      style: 'metal',
      scales: minor,
      bpm: 120,
    },
    {
      videoId: 'tiAXSae0Deo',
      root: 2,
      title: 'Epic Guitar Jam in D Dorian',
      creator: 'Quist',
      style: 'modal',
      scales: ['dorian'],
      bpm: 87,
    },
    ...[
      ['F1l5m9H6nN4', 0, 'C Lydian Blues Jam', 'lydian'],
      ['0Y7O6MTSZXA', 4, 'E Phrygian Blues Jam', 'phrygian'],
      ['5mQ3MQqvUWg', 4, 'Slow E Mixolydian Blues Shuffle', 'mixolydian'],
      ['tJ_0r7BQYpQ', 7, 'Slow G Mixolydian Blues Shuffle', 'mixolydian'],
      ['AuqbNouPH7c', 9, 'Slow A Mixolydian Blues Shuffle', 'mixolydian'],
    ].map(([videoId, root, title, scale]) => ({
      videoId,
      root,
      title,
      creator: 'Quist',
      style: 'blues',
      scales: [scale],
      bpm: 65,
    })),
    // Individual recordings from Quist's Groovin' Through the Harmonic Minor Modes.
    ...[
      ['BkNNQ_myKeY', 9, 'Harmonic Minor Groove in A', 'harmonic-minor'],
      ['ashle6gOMvo', 11, 'Locrian Natural 6 Groove in B', 'locrian-natural-6'],
      ['1en3IUYkLF4', 0, 'Ionian Augmented Groove in C', 'ionian-augmented'],
      ['-pU4vUONHU8', 2, 'Dorian Sharp 4 Groove in D', 'dorian-sharp-4'],
      ['V1e3dIVGd_Y', 4, 'Phrygian Dominant Groove in E', 'phrygian-dominant'],
      ['XYAAejBWwlU', 5, 'Lydian Sharp 2 Groove in F', 'lydian-sharp-2'],
      ['ufif3rob_Vo', 8, 'Ultralocrian Groove in G♯', 'ultralocrian'],
    ].map(([videoId, root, title, scale]) => ({
      videoId,
      root,
      title,
      creator: 'Quist',
      style: 'modal',
      scales: [scale],
      bpm: 112,
    })),
    {
      videoId: 'G-UTSDZKchQ',
      root: 9,
      title: 'Melodic Minor Groove in A',
      creator: 'Quist',
      style: 'modal',
      scales: ['melodic-minor'],
      bpm: 112,
    },
    {
      videoId: 'yZKZlkXbvAI',
      root: 7,
      title: 'Whole Tone Groove in G',
      creator: 'Quist',
      style: 'modal',
      scales: ['whole-tone'],
    },
  ].map((track) => ({ ...track, instrument: 'guitar' })),
  ...[
    {
      videoId: '0t0TbDVx-dA',
      root: 9,
      title: 'Slow Blues in A Minor',
      creator: 'Quist',
      style: 'blues',
      scales: minor,
      bpm: 46,
    },
    {
      videoId: '1wVuruSiudI',
      root: 4,
      title: 'Slow Blues in E Minor',
      creator: 'Quist',
      style: 'blues',
      scales: minor,
      bpm: 55,
    },
    {
      videoId: '8nd45Ntv8E0',
      root: 9,
      title: 'Slow 12-Bar Blues in A',
      creator: 'Backing tracks with Band in a Box',
      style: 'blues',
      scales: dominantBlues,
      bpm: 65,
    },
    {
      videoId: 'q6CRE-BZjtU',
      root: 4,
      title: 'Funky Blues Jam in E',
      creator: 'Music Jam Tracks',
      style: 'blues',
      scales: dominantBlues,
      bpm: 120,
    },
    {
      videoId: 'OAFg0rWCBhM',
      root: 0,
      title: 'Slow Jazz · ii–V–I',
      creator: 'Backing Track Center',
      style: 'jazz',
      scales: major,
      bpm: 90,
    },
    {
      videoId: 'N-abHiOziaw',
      root: 2,
      title: 'Funky Fresh Groove',
      creator: 'Backing Tracks Channel',
      style: 'funk',
      scales: dorian,
    },
    {
      videoId: 'rk5m8eZgX0M',
      root: 9,
      title: 'Groovy Energetic Funk',
      creator: 'Pyramidal Backing Tracks',
      style: 'funk',
      scales: dorian,
      bpm: 90,
    },
    {
      videoId: '0hvCy_zQ-X4',
      root: 9,
      title: 'Funk in A Minor',
      creator: 'JunzBass 𝄢 Backing Tracks',
      style: 'funk',
      scales: minor,
      bpm: 90,
    },
    {
      videoId: 'BKC4EETIGCk',
      root: 2,
      title: 'Funk Disco in D Major',
      creator: 'Youjam - Bass',
      style: 'funk',
      scales: major,
    },
    {
      videoId: 'r2qTXyBLfmU',
      root: 4,
      title: 'E Minor · Black Sabbath Style',
      creator: 'Tomas Sandanus',
      style: 'metal',
      scales: minor,
      bpm: 180,
    },
    ...[
      ['z6yPjuNJWhI', 0, 'C Ionian', major],
      ['z75ZVfpPaZk', 2, 'D Dorian', dorian, 120],
      ['zMeeUxQQro4', 4, 'E Phrygian', ['phrygian'], 130],
      ['4pIV09zO_6g', 5, 'F Lydian', ['lydian'], 125],
      ['9Jlkfpz9Ay4', 7, 'G Mixolydian', ['mixolydian'], 100],
      ['wZ_AMOSPBBI', 9, 'A Aeolian', minor],
      ['KkNTdptf2AY', 11, 'B Locrian', ['locrian'], 100],
    ].map(([videoId, root, title, scales, bpm]) => ({
      videoId,
      root,
      title,
      scales,
      bpm,
      style: 'modal',
      creator: 'Youjam - Bass',
    })),
    // JAZZ LICK DAILY's single-key ii–V–I swing play-alongs, in chromatic order.
    ...[
      '2Jm3N73beAw',
      'LJelB3Kx-YE',
      'n7IASZRIhzU',
      'T1q75nriKPk',
      'qEGTSbVRIwI',
      'y6qh2FqmnjM',
      'FGZDNUA_gxA',
      '5ppM67X21bY',
      'p213ld-p--8',
      'dbXlHGyGQTs',
      'TqS-SDRJAAY',
      'iLahr2tdz5M',
    ].map((videoId, root) => ({
      videoId,
      root,
      title: 'Bassless swing · ii–V–I',
      creator: 'JAZZ LICK DAILY Backing Tracks',
      style: 'jazz',
      bpm: 120,
      scales: ['major', 'major-pentatonic'],
    })),
    ...[
      ['-r0PTM0KbO4', 5, 'Poppy Funky Rock', 85],
      ['IvaH0wbc6fU', 7, 'Slow Emotional Rock Ballad', 75],
      ['qvo3OaB7LZI', 4, 'Acoustic Clean Rock', 68],
    ].map(([videoId, root, title, bpm]) => ({
      videoId,
      root,
      title,
      bpm,
      creator: 'Tomas Sandanus',
      style: 'rock',
      scales: ['major', 'major-pentatonic'],
    })),
  ].map((track) => ({ ...track, instrument: 'bass' })),
  ...[
    '5JajetqtMJE',
    'mVLwGl7avYM',
    'W5mWGaIcnbE',
    'Lown2ARlgXw',
    'kMA9Nlfx050',
    'v6_-GWEmu9w',
    'EY0h-i5me5Q',
    '8GIffu2fp8U',
    'VS7hw114mAY',
    'ZYEGA25sHic',
    'lYslhzAA37s',
    'FemKiAGXAT8',
  ].map((videoId, root) => ({
    videoId,
    root,
    title: 'Minor blues',
    creator: 'The Guitar Garden',
    style: 'blues',
    scales: minor,
    instrument: 'bass',
  })),
  ...bassPracticeTracks,
];

// BoneZone Studio reference pitches, in chromatic order from C to B.
export const rootDrones = [
  'KvUzRnbyT2w',
  'utyKY-WhfLU',
  '0X4CN39EdwY',
  'EIWMklVB1TU',
  'aId0Cy_bNCo',
  '9dCXpZ_KqV8',
  'ZPFAuGlugTk',
  'WsRN5Euar2Q',
  '8c56yOf0Icc',
  'JvrJEVECzYk',
  'Acjs0U6N3M0',
  'Fqa9_54XUog',
];
