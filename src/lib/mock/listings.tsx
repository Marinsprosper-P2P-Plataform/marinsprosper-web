"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";
import type { Listing } from "@/types/listing";

/**
 * "Backend fake" das ofertas (`Listing`) em memória — mesmo padrão de
 * `orders.tsx`: Context + reducer, cada ação confere o status anterior
 * antes de escrever. Sem endpoint real de ofertas ainda, então isso é
 * puramente local (sem persistência entre recarregamentos) — a ordem
 * criada ao negociar uma oferta, essa sim, vai pro backend real (ver
 * `useMockListings().negotiateListing` e `orders/api.ts`).
 */

const now = () => new Date().toISOString();

function seedListings(): Listing[] {
  const t = now();
  return [
    {
      id: "listing-1",
      operation: "venda",
      asset: "USDT",
      paymentMethodId: "pm-2",
      quote: 5.42,
      noThirdParty: false,
      totalQuantity: 500,
      minPerOrder: 20,
      maxPerOrder: 200,
      terms: "Pagamento em até 15 minutos após o aceite. Comprovante obrigatório.",
      welcomeMessage: "Olá! Assim que você negociar, te envio os dados de pagamento aqui no chat.",
      isPublic: true,
      platformFeePercent: 0.25,
      feeAmount: Math.round(500 * 5.42 * 0.0025 * 100) / 100,
      status: "ATIVA",
      ownerId: "user-cashier-1",
      ownerName: "Beto Lima",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "listing-2",
      operation: "compra",
      asset: "USDT",
      paymentMethodId: "pm-1",
      quote: 5.38,
      noThirdParty: true,
      totalQuantity: 150,
      minPerOrder: 10,
      maxPerOrder: 50,
      terms: "Só negocio com contas verificadas.",
      welcomeMessage: "",
      isPublic: true,
      platformFeePercent: 0.25,
      feeAmount: Math.round(150 * 5.38 * 0.0025 * 100) / 100,
      status: "PAUSADA",
      ownerId: "user-client-1",
      ownerName: "Ana Ferreira",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

type ListingsAction =
  | { type: "ADD"; listing: Listing }
  | { type: "UPDATE"; listingId: string; patch: Partial<Listing> }
  | { type: "PAUSE"; listingId: string }
  | { type: "RESUME"; listingId: string }
  | { type: "CANCEL"; listingId: string }
  | { type: "CLOSE"; listingId: string }
  | { type: "NEGOTIATE"; listingId: string; quantity: number };

const EDITABLE_STATUSES: Listing["status"][] = ["ATIVA", "PAUSADA"];

function listingsReducer(state: Listing[], action: ListingsAction): Listing[] {
  const patch = (
    listingId: string,
    from: Listing["status"][],
    next: Partial<Listing> | ((listing: Listing) => Partial<Listing>),
  ) =>
    state.map((listing) => {
      if (listing.id !== listingId) return listing;
      if (!from.includes(listing.status)) return listing;
      const resolved = typeof next === "function" ? next(listing) : next;
      return { ...listing, ...resolved, updatedAt: now() };
    });

  switch (action.type) {
    case "ADD":
      return [action.listing, ...state];

    case "UPDATE":
      return patch(action.listingId, EDITABLE_STATUSES, action.patch);

    case "PAUSE":
      return patch(action.listingId, ["ATIVA"], { status: "PAUSADA" });

    case "RESUME":
      return patch(action.listingId, ["PAUSADA"], { status: "ATIVA" });

    case "CANCEL":
      return patch(action.listingId, EDITABLE_STATUSES, { status: "CANCELADA" });

    case "CLOSE":
      return patch(action.listingId, EDITABLE_STATUSES, { status: "ENCERRADA" });

    case "NEGOTIATE":
      return patch(action.listingId, ["ATIVA"], (listing) => ({
        totalQuantity: Math.max(0, listing.totalQuantity - action.quantity),
      }));

    default:
      return state;
  }
}

interface MockListingsContextValue {
  listings: Listing[];
  addListing: (listing: Listing) => void;
  updateListing: (listingId: string, patch: Partial<Listing>) => void;
  pauseListing: (listingId: string) => void;
  resumeListing: (listingId: string) => void;
  cancelListing: (listingId: string) => void;
  closeListing: (listingId: string) => void;
  negotiateListing: (listingId: string, quantity: number) => void;
}

const MockListingsContext = createContext<MockListingsContextValue | null>(null);

export function MockListingsProvider({ children }: { children: ReactNode }) {
  const [listings, dispatch] = useReducer(listingsReducer, undefined, seedListings);

  const addListing = useCallback((listing: Listing) => dispatch({ type: "ADD", listing }), []);
  const updateListing = useCallback(
    (listingId: string, patch: Partial<Listing>) => dispatch({ type: "UPDATE", listingId, patch }),
    [],
  );
  const pauseListing = useCallback((listingId: string) => dispatch({ type: "PAUSE", listingId }), []);
  const resumeListing = useCallback((listingId: string) => dispatch({ type: "RESUME", listingId }), []);
  const cancelListing = useCallback((listingId: string) => dispatch({ type: "CANCEL", listingId }), []);
  const closeListing = useCallback((listingId: string) => dispatch({ type: "CLOSE", listingId }), []);
  const negotiateListing = useCallback(
    (listingId: string, quantity: number) => dispatch({ type: "NEGOTIATE", listingId, quantity }),
    [],
  );

  return (
    <MockListingsContext.Provider
      value={{
        listings,
        addListing,
        updateListing,
        pauseListing,
        resumeListing,
        cancelListing,
        closeListing,
        negotiateListing,
      }}
    >
      {children}
    </MockListingsContext.Provider>
  );
}

export function useMockListings() {
  const ctx = useContext(MockListingsContext);
  if (!ctx) {
    throw new Error("useMockListings precisa estar dentro de MockListingsProvider");
  }
  return ctx;
}
