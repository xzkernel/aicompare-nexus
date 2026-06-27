import { useState, createContext, useContext } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const Tabs = ({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-bg-soft rounded-lg ring-1 ring-stroke-subtle">
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base ${
        isActive 
          ? "bg-bg-paper text-text-primary shadow-soft" 
          : "text-text-secondary hover:text-text-primary hover:bg-bg-soft/50"
      }`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  
  const { activeTab } = context;
  
  if (activeTab !== value) return null;
  
  return (
    <div className="mt-4 animate-in fade-in-0 duration-200">
      {children}
    </div>
  );
};
