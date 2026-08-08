import { z } from "zod";

export const createOrderSchema = z.object({
  type: z.enum(["compra", "venda"]),
  grossAmount: z.number().min(10, "Valor mínimo de R$ 10").max(50000, "Valor máximo de R$ 50.000"),
  paymentMethod: z.literal("PIX"),
  /** Chave PIX cadastrada do cliente envolvida na ordem — ver
   * `Order.clientPixKeySnapshot`. Sem isso não dá pra criar ordem,
   * reforçando a trava anti-triangulação no momento da transação, não
   * só no cadastro da chave. */
  pixKeyId: z.string().min(1, "Selecione uma chave PIX"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
