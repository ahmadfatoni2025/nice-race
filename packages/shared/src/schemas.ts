import { z } from 'zod';
import { ABILITY_TYPES, MAX_PLAYERS, PLAYER_COLORS, ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from './constants.js';
import { CAR_LIST } from './vehicle/config.js';

const roomIdSchema = z
  .string()
  .trim()
  .length(ROOM_ID_LENGTH)
  .transform((value) => value.toUpperCase())
  .refine((value) => [...value].every((char) => ROOM_ID_ALPHABET.includes(char)), {
    message: 'Room ID contains invalid characters',
  });

const nameSchema = z.string().trim().min(1).max(32);
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toLowerCase());
const carIdSchema = z.enum(CAR_LIST.map((car) => car.id) as [string, ...string[]]);
const modeSchema = z.enum(['free-drive', 'arcade-race']);
const lapsSchema = z.number().int().min(2).max(3);

const base = { v: z.literal(1) };

export const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({
    ...base,
    t: z.literal('room:create'),
    name: nameSchema,
    mode: modeSchema.optional(),
    laps: lapsSchema.optional(),
    carId: carIdSchema.optional(),
    color: colorSchema.optional(),
  }),
  z.object({
    ...base,
    t: z.literal('room:join'),
    roomId: roomIdSchema,
    name: nameSchema,
    token: z.string().max(128).optional(),
    carId: carIdSchema.optional(),
    color: colorSchema.optional(),
  }),
  z.object({ ...base, t: z.literal('room:leave') }),
  z.object({
    ...base,
    t: z.literal('room:config'),
    mode: modeSchema.optional(),
    laps: lapsSchema.optional(),
  }),
  z.object({
    ...base,
    t: z.literal('player:update'),
    ready: z.boolean().optional(),
    carId: carIdSchema.optional(),
    color: colorSchema.optional(),
    name: nameSchema.optional(),
  }),
  z.object({ ...base, t: z.literal('game:start') }),
  z.object({ ...base, t: z.literal('game:rematch') }),
  z.object({ ...base, t: z.literal('game:lobby') }),
  z.object({
    ...base,
    t: z.literal('vehicle:input'),
    seq: z.number().int().min(0).max(10_000_000),
    throttle: z.number().min(0).max(1),
    steering: z.number().min(-1).max(1),
    brake: z.boolean(),
    drift: z.boolean(),
    nitro: z.boolean(),
  }),
  z.object({
    ...base,
    t: z.literal('ability:use'),
    seq: z.number().int().min(0).max(10_000_000),
  }),
  z.object({ ...base, t: z.literal('player:respawn') }),
  z.object({
    ...base,
    t: z.literal('ping'),
    clientTime: z.number().finite(),
  }),
]);

export type ClientMessageInput = z.infer<typeof clientMessageSchema>;

/** Validate an untrusted parsed object against the wire protocol. */
export function parseClientMessage(value: unknown): z.SafeParseReturnType<unknown, ClientMessageInput> {
  return clientMessageSchema.safeParse(value);
}

export const abilityTypeSchema = z.enum(ABILITY_TYPES);
export const playerColorSchema = colorSchema;
export const displayNameSchema = nameSchema;
export const roomIdInputSchema = roomIdSchema;
export const maxPlayersSchema = z.number().int().min(1).max(MAX_PLAYERS);
export const playerColors = PLAYER_COLORS;
