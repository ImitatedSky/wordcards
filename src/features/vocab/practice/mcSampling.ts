export const MC_FALLBACKS = ['—', '(無答案)', '以上皆非', '不知道']

export type McSample = {
  options: string[]
  correctIndex: number
}

export function sampleDistractors(
  correct: string,
  otherBacks: string[],
  random: () => number = Math.random,
): McSample {
  const uniqueDistractors = Array.from(new Set(otherBacks.filter((b) => b !== correct)))
  const picked: string[] = []

  const shuffled = [...uniqueDistractors]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  picked.push(...shuffled.slice(0, 3))

  for (const f of MC_FALLBACKS) {
    if (picked.length >= 3) break
    if (f !== correct && !picked.includes(f)) picked.push(f)
  }

  const options = [correct, ...picked.slice(0, 3)]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }

  return { options, correctIndex: options.indexOf(correct) }
}
