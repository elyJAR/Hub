import { z } from 'zod'

// Base message schema
export const BaseMessageSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sessionId: z.string(),
})

// User session info
export const UserSessionSchema = z.object({
  sessionId: z.string(),
  displayName: z.string(),
  avatar: z.string().optional(),
  status: z.enum(['online', 'in-call', 'away']),
  joinedAt: z.number(),
})

// WebSocket message types
export const ConnectionRequestSchema = BaseMessageSchema.extend({
  type: z.literal('connection-request'),
  targetSessionId: z.string(),
})

export const ConnectionResponseSchema = BaseMessageSchema.extend({
  type: z.literal('connection-response'),
  requestId: z.string(),
  accepted: z.boolean(),
})

export const ChatMessageSchema = BaseMessageSchema.extend({
  type: z.literal('chat-message'),
  targetSessionId: z.string(),
  content: z.string(),
})

export const PresenceUpdateSchema = BaseMessageSchema.extend({
  type: z.literal('presence-update'),
  users: z.array(UserSessionSchema),
})

export const TypingIndicatorSchema = BaseMessageSchema.extend({
  type: z.literal('typing-indicator'),
  targetSessionId: z.string(),
  isTyping: z.boolean(),
})

export const FileTransferRequestSchema = BaseMessageSchema.extend({
  type: z.literal('file-transfer-request'),
  targetSessionId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
})

export const FileTransferResponseSchema = BaseMessageSchema.extend({
  type: z.literal('file-transfer-response'),
  requestId: z.string(),
  accepted: z.boolean(),
})

// WebRTC signaling
export const WebRTCOfferSchema = BaseMessageSchema.extend({
  type: z.literal('webrtc-offer'),
  targetSessionId: z.string(),
  offer: z.object({
    type: z.literal('offer'),
    sdp: z.string(),
  }),
})

export const WebRTCAnswerSchema = BaseMessageSchema.extend({
  type: z.literal('webrtc-answer'),
  targetSessionId: z.string(),
  answer: z.object({
    type: z.literal('answer'),
    sdp: z.string(),
  }),
})

export const WebRTCIceCandidateSchema = BaseMessageSchema.extend({
  type: z.literal('webrtc-ice-candidate'),
  targetSessionId: z.string(),
  candidate: z.object({
    candidate: z.string(),
    sdpMLineIndex: z.number().nullable(),
    sdpMid: z.string().nullable(),
  }),
})

// Union of all message types
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  ConnectionRequestSchema,
  ConnectionResponseSchema,
  ChatMessageSchema,
  PresenceUpdateSchema,
  TypingIndicatorSchema,
  FileTransferRequestSchema,
  FileTransferResponseSchema,
  WebRTCOfferSchema,
  WebRTCAnswerSchema,
  WebRTCIceCandidateSchema,
])

// Type exports
export type UserSession = z.infer<typeof UserSessionSchema>
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>
export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>
export type ConnectionResponse = z.infer<typeof ConnectionResponseSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type PresenceUpdate = z.infer<typeof PresenceUpdateSchema>
export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>
export type FileTransferRequest = z.infer<typeof FileTransferRequestSchema>
export type FileTransferResponse = z.infer<typeof FileTransferResponseSchema>
export type WebRTCOffer = z.infer<typeof WebRTCOfferSchema>
export type WebRTCAnswer = z.infer<typeof WebRTCAnswerSchema>
export type WebRTCIceCandidate = z.infer<typeof WebRTCIceCandidateSchema>