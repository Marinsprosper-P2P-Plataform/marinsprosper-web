"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/** Espelha `cashier_availability` de [[03 - Modelo de Dados]] — modo
 * online/offline, horários, métodos aceitos. Mesmo padrão de "backend
 * fake" dos outros mocks, um registro por conta. */
export interface CashierAvailability {
  userId: string;
  online: boolean;
  days: string[];
  startTime: string;
  endTime: string;
  methods: string[];
}

export const WEEKDAYS = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
] as const;

function seedAvailability(): CashierAvailability[] {
  return [
    {
      userId: "user-client-1",
      online: false,
      days: ["seg", "ter", "qua", "qui", "sex"],
      startTime: "09:00",
      endTime: "18:00",
      methods: ["pix"],
    },
    {
      userId: "user-cashier-1",
      online: true,
      days: ["seg", "ter", "qua", "qui", "sex", "sab"],
      startTime: "08:00",
      endTime: "20:00",
      methods: ["pix", "ted"],
    },
  ];
}

type AvailabilityAction = { type: "UPDATE"; userId: string; patch: Partial<CashierAvailability> };

function availabilityReducer(state: CashierAvailability[], action: AvailabilityAction): CashierAvailability[] {
  return state.map((entry) =>
    entry.userId === action.userId ? { ...entry, ...action.patch } : entry,
  );
}

interface MockCashierAvailabilityContextValue {
  entries: CashierAvailability[];
  getAvailability: (userId: string) => CashierAvailability | undefined;
  updateAvailability: (userId: string, patch: Partial<CashierAvailability>) => void;
}

const MockCashierAvailabilityContext = createContext<MockCashierAvailabilityContextValue | null>(null);

export function MockCashierAvailabilityProvider({ children }: { children: ReactNode }) {
  const [entries, dispatch] = useReducer(availabilityReducer, undefined, seedAvailability);

  const getAvailability = useCallback(
    (userId: string) => entries.find((entry) => entry.userId === userId),
    [entries],
  );

  const updateAvailability = useCallback((userId: string, patch: Partial<CashierAvailability>) => {
    dispatch({ type: "UPDATE", userId, patch });
  }, []);

  return (
    <MockCashierAvailabilityContext.Provider value={{ entries, getAvailability, updateAvailability }}>
      {children}
    </MockCashierAvailabilityContext.Provider>
  );
}

export function useMockCashierAvailability() {
  const ctx = useContext(MockCashierAvailabilityContext);
  if (!ctx) {
    throw new Error("useMockCashierAvailability precisa estar dentro de MockCashierAvailabilityProvider");
  }
  return ctx;
}
