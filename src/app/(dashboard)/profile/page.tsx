"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TrashIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MfaSettings } from "@/components/shared/mfa-settings";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { COUNTRIES } from "@/lib/validations/auth";
import { PIX_KEY_TYPES, isCpfCnpjFormat, type PixKeyType } from "@/lib/validations/pix";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockPixKeys, type PixKey } from "@/lib/mock/pix-keys";
import { getUserReputation } from "@/lib/mock/reputation";
import { useMockSession } from "@/lib/mock/session";

/** GET /users/me + GET /users/me/payment-methods — protótipo com dados
 * fake. Cobre o bucket "Perfil & Configurações" do Kanban: identidade
 * (@username, país, cidade, reputação) e cadastro de chaves PIX. */
export default function ProfilePage() {
  const { user } = useMockSession();
  const { orders } = useMockOrders();
  const { pixKeys } = useMockPixKeys();

  const reputation = useMemo(() => getUserReputation(orders, user.id), [orders, user.id]);

  const countryLabel = COUNTRIES.find((country) => country.id === user.country)?.label ?? user.country;
  const myPixKeys = pixKeys.filter((key) => key.userId === user.id);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Perfil & Configurações</h1>
        <p className="text-muted-foreground text-sm">Sua identidade e meios de pagamento na plataforma</p>
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
        <Avatar size="lg">
          <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground text-sm">@{user.username}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {user.city}, {countryLabel}
          </p>
          <ReputationStars reputation={reputation} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Chaves PIX</h2>
          <AddPixKeyDialog />
        </div>

        {myPixKeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma chave PIX cadastrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {myPixKeys.map((key) => (
              <PixKeyRow key={key.id} pixKey={key} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Segurança</h2>
        <MfaSettings />
      </div>
    </div>
  );
}

function PixKeyRow({ pixKey }: { pixKey: PixKey }) {
  const { removePixKey } = useMockPixKeys();
  const typeLabel = PIX_KEY_TYPES.find((type) => type.id === pixKey.type)?.label ?? pixKey.type;

  return (
    <li className="border-border flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{typeLabel}</Badge>
          <span className="text-sm font-medium">{pixKey.key}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {pixKey.bank}
          {pixKey.description ? ` · ${pixKey.description}` : ""}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Remover chave"
        onClick={() => {
          removePixKey(pixKey.id);
          toast.success("Chave PIX removida");
        }}
      >
        <TrashIcon className="size-4" />
      </Button>
    </li>
  );
}

function AddPixKeyDialog() {
  const { user } = useMockSession();
  const { addPixKey } = useMockPixKeys();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PixKeyType>("cpf");
  const [key, setKey] = useState("");
  const [bank, setBank] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Trava de titularidade — checagem de UI só pro tipo `cpf`, onde a
  // própria chave É o documento e dá pra comparar direto com o CPF/CNPJ
  // fake do KYC desta conta. Pros outros tipos, quem resolve de verdade
  // é o backend (Sprint 2) — aqui só avisa que a checagem existe.
  const ownershipMismatch = type === "cpf" && key.trim() !== "" && key.trim() !== user.document;
  const keyFormatValid =
    type !== "cpf" || isCpfCnpjFormat(key);
  const canSubmit = key.trim() !== "" && bank.trim() !== "" && !ownershipMismatch && keyFormatValid;

  function reset() {
    setType("cpf");
    setKey("");
    setBank("");
    setDescription("");
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    addPixKey({ userId: user.id, type, key: key.trim(), bank: bank.trim(), description: description.trim() || undefined });
    toast.success("Chave PIX cadastrada");
    setSubmitting(false);
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">Adicionar chave</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar chave PIX</DialogTitle>
          <DialogDescription>
            A chave precisa pertencer ao mesmo CPF/CNPJ do seu cadastro — obrigatório tanto pra
            enviar quanto pra receber valores.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pix-type">Tipo de chave</Label>
            <Select value={type} onValueChange={(value) => { setType(value as PixKeyType); setKey(""); }}>
              <SelectTrigger id="pix-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIX_KEY_TYPES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pix-key">Chave PIX</Label>
            <Input
              id="pix-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={type === "cpf" ? user.document : undefined}
              aria-invalid={ownershipMismatch || !keyFormatValid}
            />
            {type === "cpf" && ownershipMismatch && (
              <p className="text-destructive text-sm">
                Precisa ser o mesmo CPF/CNPJ do seu cadastro ({user.document}) — trava anti-triangulação.
              </p>
            )}
            {type === "cpf" && !ownershipMismatch && !keyFormatValid && key.trim() !== "" && (
              <p className="text-destructive text-sm">CPF (11 dígitos) ou CNPJ (14 dígitos)</p>
            )}
            {type !== "cpf" && (
              <p className="text-muted-foreground text-xs">
                A titularidade desta chave será validada contra o CPF/CNPJ do seu KYC no backend antes
                de ela poder ser usada numa ordem.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pix-bank">Instituição bancária</Label>
            <Input id="pix-bank" value={bank} onChange={(event) => setBank(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pix-description">Descrição (opcional)</Label>
            <Textarea
              id="pix-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            Cadastrar chave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
