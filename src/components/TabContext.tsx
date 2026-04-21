import { createContext, useContext, useState, ReactNode } from 'react';

const TabContext = createContext({
  pendingTab: null as string | null,
  setPendingTab: (_: string | null) => {},
});

export const TabProvider = ({ children }: { children: ReactNode }) => {
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  return (
    <TabContext.Provider value={{ pendingTab, setPendingTab }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTab = () => useContext(TabContext);
