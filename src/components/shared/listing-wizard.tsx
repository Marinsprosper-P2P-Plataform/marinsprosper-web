"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBRL, formatUSDT, formatPercent } from "@/lib/mock/format";
import { useMockSession } from "@/lib/mock/session";
import { useMockPaymentMethods } from "@/lib/mock/payment-methods";
import { useMockListings } from "@/lib/mock/listings";
import { PIX_KEY_TYPES, type PixKeyType } from "@/lib/validations/pix";
import {
  paymentMethodDetailsSchema,
  listingLimitsSchema,
  LISTING_DEMO_PASSWORD,
} from "@/lib/validations/listing";
import type { Listing, ListingOperation, PaymentMethodKind } from "@/types/listing";

const DEFAULT_PLATFORM_FEE_PERCENT = 0.25;

interface WizardState {
  step: number;
  operation: ListingOperation;
  paymentMethodId: string;
  addingMethod: boolean;
  methodKind: PaymentMethodKind;
  methodPixType: PixKeyType;
  methodPixKey: string;
  methodBank: string;
  methodAgency: string;
  methodAccount: string;
  methodTransferKey: string;
  quote: string;
  noThirdParty: boolean;
  totalQuantity: string;
  minPerOrder: string;
  maxPerOrder: string;
  terms: string;
  welcomeMessage: string;
  isPublic: boolean;
  password: string;
  passwordError: string | null;
}

/** Estado inicial do wizard — função de módulo (não arrow field de
 * classe): não há problema de binding aqui (componente funcional), mas
 * mantém a mesma ideia de "estado inicial computável isoladamente",
 * reutilizável tanto pra criação quanto, com `wizardFromListing`, pra
 * edição. */
function defaultWizard(): WizardState {
  return {
    step: 0,
    operation: "compra",
    paymentMethodId: "",
    addingMethod: false,
    methodKind: "pix",
    methodPixType: "cpf",
    methodPixKey: "",
    methodBank: "",
    methodAgency: "",
    methodAccount: "",
    methodTransferKey: "",
    quote: "",
    noThirdParty: false,
    totalQuantity: "",
    minPerOrder: "",
    maxPerOrder: "",
    terms: "",
    welcomeMessage: "",
    isPublic: true,
    password: "",
    passwordError: null,
  };
}

function wizardFromListing(listing: Listing): WizardState {
  return {
    ...defaultWizard(),
    operation: listing.operation,
    paymentMethodId: listing.paymentMethodId,
    quote: String(listing.quote),
    noThirdParty: listing.noThirdParty,
    totalQuantity: String(listing.totalQuantity),
    minPerOrder: String(listing.minPerOrder),
    maxPerOrder: String(listing.maxPerOrder),
    terms: listing.terms,
    welcomeMessage: listing.welcomeMessage,
    isPublic: listing.isPublic,
  };
}

const STEP_LABELS = [
  "Operação",
  "Moeda e pagamento",
  "Cotação",
  "Limites",
  "Termos",
  "Boas-vindas",
  "Visibilidade",
  "Resumo",
  "Confirmação",
];

function parseNumber(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function wizardStepValid(step: number, state: WizardState) {
  switch (step) {
    case 0:
      return state.operation === "compra" || state.operation === "venda";
    case 1:
      return state.paymentMethodId.length > 0 && !state.addingMethod;
    case 2:
      return parseNumber(state.quote) > 0;
    case 3:
      return listingLimitsSchema.safeParse({
        totalQuantity: parseNumber(state.totalQuantity),
        minPerOrder: parseNumber(state.minPerOrder),
        maxPerOrder: parseNumber(state.maxPerOrder),
      }).success;
    case 4:
      return state.terms.trim().length > 0;
    case 5:
      return true;
    case 6:
      return true;
    case 7:
      return true;
    case 8:
      return state.password.length > 0;
    default:
      return false;
  }
}

export function ListingWizard({ mode, listing }: { mode: "create" | "edit"; listing?: Listing }) {
  const router = useRouter();
  const { user } = useMockSession();
  const { paymentMethods, addPaymentMethod } = useMockPaymentMethods();
  const { addListing, updateListing } = useMockListings();

  const [state, setState] = useState<WizardState>(() =>
    mode === "edit" && listing ? wizardFromListing(listing) : defaultWizard(),
  );

  const update = (patch: Partial<WizardState>) => setState((current) => ({ ...current, ...patch }));

  const myMethods = paymentMethods.filter((method) => method.userId === user.id);
  const lastStep = STEP_LABELS.length - 1;
  const canAdvance = wizardStepValid(state.step, state);

  function onWizardNext() {
    if (!canAdvance) return;
    if (state.step === lastStep) {
      onWizardPublish();
      return;
    }
    update({ step: Math.min(state.step + 1, lastStep) });
  }

  function onWizardBack() {
    update({ step: Math.max(state.step - 1, 0) });
  }

  function onWizardSetPublic() {
    update({ isPublic: true });
  }

  function onWizardSetPrivate() {
    update({ isPublic: false });
  }

  function onWizardPasswordChange(value: string) {
    update({ password: value, passwordError: null });
  }

  function handleSaveMethod() {
    const details =
      state.methodKind === "pix"
        ? { kind: "pix" as const, pixType: state.methodPixType, pixKey: state.methodPixKey }
        : {
            kind: "transferencia" as const,
            bank: state.methodBank,
            agency: state.methodAgency,
            account: state.methodAccount,
            transferKey: state.methodTransferKey,
          };

    const parsed = paymentMethodDetailsSchema.safeParse(details);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os dados do método de pagamento");
      return;
    }

    const label =
      state.methodKind === "pix"
        ? `PIX · ${PIX_KEY_TYPES.find((t) => t.id === state.methodPixType)?.label ?? state.methodPixType}`
        : `Transferência · ${state.methodBank}`;

    const method = addPaymentMethod({ userId: user.id, label, details: parsed.data });

    update({
      paymentMethodId: method.id,
      addingMethod: false,
      methodPixKey: "",
      methodBank: "",
      methodAgency: "",
      methodAccount: "",
      methodTransferKey: "",
    });
    toast.success("Método de pagamento cadastrado");
  }

  function onWizardPublish() {
    if (state.password !== LISTING_DEMO_PASSWORD) {
      update({ passwordError: "Senha incorreta" });
      return;
    }

    const quote = parseNumber(state.quote);
    const totalQuantity = parseNumber(state.totalQuantity);
    const minPerOrder = parseNumber(state.minPerOrder);
    const maxPerOrder = parseNumber(state.maxPerOrder);
    const platformFeePercent = listing?.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
    const feeAmount = Math.round(totalQuantity * quote * (platformFeePercent / 100) * 100) / 100;

    if (mode === "edit" && listing) {
      updateListing(listing.id, {
        operation: state.operation,
        paymentMethodId: state.paymentMethodId,
        quote,
        noThirdParty: state.noThirdParty,
        totalQuantity,
        minPerOrder,
        maxPerOrder,
        terms: state.terms,
        welcomeMessage: state.welcomeMessage,
        isPublic: state.isPublic,
        feeAmount,
      });
      toast.success("Oferta atualizada");
    } else {
      const t = new Date().toISOString();
      addListing({
        id: `listing-${crypto.randomUUID()}`,
        operation: state.operation,
        asset: "USDT",
        paymentMethodId: state.paymentMethodId,
        quote,
        noThirdParty: state.noThirdParty,
        totalQuantity,
        minPerOrder,
        maxPerOrder,
        terms: state.terms,
        welcomeMessage: state.welcomeMessage,
        isPublic: state.isPublic,
        platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
        feeAmount,
        status: "ATIVA",
        ownerId: user.id,
        ownerName: user.name,
        createdAt: t,
        updatedAt: t,
      });
      toast.success("Oferta publicada");
    }

    router.push("/offers");
  }

  const selectedMethod = paymentMethods.find((m) => m.id === state.paymentMethodId);
  const quoteNumber = parseNumber(state.quote);
  const minNumber = parseNumber(state.minPerOrder);
  const maxNumber = parseNumber(state.maxPerOrder);
  const totalNumber = parseNumber(state.totalQuantity);
  const feePreview =
    Number.isFinite(totalNumber) && Number.isFinite(quoteNumber)
      ? Math.round(totalNumber * quoteNumber * (DEFAULT_PLATFORM_FEE_PERCENT / 100) * 100) / 100
      : 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">
          {mode === "edit" ? "Editar oferta" : "Nova oferta"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Etapa {state.step + 1} de {STEP_LABELS.length} · {STEP_LABELS[state.step]}
        </p>
      </div>

      <div className="flex gap-1">
        {STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "h-1 flex-1 rounded-full",
              index <= state.step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {state.step === 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Operação</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={state.operation === "compra"}
                onClick={() => update({ operation: "compra" })}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  state.operation === "compra"
                    ? "bg-status-dispute text-status-dispute-foreground border-transparent"
                    : "border-border hover:bg-accent",
                )}
              >
                Quero comprar USDT
              </button>
              <button
                type="button"
                aria-pressed={state.operation === "venda"}
                onClick={() => update({ operation: "venda" })}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  state.operation === "venda"
                    ? "bg-status-completed text-status-completed-foreground border-transparent"
                    : "border-border hover:bg-accent",
                )}
              >
                Quero vender USDT
              </button>
            </div>
          </div>
        )}

        {state.step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Moeda</Label>
              <p className="text-sm">USDT</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Método de pagamento</Label>
              {myMethods.length === 0 && !state.addingMethod && (
                <p className="text-muted-foreground text-sm">
                  Você ainda não tem nenhum método cadastrado.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {myMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    aria-pressed={state.paymentMethodId === method.id}
                    onClick={() => update({ paymentMethodId: method.id, addingMethod: false })}
                    className={cn(
                      "rounded-lg border p-2 text-left text-sm transition-colors",
                      state.paymentMethodId === method.id
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {!state.addingMethod ? (
                <Button type="button" variant="outline" size="sm" onClick={() => update({ addingMethod: true })}>
                  + Cadastrar novo método
                </Button>
              ) : (
                <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={state.methodKind === "pix"}
                      onClick={() => update({ methodKind: "pix" })}
                      className={cn(
                        "rounded-lg border p-2 text-sm font-medium transition-colors",
                        state.methodKind === "pix" ? "bg-accent border-primary" : "border-border hover:bg-accent",
                      )}
                    >
                      PIX
                    </button>
                    <button
                      type="button"
                      aria-pressed={state.methodKind === "transferencia"}
                      onClick={() => update({ methodKind: "transferencia" })}
                      className={cn(
                        "rounded-lg border p-2 text-sm font-medium transition-colors",
                        state.methodKind === "transferencia" ? "bg-accent border-primary" : "border-border hover:bg-accent",
                      )}
                    >
                      Transferência
                    </button>
                  </div>

                  {state.methodKind === "pix" ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-pix-type">Tipo de chave</Label>
                        <Select
                          value={state.methodPixType}
                          onValueChange={(value) => update({ methodPixType: value as PixKeyType })}
                        >
                          <SelectTrigger id="method-pix-type" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIX_KEY_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-pix-key">Chave PIX</Label>
                        <Input
                          id="method-pix-key"
                          value={state.methodPixKey}
                          onChange={(event) => update({ methodPixKey: event.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-bank">Banco</Label>
                        <Input
                          id="method-bank"
                          value={state.methodBank}
                          onChange={(event) => update({ methodBank: event.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-agency">Agência</Label>
                        <Input
                          id="method-agency"
                          value={state.methodAgency}
                          onChange={(event) => update({ methodAgency: event.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-account">Conta</Label>
                        <Input
                          id="method-account"
                          value={state.methodAccount}
                          onChange={(event) => update({ methodAccount: event.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="method-transfer-key">Chave</Label>
                        <Input
                          id="method-transfer-key"
                          value={state.methodTransferKey}
                          onChange={(event) => update({ methodTransferKey: event.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleSaveMethod}>
                      Salvar método
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ addingMethod: false })}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote">Cotação (BRL por USDT)</Label>
              <Input
                id="quote"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={state.quote}
                onChange={(event) => update({ quote: event.target.value })}
              />
            </div>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>Não aceito negociação com terceiros</span>
              <Switch
                checked={state.noThirdParty}
                onCheckedChange={(checked) => update({ noThirdParty: checked })}
              />
            </label>
          </div>
        )}

        {state.step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalQuantity">Quantidade total (USDT)</Label>
              <Input
                id="totalQuantity"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={state.totalQuantity}
                onChange={(event) => update({ totalQuantity: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minPerOrder">Mínimo por solicitação</Label>
                <Input
                  id="minPerOrder"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={state.minPerOrder}
                  onChange={(event) => update({ minPerOrder: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxPerOrder">Máximo por solicitação</Label>
                <Input
                  id="maxPerOrder"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={state.maxPerOrder}
                  onChange={(event) => update({ maxPerOrder: event.target.value })}
                />
              </div>
            </div>
            {Number.isFinite(minNumber) && Number.isFinite(maxNumber) && minNumber > maxNumber && (
              <p className="text-destructive text-sm">Mínimo não pode ser maior que o máximo</p>
            )}
            {Number.isFinite(maxNumber) && Number.isFinite(totalNumber) && maxNumber > totalNumber && (
              <p className="text-destructive text-sm">Máximo não pode ser maior que a quantidade total</p>
            )}
          </div>
        )}

        {state.step === 4 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="terms">Termos da negociação</Label>
            <Textarea
              id="terms"
              rows={5}
              value={state.terms}
              onChange={(event) => update({ terms: event.target.value })}
            />
          </div>
        )}

        {state.step === 5 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="welcomeMessage">Mensagem automática de boas-vindas</Label>
            <Textarea
              id="welcomeMessage"
              rows={4}
              placeholder="Enviada automaticamente assim que alguém negociar com você"
              value={state.welcomeMessage}
              onChange={(event) => update({ welcomeMessage: event.target.value })}
            />
          </div>
        )}

        {state.step === 6 && (
          <div className="flex flex-col gap-1.5">
            <Label>Visibilidade</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={state.isPublic}
                onClick={onWizardSetPublic}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  state.isPublic ? "bg-accent border-primary" : "border-border hover:bg-accent",
                )}
              >
                Pública
              </button>
              <button
                type="button"
                aria-pressed={!state.isPublic}
                onClick={onWizardSetPrivate}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  !state.isPublic ? "bg-accent border-primary" : "border-border hover:bg-accent",
                )}
              >
                Privada
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              {state.isPublic
                ? "Aparece na listagem de ofertas pra qualquer usuário."
                : "Só quem tiver o link direto consegue negociar."}
            </p>
          </div>
        )}

        {state.step === 7 && (
          <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-4 text-sm">
            <dt className="text-muted-foreground">Moeda</dt>
            <dd className="text-right">USDT</dd>
            <dt className="text-muted-foreground">Método</dt>
            <dd className="text-right">{selectedMethod?.label ?? "—"}</dd>
            <dt className="text-muted-foreground">Mínimo</dt>
            <dd className="text-right">
              {formatUSDT(minNumber || 0)} · {formatBRL((minNumber || 0) * (quoteNumber || 0))}
            </dd>
            <dt className="text-muted-foreground">Máximo</dt>
            <dd className="text-right">
              {formatUSDT(maxNumber || 0)} · {formatBRL((maxNumber || 0) * (quoteNumber || 0))}
            </dd>
            <dt className="text-muted-foreground">Comissão da plataforma</dt>
            <dd className="text-right">
              {formatPercent(DEFAULT_PLATFORM_FEE_PERCENT / 100)} · {formatBRL(feePreview)}
            </dd>
            <dt className="text-muted-foreground">Segurança</dt>
            <dd className="text-right">
              {state.noThirdParty ? "Sem terceiros" : "Terceiros permitidos"}
            </dd>
            <dt className="text-muted-foreground">Visibilidade</dt>
            <dd className="text-right">{state.isPublic ? "Pública" : "Privada"}</dd>
          </dl>
        )}

        {state.step === 8 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-password">Confirme sua senha pra publicar</Label>
            <Input
              id="listing-password"
              type="password"
              autoComplete="current-password"
              value={state.password}
              onChange={(event) => onWizardPasswordChange(event.target.value)}
            />
            {state.passwordError && (
              <p className="text-destructive text-sm">{state.passwordError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" onClick={onWizardBack} disabled={state.step === 0}>
          Voltar
        </Button>
        <Button type="button" onClick={onWizardNext} disabled={!canAdvance}>
          {state.step === lastStep ? (mode === "edit" ? "Salvar alterações" : "Publicar") : "Avançar"}
        </Button>
      </div>
    </div>
  );
}
