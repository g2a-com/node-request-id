import { randomBytes } from 'crypto'

const MAX_ID_LENGTH = 1024
const NODE_LENGTH = 8
const ROOT_ID_LENGTH = 36
const HIERARCHICAL_REQUEST_ID_REGEXP = /^\|([0-9a-zA-Z/+=-]+\.)([0-9a-zA-Z/+=-]+(_[0-9a-zA-Z/+=-]+)?\.)*([0-9a-zA-Z/+=-]+[_#])?$/
const SEGMENT_BYTES = NODE_LENGTH / 4 * 3

export function isValid (id: string): boolean {
  if (id.length > MAX_ID_LENGTH) {
    // ID is too long
    return false
  }

  if (!id.match(HIERARCHICAL_REQUEST_ID_REGEXP)) {
    // ID is in invalid format
    return false
  }

  if (id.replace(/^(\|.*?\.).*$/, '$1').length > (MAX_ID_LENGTH - NODE_LENGTH - 1)) {
    // ID is in valid format but Root ID so long, there is not place left to local ID when it overflows
    return false
  }

  return true
}

export function isOverflowed (id: string): boolean {
  return isValid(id) && id.endsWith('#')
}

export function isIncoming (id: string): boolean {
  return isValid(id) && id.endsWith('_')
}

export function isOutgoing (id: string): boolean {
  return isValid(id) && id.endsWith('.') && id.split('.', 2)[1] !== ''
}

export function isRoot (id: string): boolean {
  return isValid(id) && id.split('.', 2)[1] === ''
}

export function generateRootId (): string {
  const rawRootId = randomBytes(Math.ceil(ROOT_ID_LENGTH / 4 * 3)).toString('base64')
  return `|${rawRootId}.`
}

export function generateIncomingId (id: string = ''): string {
  if (isOverflowed(id)) {
    // The received ID is overflowed, use it to generate a new overflowed id.
    return generateOverflowedId(id)
  }

  if (!isValid(id)) {
    // The received ID is invalid, use it to generate a new root id
    id = generateRootId()
  }

  if (isIncoming(id)) {
    // The received ID is already an incoming ID, convert it to outgoing ID first.
    id = generateOutgoingId(id)
  }

  if (id.length > MAX_ID_LENGTH - 3 * (NODE_LENGTH + 1)) {
    // This ID is too long, it will overflow after adding this (incoming) or a next (outgoing) segment,
    // to prevent removing segments, generate an overflowed id now.
    return generateOverflowedId(id)
  }

  // Add a suffix to the received ID
  const suffix = randomBytes(SEGMENT_BYTES).toString('base64')
  return `${id}${suffix}_`
}

export function generateOutgoingId (id: string): string {
  if (!isValid(id)) {
    // The received ID in an unknown format, use it to generate a new root id.
    id = generateRootId()
  }

  if (isOverflowed(id)) {
    // The received ID is overflowed, use it to generate a new overflowed id.
    return generateOverflowedId(id)
  }

  if (id.length > MAX_ID_LENGTH - 2 * (NODE_LENGTH + 1)) {
    // This ID is too long, it will overflow after adding this (outgoing) segment,
    // to prevent removing segments, generate an overflowed ID now.
    return generateOverflowedId(id)
  }

  // Add a suffix to the received ID
  const suffix = randomBytes(SEGMENT_BYTES).toString('base64')
  return `${id}${suffix}.`
}

export function generateOverflowedId (id: string): string {
  if (!isValid(id)) {
    // The received ID in an unknown format, use it to generate a new root id.
    id = generateRootId()
  }

  // Remove segments from the tail to make place for a local ID
  do {
    id = id.split('.').slice(0, -1).join('.')
  } while (id.length > MAX_ID_LENGTH - NODE_LENGTH - 1)

  // Add a local ID on the end of the received ID
  const localId = randomBytes(SEGMENT_BYTES).toString('base64')
  return `${id}.${localId}#`
}

export function extractRootId (id: string): string | null {
  if (!isValid(id)) {
    return null
  }

  return id.split('.', 1).shift() + '.'
}
