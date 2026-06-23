// AtlaasGo ADMIN — icon set mapped to lucide-react-native, re-exported under
// admin A-names (mirrors the ag3 I-name convention). Same line weight + props
// contract as ag3/icons.tsx: { size, color, strokeWidth, fill }. Color inherits
// via the `color` prop (callers pass color={theme.colors.fg}), NOT currentColor.
import {
  Store,
  Building2,
  Bike,
  Coins,
  Shield,
  BarChart3,
  UserCheck,
  Settings,
  Tag,
  LayoutDashboard,
  MoreHorizontal,
  MapPin,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Check,
  Pause,
  Play,
  CircleDollarSign,
  Banknote,
  Wallet,
  Activity,
  Clock,
  Pill,
  ShoppingCart,
  Utensils,
  Leaf,
  Snowflake,
  Zap,
  AlertCircle,
  CheckCircle2,
  Bell,
  Users,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native';

export type AdmIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

export type AdmIcon = LucideIcon;

/* ── nav / sections ───────────────────────────────────────────────────────── */
export const AOverview = LayoutDashboard;
export const AApprovals = UserCheck;
export const AMerchants = Store;
export const ACities = Building2;
export const AMore = MoreHorizontal;
export const ASettings = Settings;
export const AStats = BarChart3;
export const AShield = Shield;

/* ── domain ───────────────────────────────────────────────────────────────── */
export const ARider = Bike;
export const APayout = Coins;
export const ABank = Banknote;
export const AMoney = CircleDollarSign;
export const AWallet = Wallet;
export const APromo = Tag;
export const AActivity = Activity;
export const AClock = Clock;
export const APin = MapPin;

/* ── verticals ────────────────────────────────────────────────────────────── */
export const AFood = Utensils;
export const AGrocery = ShoppingCart;
export const APharmacy = Pill;
export const ALeaf = Leaf;

/* ── status / trend ───────────────────────────────────────────────────────── */
export const ATrendUp = TrendingUp;
export const ATrendDown = TrendingDown;
export const AOk = CheckCircle2;
export const AWarn = AlertCircle;
export const ASnow = Snowflake;
export const ABolt = Zap;
export const ABell = Bell;
export const AUsers = Users;

/* ── actions ──────────────────────────────────────────────────────────────── */
export const APlus = Plus;
export const AClose = X;
export const ACheck = Check;
export const APause = Pause;
export const APlay = Play;
export const ATrash = Trash2;
export const AEdit = Pencil;
export const ASearch = Search;
export const ARefresh = RefreshCw;
export const AChevR = ChevronRight;
export const AChevD = ChevronDown;
