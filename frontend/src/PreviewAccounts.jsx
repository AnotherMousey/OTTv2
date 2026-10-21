import React, { createContext, useContext } from "react";
import { useTournamentAccounts } from "./hooks/useTournamentAccounts.js";

const Context = createContext(null);

// Retain the existing provider name and consumer contract.
export function PreviewAccounts({ children }) {
  const accounts = useTournamentAccounts();
  return <Context.Provider value={accounts}>{children}</Context.Provider>;
}

export function useAccounts() {
  return useContext(Context);
}
