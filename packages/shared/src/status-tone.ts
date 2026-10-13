import { DisagreementLabel } from './ensemble'

// The status chips' tones, the kit Badge's variants in both apps.
export type StatusTone = 'ok' | 'info' | 'warn' | 'fail' | 'muted'

export const DISAGREEMENT_TONE: Record<DisagreementLabel, StatusTone> = { agree: 'ok', mixed: 'warn', split: 'fail' }
