import { z } from "zod";
import { isCpfCnpjFormat } from "./pix";

/**
 * Validação de UI apenas — a validação real, que decide o que é aceito
 * de verdade, vive sempre no backend (ver Parte 1, seção 3 dos
 * princípios fundamentais). A partir do Sprint 4, login/registro/MFA
 * chamam a API real (`src/lib/auth`) — só o resto do app (ordens,
 * carteira etc.) continua em dados fake.
 */

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const mfaSchema = z.object({
  code: z
    .string()
    .length(6, "O código tem 6 dígitos")
    .regex(/^\d+$/, "Só números"),
});
export type MfaInput = z.infer<typeof mfaSchema>;

/** `POST /auth/mfa/recovery` não documenta formato de código no Swagger
 * (rota nem aparece lá ainda, ver `src/lib/auth/api.ts`) — só exige não
 * vazio, sem presumir tamanho/máscara de um TOTP. */
export const mfaRecoverySchema = z.object({
  code: z.string().trim().min(1, "Informe o código de recuperação"),
});
export type MfaRecoveryInput = z.infer<typeof mfaRecoverySchema>;

/** Mesma forma do `mfaSchema`, mas schemas separados porque cobrem
 * endpoints diferentes (`/auth/verify-email`, `/auth/verify-phone`) —
 * nenhuma checagem de "código certo" é simulada aqui: como em qualquer
 * validação deste arquivo, o formato é tudo que a UI pode garantir, quem
 * decide se o código está correto é sempre o backend. */
export const emailOtpSchema = z.object({
  code: z
    .string()
    .length(6, "O código tem 6 dígitos")
    .regex(/^\d+$/, "Só números"),
});
export type EmailOtpInput = z.infer<typeof emailOtpSchema>;

export const phoneOtpSchema = z.object({
  code: z
    .string()
    .length(6, "O código tem 6 dígitos")
    .regex(/^\d+$/, "Só números"),
});
export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>;

export const COUNTRIES = [
  { id: "BR", label: "Brasil" },
  { id: "PY", label: "Paraguai" },
  { id: "AR", label: "Argentina" },
  { id: "US", label: "Estados Unidos" },
] as const;

/** `@username`: minúsculas, números e underscore, 3 a 20 caracteres —
 * regra de formato de UI só; unicidade real é checada à parte via
 * `checkUsernameAvailability` (src/lib/mock/username.ts), o mesmo
 * princípio de "frontend nunca decide sozinho" do resto do arquivo. */
export const usernameSchema = z
  .string()
  .min(3, "Mínimo de 3 caracteres")
  .max(20, "Máximo de 20 caracteres")
  .regex(/^[a-z0-9_]+$/, "Só minúsculas, números e _");

export const DOCUMENT_TYPES = [
  { id: "CPF", label: "CPF" },
  { id: "CNPJ", label: "CNPJ" },
] as const;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome completo"),
    username: usernameSchema,
    email: z.email("Informe um e-mail válido"),
    phone: z.string().min(8, "Informe um telefone válido"),
    country: z.enum(COUNTRIES.map((country) => country.id) as [string, ...string[]], {
      error: "Selecione um país",
    }),
    city: z.string().min(2, "Informe sua cidade"),
    role: z.enum(["cliente", "caixeiro"]),
    /** `documentType`/`documentNumber` — únicos campos de documento que
     * `POST /auth/register` de fato aceita hoje (confirmado no Swagger
     * do ambiente de teste); `@username`, país e cidade continuam só na
     * UI até o backend aceitar esses campos (ver
     * [[21 - Integração com API Real]] §3, linha de `/auth/register`). */
    documentType: z.enum(DOCUMENT_TYPES.map((type) => type.id) as ["CPF", "CNPJ"], {
      error: "Selecione o tipo de documento",
    }),
    documentNumber: z.string(),
    // Backend exige mínimo de 12 caracteres — maior que os 8 do resto do
    // protótipo, confirmado no Swagger (`password.minLength: 12`).
    password: z.string().min(12, "Mínimo de 12 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine((data) => isCpfCnpjFormat(data.documentNumber), {
    message: "CPF (11 dígitos) ou CNPJ (14 dígitos)",
    path: ["documentNumber"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const cashierApplySchema = z.object({
  methods: z.array(z.string()).min(1, "Selecione ao menos um método"),
  countries: z.string().min(2, "Informe ao menos um país"),
  currencies: z.string().min(2, "Informe ao menos uma moeda"),
});
export type CashierApplyInput = z.infer<typeof cashierApplySchema>;

export const PAYMENT_METHODS = [
  { id: "pix", label: "PIX" },
  { id: "ted", label: "TED" },
  { id: "boleto", label: "Boleto" },
] as const;
