import { AlertTriangleIcon, CheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyFieldButton } from "@/components/shared/copy-field-button";
import { formatBRL } from "@/lib/mock/format";
import type { Order } from "@/types/order";

/** Dados de PIX pra transferência + validação de identidade do titular
 * — compara o nome do titular da chave (`pixSnapshot.holderName`) com o
 * nome cadastrado da contraparte (`counterpartyName`). Divergência é
 * sinal de possível fraude/conta trocada, então bloqueia com alerta
 * vermelho em vez de só avisar; quando bate, mostra confirmação
 * discreta — não precisa chamar atenção pra algo que já está certo. */
export function PixTransferPanel({
  order,
  counterpartyName,
  pixHolderName,
  pixSnapshot,
  pixPending,
  pixMissing,
}: {
  order: Order;
  counterpartyName: string | undefined;
  pixHolderName: string | undefined;
  pixSnapshot: { type: string; key: string; bank: string; holderName?: string } | undefined;
  pixPending: boolean;
  pixMissing: boolean;
}) {
  const keyHolderName = pixSnapshot?.holderName ?? pixHolderName;
  const holderMismatch =
    !!keyHolderName && !!counterpartyName && keyHolderName.trim().toLowerCase() !== counterpartyName.trim().toLowerCase();

  const copyHolderLabel = "Copiar nome do titular";
  const copyHolderCopiedLabel = "Copiado";
  const copyKeyLabel = "Copiar chave PIX";
  const copyKeyCopiedLabel = "Copiado";
  const copyAmountLabel = "Copiar valor";
  const copyAmountCopiedLabel = "Valor copiado ✓";
  const copyDocumentLabel = "Copiar documento";
  const copyDocumentCopiedLabel = "Copiado";
  const copyTxidLabel = "Copiar TXID";
  const copyTxidCopiedLabel = "Copiado";

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Dados PIX para transferência</h2>
        {pixPending && (
          <p className="text-muted-foreground text-sm">
            Aguardando um caixeiro aceitar a ordem para exibir os dados de transferência.
          </p>
        )}
        {pixMissing && (
          <p className="text-muted-foreground text-sm">
            {pixHolderName} ainda não tem nenhuma chave PIX cadastrada.
          </p>
        )}
        {pixSnapshot && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p>
                {order.type === "compra" ? "Transferir para" : "Cliente vai receber em"}:{" "}
                <span className="font-medium">{keyHolderName ?? "Não informado"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {pixSnapshot.bank} · {pixSnapshot.key}
              </p>
            </div>

            {holderMismatch ? (
              <Alert variant="destructive">
                <AlertTriangleIcon />
                <AlertTitle>O nome do titular não bate com a contraparte</AlertTitle>
                <AlertDescription>
                  A chave PIX está em nome de &quot;{keyHolderName}&quot;, mas a contraparte cadastrada
                  é &quot;{counterpartyName}&quot;. Confirme a identidade pelo chat antes de transferir
                  ou abra uma disputa se algo parecer errado — não transfira sem ter certeza.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-status-completed flex items-center gap-1 text-xs">
                <CheckIcon className="size-3.5" /> Titular confere
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {keyHolderName && (
                <CopyFieldButton
                  value={keyHolderName}
                  label={copyHolderLabel}
                  copiedLabel={copyHolderCopiedLabel}
                />
              )}
              <CopyFieldButton
                value={pixSnapshot.key}
                label={copyKeyLabel}
                copiedLabel={copyKeyCopiedLabel}
              />
              <CopyFieldButton
                value={formatBRL(order.grossAmount)}
                label={copyAmountLabel}
                copiedLabel={copyAmountCopiedLabel}
              />
              {pixSnapshot.type === "cpf" && (
                <CopyFieldButton
                  value={pixSnapshot.key}
                  label={copyDocumentLabel}
                  copiedLabel={copyDocumentCopiedLabel}
                />
              )}
              {order.txid && (
                <CopyFieldButton
                  value={order.txid}
                  label={copyTxidLabel}
                  copiedLabel={copyTxidCopiedLabel}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {pixSnapshot && (
        <p className="text-muted-foreground px-1 text-xs">
          A confirmação do PIX depende do caixeiro conferir o recebimento manualmente — não é
          automática, mesmo depois de você marcar que transferiu.
        </p>
      )}
    </div>
  );
}
