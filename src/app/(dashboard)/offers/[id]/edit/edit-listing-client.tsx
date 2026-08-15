"use client";

import { ListingWizard } from "@/components/shared/listing-wizard";
import { useMockListings } from "@/lib/mock/listings";
import { useMockSession } from "@/lib/mock/session";

export function EditListingClient({ listingId }: { listingId: string }) {
  const { listings } = useMockListings();
  const { user } = useMockSession();
  const listing = listings.find((item) => item.id === listingId);

  if (!listing) {
    return <p className="text-muted-foreground p-4 text-sm">Oferta não encontrada.</p>;
  }
  if (listing.ownerId !== user.id) {
    return <p className="text-muted-foreground p-4 text-sm">Você não pode editar esta oferta.</p>;
  }
  if (listing.status !== "ATIVA" && listing.status !== "PAUSADA") {
    return <p className="text-muted-foreground p-4 text-sm">Esta oferta não pode mais ser editada.</p>;
  }

  return <ListingWizard mode="edit" listing={listing} />;
}
