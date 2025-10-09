import { SupportedIconNames } from "../view/icon-components/utils";


export interface QuickMenuItem {
  icon?: SupportedIconNames;
  title: string;
  onPress: () => void;
}

interface Props {
  items: QuickMenuItem[];
  onOpen?: () => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const QuickMenu = ({ items, onOpen, open, setOpen }: Props) => {
  return (
    <></>
  )
}

export default QuickMenu;