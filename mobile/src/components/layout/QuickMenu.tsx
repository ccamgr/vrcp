import { MenuItem } from "./type";

interface Props {
  items: MenuItem[];
  onOpen?: () => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  children?: React.ReactNode;
}

const WithQuickMenu = ({ items, onOpen, open, setOpen, children }: Props) => {
  return <>{children}</>;
};

export default WithQuickMenu;
