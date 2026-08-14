import { z } from "zod";

/** Formato de endereço TRON (base58, prefixo `T`, 34 caracteres) — só
 * checagem de formato na UI; quem valida de verdade é o backend
 * (mesmo princípio do resto deste arquivo). */
export const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export const createOrderSchema = z
  .object({
    type: z.enum(["compra", "venda"]),
    grossAmount: z.number().min(10, "Valor mínimo de R$ 10").max(50000, "Valor máximo de R$ 50.000"),
    paymentMethod: z.literal("PIX"),
    /** Chave PIX cadastrada do cliente envolvida na ordem — ver
     * `Order.clientPixKeySnapshot`. Sem isso não dá pra criar ordem,
     * reforçando a trava anti-triangulação no momento da transação, não
     * só no cadastro da chave. */
    pixKeyId: z.string().min(1, "Selecione uma chave PIX"),
    /** Obrigatório só quando `type === "compra"` — vira o beneficiário
     * fixado no contrato de custódia no aceite, não dá pra pedir depois
     * (ver [[21 - Integração com API Real]] §3, linha de `POST /orders`). */
    clientTronAddress: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "compra") return;
    if (!data.clientTronAddress || !TRON_ADDRESS_PATTERN.test(data.clientTronAddress)) {
      ctx.addIssue({
        code: "custom",
        path: ["clientTronAddress"],
        message: "Endereço TRON (TRC20) inválido",
      });
    }
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
