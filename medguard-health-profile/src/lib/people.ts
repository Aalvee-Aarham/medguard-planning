/** One colour pair per person (by their index in the profile list), shared by Family and Upload */
export const HUES = [
  ['#1D5FBF', '#174c99'],
  ['#0e9384', '#067647'],
  ['#7a5af8', '#5925dc'],
  ['#dd2590', '#9e165f'],
  ['#ef6820', '#b93815'],
  ['#2e90fa', '#175cd3'],
  ['#15b79e', '#107569'],
  ['#ee46bc', '#c11574'],
]
export const hue = (i: number) => HUES[((i % HUES.length) + HUES.length) % HUES.length]
export const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('')
