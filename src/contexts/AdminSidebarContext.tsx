import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AdminSidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export const AdminSidebarProvider = ({ 
  children, 
  defaultOpen = false
}: { 
  children: ReactNode; 
  defaultOpen?: boolean;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(defaultOpen);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const collapseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <AdminSidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, collapseSidebar }}>
      {children}
    </AdminSidebarContext.Provider>
  );
};

export const useAdminSidebar = () => {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar must be used within an AdminSidebarProvider");
  }
  return context;
};
