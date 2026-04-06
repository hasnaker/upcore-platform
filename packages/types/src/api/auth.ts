import { z } from 'zod';
import { UserSchema } from '../schemas/user';
import { TenantSchema } from '../schemas/tenant';
import { UserRoleSchema } from '../enums/user-role';
import { TenantIdSchema, UserIdSchema, EmployeeIdSchema } from '../ids';
import { IsoDateTimeSchema } from '../schemas/base';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  tenantSlug: z.string().optional(),
  rememberMe: z.boolean().default(false),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: IsoDateTimeSchema,
  user: UserSchema,
  tenant: TenantSchema.nullable(),
  requiresMfa: z.boolean().default(false),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(200)
    .regex(/[A-Z]/, { message: 'En az bir büyük harf içermelidir' })
    .regex(/[a-z]/, { message: 'En az bir küçük harf içermelidir' })
    .regex(/\d/, { message: 'En az bir rakam içermelidir' }),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().min(2).max(200),
  locale: z.enum(['tr-TR', 'en-US']).default('tr-TR'),
  acceptedTerms: z.literal(true),
  kvkkConsent: z.literal(true),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const SignupResponseSchema = LoginResponseSchema;
export type SignupResponse = z.infer<typeof SignupResponseSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: IsoDateTimeSchema,
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const VerifyMfaRequestSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyMfaRequest = z.infer<typeof VerifyMfaRequestSchema>;

/** JWT access-token claims. */
export const JwtClaimsSchema = z.object({
  sub: UserIdSchema,
  tid: TenantIdSchema.nullable(),
  eid: EmployeeIdSchema.nullable(),
  role: UserRoleSchema,
  email: z.string().email(),
  iat: z.number().int(),
  exp: z.number().int(),
  iss: z.string(),
  aud: z.string(),
});
export type JwtClaims = z.infer<typeof JwtClaimsSchema>;
