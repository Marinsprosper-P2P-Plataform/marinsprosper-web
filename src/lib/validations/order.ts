import { z } from "zod";

export const createOrderSchema = z.object({
  type: z.enum(["compra", "venda"]),
  grossAmount: z.number().min(10, "Valor mínimo de R$ 10").max(50000, "Valor máximo de R$ 50.000"),
  paymentMethod: z.literal("PIX"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
