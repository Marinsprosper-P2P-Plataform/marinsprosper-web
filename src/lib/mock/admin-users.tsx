"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";

/**
 * Diretório de usuários pro painel administrativo — mais amplo que as
 * duas contas "logáveis" de `session.tsx` (Ana/Beto), porque um admin
 * de verdade lista todo mundo, não só quem dá pra virar via
 * `AccountSwitcher`. `user-client-2` (Carla Souza) já existia como
 * cliente de `order-2` em `orders.tsx` — reaproveitado aqui pra não
 * criar uma segunda pessoa fake com o mesmo id.
 *
 * Espelha `users` + `user_status_history` + `kyc_cases` de
 * [[03 - Modelo de Dados]], achatado num único registro por
 * simplicidade de protótipo (sem histórico de transições ainda).
 */
export type UserStatus = "pendente" | "aprovado" | "suspenso" | "bloqueado";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  status: UserStatus;
  /** Nível de KYC (0 a 3), igual à faixa de `kyc_cases`. */
  kycLevel: 0 | 1 | 2 | 3;
  createdAt: string;
  /** CPF/CNPJ fake — campo sensível, mascarado por padrão nas telas
   * administrativas ([[03 - Modelo de Dados]]: "campos sensíveis... são
   * mascarados por padrão"). Ver `MaskedValue`. */
  document: string;
}

function seedUsers(): AdminUser[] {
  return [
    {
      id: "user-client-1",
      name: "Ana Ferreira",
      username: "anaferreira",
      email: "ana.ferreira@example.com",
      phone: "+55 11 90000-0001",
      status: "aprovado",
      kycLevel: 2,
      createdAt: "2026-06-02T10:00:00.000Z",
      document: "123.456.789-00",
    },
    {
      id: "user-cashier-1",
      name: "Beto Lima",
      username: "betolima",
      email: "beto.lima@example.com",
      phone: "+55 41 90000-0002",
      status: "aprovado",
      kycLevel: 3,
      createdAt: "2026-05-20T10:00:00.000Z",
      document: "987.654.321-00",
    },
    {
      id: "user-client-2",
      name: "Carla Souza",
      username: "carlasouza",
      email: "carla.souza@example.com",
      phone: "+55 21 90000-0003",
      status: "aprovado",
      kycLevel: 1,
      createdAt: "2026-06-10T10:00:00.000Z",
      document: "111.222.333-44",
    },
    {
      id: "user-client-3",
      name: "Diego Martins",
      username: "diegomartins",
      email: "diego.martins@example.com",
      phone: "+55 31 90000-0004",
      status: "pendente",
      kycLevel: 0,
      createdAt: "2026-08-05T14:30:00.000Z",
      document: "555.666.777-88",
    },
    {
      id: "user-client-4",
      name: "Elisa Prado",
      username: "elisaprado",
      email: "elisa.prado@example.com",
      phone: "+55 51 90000-0005",
      status: "suspenso",
      kycLevel: 2,
      createdAt: "2026-04-11T10:00:00.000Z",
      document: "222.333.444-55",
    },
    {
      id: "user-client-5",
      name: "Fábio Nogueira",
      username: "fabionogueira",
      email: "fabio.nogueira@example.com",
      phone: "+55 71 90000-0006",
      status: "bloqueado",
      kycLevel: 1,
      createdAt: "2026-03-22T10:00:00.000Z",
      document: "333.444.555-66",
    },
  ];
}

type AdminUsersAction = { type: "APPROVE"; userId: string };

function adminUsersReducer(state: AdminUser[], action: AdminUsersAction): AdminUser[] {
  switch (action.type) {
    case "APPROVE":
      return state.map((user) =>
        user.id === action.userId && user.status === "pendente"
          ? { ...user, status: "aprovado" }
          : user,
      );
    default:
      return state;
  }
}

interface MockAdminUsersContextValue {
  users: AdminUser[];
  approveUser: (userId: string) => void;
}

const MockAdminUsersContext = createContext<MockAdminUsersContextValue | null>(null);

export function MockAdminUsersProvider({ children }: { children: ReactNode }) {
  const [users, dispatch] = useReducer(adminUsersReducer, undefined, seedUsers);

  const approveUser = useCallback((userId: string) => {
    dispatch({ type: "APPROVE", userId });
  }, []);

  return (
    <MockAdminUsersContext.Provider value={{ users, approveUser }}>
      {children}
    </MockAdminUsersContext.Provider>
  );
}

export function useMockAdminUsers() {
  const ctx = useContext(MockAdminUsersContext);
  if (!ctx) {
    throw new Error("useMockAdminUsers precisa estar dentro de MockAdminUsersProvider");
  }
  return ctx;
}
