import { z } from "zod";

/**
 * Validação de UI apenas — protótipo com dados fake (Sprint -1). A
 * validação real, que decide o que é aceito de verdade, vive sempre no
 * backend (ver Parte 1, seção 3 dos princípios fundamentais).
 */

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
  isCashierOrAdmin: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const mfaSchema = z.object({
  code: z
    .string()
    .length(6, "O código tem 6 dígitos")
    .regex(/^\d+$/, "Só números"),
});
export type MfaInput = z.infer<typeof mfaSchema>;

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
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
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
