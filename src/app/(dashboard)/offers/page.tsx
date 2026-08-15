"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderTypeBadge } from "@/components/shared/order-status-badge";
import { ListingStatusBadge } from "@/components/shared/listing-status-badge";
import { ListingNegotiateDialog } from "@/components/shared/listing-negotiate-dialog";
import { useMockListings } from "@/lib/mock/listings";
import { useMockPaymentMethods } from "@/lib/mock/payment-methods";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import type { Listing } from "@/types/listing";

/**
 * Ofertas (`Listing`) — anúncios persistentes que o dono publica e
 * outros usuários negociam, diferente de uma ordem avulsa. Substitui a
 * antiga `/offers` (que listava ordens `OPEN` — ver `OfferList`, agora
 * usado só na sub-aba "Disponível" de `/orders`). Qualquer conta atual
 * pode publicar (`useMockSession` já dá as duas capacidades pra toda
 * conta, sem restrição de papel).
 */
export default function OffersPage() {
  const { listings, pauseListing, resumeListing, cancelListing, closeListing } = useMockListings();
  const { paymentMethods } = useMockPaymentMethods();
  const { user } = useMockSession();
  const [negotiating, setNegotiating] = useState<Listing | null>(null);

  const visibleListings = listings.filter(
    (listing) => listing.ownerId === user.id || (listing.isPublic && listing.status === "ATIVA"),
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Ofertas</h1>
          <p className="text-muted-foreground text-sm">Anúncios de compra e venda de USDT</p>
        </div>
        <Button asChild size="sm">
          <Link href="/offers/new">Nova oferta</Link>
        </Button>
      </div>

      {visibleListings.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma oferta disponível no momento.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visibleListings.map((listing) => {
          const method = paymentMethods.find((m) => m.id === listing.paymentMethodId);
          const isOwner = listing.ownerId === user.id;

          return (
            <li key={listing.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <OrderTypeBadge type={listing.operation} />
                <ListingStatusBadge status={listing.status} />
                <span className="text-muted-foreground text-xs">
                  {listing.isPublic ? "Pública" : "Privada"}
                </span>
                {isOwner && <span className="text-muted-foreground text-xs">Sua oferta</span>}
              </div>

              <div>
                <p className="font-medium">
                  {formatBRL(listing.quote)}/USDT{" "}
                  <span className="text-muted-foreground font-normal">via {method?.label ?? "—"}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Disponível: {formatUSDT(listing.totalQuantity)} · limites{" "}
                  {formatUSDT(listing.minPerOrder)} – {formatUSDT(listing.maxPerOrder)}
                </p>
                <p className="text-muted-foreground text-xs">{listing.ownerName}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isOwner ? (
                  <>
                    {(listing.status === "ATIVA" || listing.status === "PAUSADA") && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/offers/${listing.id}/edit`}>Editar</Link>
                      </Button>
                    )}
                    {listing.status === "ATIVA" && (
                      <Button variant="outline" size="sm" onClick={() => pauseListing(listing.id)}>
                        Pausar
                      </Button>
                    )}
                    {listing.status === "PAUSADA" && (
                      <Button variant="outline" size="sm" onClick={() => resumeListing(listing.id)}>
                        Reativar
                      </Button>
                    )}
                    {(listing.status === "ATIVA" || listing.status === "PAUSADA") && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => cancelListing(listing.id)}>
                          Cancelar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => closeListing(listing.id)}>
                          Encerrar
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  listing.status === "ATIVA" && (
                    <Button size="sm" onClick={() => setNegotiating(listing)}>
                      Negociar
                    </Button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {negotiating && (
        <ListingNegotiateDialog
          listing={negotiating}
          open={!!negotiating}
          onOpenChange={(open) => {
            if (!open) setNegotiating(null);
          }}
        />
      )}
    </div>
  );
}
