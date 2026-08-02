/** Browser text-to-speech for word pronunciation (Web Speech API). */

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Speak an English word/phrase. Returns false when TTS is unavailable. */
export function speakWord(text: string, lang = 'en-US'): boolean {
  if (!canSpeak() || !text.trim()) return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  window.speechSynthesis.cancel() // stop any previous word first
  window.speechSynthesis.speak(utterance)
  return true
}
