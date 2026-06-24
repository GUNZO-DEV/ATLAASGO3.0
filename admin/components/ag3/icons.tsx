// AtlaasGo 3.0 — icon set mapped to lucide-react-native, re-exported under the
// prototype's I-names so screens read like screen-home2/restaurant2/etc.
//
// lucide-react-native icons take { size, color, strokeWidth, fill, ... } and
// render react-native-svg under the hood. Defaults below match the prototype's
// 1.9px round-cap line weight; `color` inherits via the `color` prop (callers
// pass color={theme.colors.fg}), NOT currentColor.
import {
  MapPin,
  ChevronDown,
  Search,
  Snowflake,
  Zap,
  Clock,
  Users,
  Bell,
  Flame,
  Star,
  SlidersHorizontal,
  Home,
  ShoppingBag,
  User,
  X,
  Check,
  Heart,
  Phone,
  MessageCircle,
  Wallet,
  Gift,
  Receipt,
  Truck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Globe,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react-native';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

export type AgIcon = LucideIcon;

/* ── prototype I-names → lucide ───────────────────────────────────────────── */
export const IPin = MapPin;
export const IChevD = ChevronDown;
export const IChevR = ChevronRight;
export const IChevL = ChevronLeft;
export const ISearch = Search;
export const ISnow = Snowflake;
export const IBolt = Zap;
export const IClock = Clock;
export const IGroup = Users;
export const IBell = Bell;
export const IFire = Flame;
export const IStar = Star;
export const ISlider = SlidersHorizontal;
export const IHome = Home;
export const IBag = ShoppingBag;
export const IUser = User;
export const IClose = X;
export const ICheck = Check;
export const IHeart = Heart;
export const IPhone = Phone;
export const IMsg = MessageCircle;
export const IWallet = Wallet;
export const IGift = Gift;
export const IReceipt = Receipt;
export const ITruck = Truck;
export const IPlus = Plus;
export const IBack = ChevronLeft;
export const IGlobe = Globe;
export const ISun = Sun;
export const IMoon = Moon;
