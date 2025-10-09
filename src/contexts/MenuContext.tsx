import AsyncStorage from "expo-sqlite/kv-store";
import React, { createContext, useContext, useEffect, useState } from "react";

// provide menu state globally

interface MenuContextType {
  openMenu: boolean; // use in GenericScreen, HeaderMenuButton
  setOpenMenu: React.Dispatch<React.SetStateAction<boolean>>;
}
const Context = createContext<MenuContextType | undefined>(undefined);

const useMenu = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useMenu must be used within a MenuProvider");
  return context;
} 

const MenuProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [openMenu, setOpenMenu] = useState(false);
  return (
    <Context.Provider value={{
      openMenu,
      setOpenMenu
    }}>
      {children}
    </Context.Provider>
  );
}

export { MenuProvider, useMenu };