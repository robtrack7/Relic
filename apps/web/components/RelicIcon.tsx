import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Crown,
  Download,
  FileText,
  Flame,
  GitBranch,
  Home,
  Layers,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";

const ICONS = {
  home: Home,
  threads: GitBranch,
  library: BookOpen,
  prepare: Layers,
  sessions: Calendar,
  review: ClipboardList,
  export: Download,
  settings: Settings,
  search: Search,
  bell: Bell,
  spark: Sparkles,
  send: Send,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  plus: Plus,
  crown: Crown,
  flame: Flame,
  clock: Clock,
  target: Target,
  file: FileText,
  users: Users,
  check: CheckCircle2,
  circle: Circle,
  alert: AlertTriangle,
  x: X,
} as const;

export type IconName = keyof typeof ICONS;

type RelicIconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function RelicIcon({ name, size = 14, className, strokeWidth = 1.6 }: RelicIconProps) {
  const Icon = ICONS[name];
  return Icon ? <Icon size={size} strokeWidth={strokeWidth} className={className} /> : null;
}
