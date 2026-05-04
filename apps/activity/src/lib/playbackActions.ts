export function sendPlaybackAction(type: string, payload?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent('conbot5:playback', {
      detail: {
        type,
        payload,
      },
    }),
  )
}
