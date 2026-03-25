import { useState, useRef, useCallback } from 'react'

export const useSpeech = (onTranscript: (text: string) => void) => {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback(() => {
    if (!supported) return
    const SR = (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [supported, onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    listening ? stop() : start()
  }, [listening, start, stop])

  return { listening, toggle, supported }
}
