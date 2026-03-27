import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Database,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  MessagesSquare,
  Mic,
  Microscope,
  Paperclip,
  Plus,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  SignalHigh,
  Terminal,
  ThumbsUp,
  TrendingDown,
  User,
  X,
  Zap,
  ChevronDown,
  MoreHorizontal,
  Phone,
  Video,
  MoreVertical,
  Send,
  Ban,
  LockOpen,
  BrainCircuit,
  Sparkles,
  Info,
  Printer,
  Receipt,
  FileText,
  Pencil
} from 'lucide-react';
import type { ComponentType } from 'react';

type AppIconName =
  | 'workspace_premium'
  | 'dashboard'
  | 'school'
  | 'science'
  | 'biotech'
  | 'menu_book'
  | 'forum'
  | 'settings_input_component'
  | 'business_center'
  | 'help'
  | 'logout'
  | 'notifications'
  | 'settings'
  | 'person'
  | 'lock'
  | 'add'
  | 'schedule'
  | 'stairs'
  | 'arrow_forward'
  | 'history'
  | 'settings_voice'
  | 'content_copy'
  | 'thumb_up'
  | 'attach_file'
  | 'arrow_upward'
  | 'search'
  | 'microscope'
  | 'add_circle'
  | 'integration_instructions'
  | 'data_object'
  | 'bolt'
  | 'shield_check'
  | 'close'
  | 'check_circle'
  | 'trending_down'
  | 'expand_more'
  | 'more_horiz'
  | 'call'
  | 'videocam'
  | 'more_vert'
  | 'send'
  // for new sidebar items:
  | 'wine_bar'
  | 'bar_chart'
  | 'person_outline'
  | 'block'
  | 'lock_open'
  | 'psychology'
  | 'auto_awesome'
  | 'info'
  | 'print'
  | 'receipt'
  | 'description'
  | 'edit'
  | 'admin_panel_settings';

const ICONS: Record<AppIconName, ComponentType<any>> = {
  workspace_premium: BadgeCheck,
  dashboard: LayoutDashboard,
  school: GraduationCap,
  science: FlaskConical,
  biotech: Microscope,
  menu_book: BookOpen,
  forum: MessagesSquare,
  settings_input_component: Cpu,
  business_center: BriefcaseBusiness,
  help: HelpCircle,
  logout: LogOut,
  notifications: Bell,
  settings: Settings,
  person: User,
  lock: Lock,
  add: Plus,
  schedule: Clock,
  stairs: SignalHigh,
  arrow_forward: ArrowRight,
  history: History,
  settings_voice: Mic,
  content_copy: Copy,
  thumb_up: ThumbsUp,
  attach_file: Paperclip,
  arrow_upward: ArrowUp,
  search: Search,
  microscope: Microscope,
  add_circle: PlusCircle,
  integration_instructions: Terminal,
  data_object: Database,
  bolt: Zap,
  shield_check: ShieldCheck,
  close: X,
  check_circle: CheckCircle2,
  trending_down: TrendingDown,
  expand_more: ChevronDown,
  more_horiz: MoreHorizontal,
  call: Phone,
  videocam: Video,
  more_vert: MoreVertical,
  send: Send,
  wine_bar: FlaskConical, // fallback
  bar_chart: SignalHigh, // fallback
  person_outline: User, // fallback
  block: Ban,
  lock_open: LockOpen,
  psychology: BrainCircuit,
  auto_awesome: Sparkles,
  info: Info,
  print: Printer,
  receipt: Receipt,
  description: FileText,
  edit: Pencil,
  admin_panel_settings: ShieldCheck,
};

export default function AppIcon({
  name,
  className,
  size = 20,
  strokeWidth = 1.8,
  'aria-label': ariaLabel,
}: {
  name: AppIconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  'aria-label'?: string;
}) {
  const Icon = ICONS[name] ?? MessageSquare;
  return (
    <Icon
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
