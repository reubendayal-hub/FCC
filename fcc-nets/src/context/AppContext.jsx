// ─── Pass 5: AppContext + useAppContext hook ─────────────────
// Pure plumbing. The <AppContext.Provider> lives in App.jsx because
// the value object is assembled from hook return values and locals
// that only exist inside the App component. View components will
// consume this context in Pass 6 to avoid prop drilling.

import { createContext, useContext } from "react";

export const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
