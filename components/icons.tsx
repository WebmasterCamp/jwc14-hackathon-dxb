/**
 * Centralized icon registry — the ONLY place icons are mapped to meaning.
 *
 * STRICT RULE: zero Unicode emoji anywhere in the UI. Every icon used in the
 * app must come from this registry, which maps each semantic purpose to an
 * outline-style `lucide-react` component. Sizing convention (Tailwind):
 *   - inline with text: size-4 (16px)
 *   - buttons:          size-5 (20px)
 *   - feature cards:    size-6 (24px)
 *   - context cards:    size-7 / size-8 (28-32px)
 *
 * The spec's icon table arrived with empty component names, so each purpose
 * below is mapped to a verified lucide-react icon with the closest meaning.
 */
import {
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Brain,
  Bus,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  HeartPulse,
  History,
  Languages,
  ListChecks,
  MapPin,
  MessageSquareText,
  Mic,
  MoreHorizontal,
  Pencil,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Smile,
  Speech,
  Stethoscope,
  User,
  UtensilsCrossed,
  Volume2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const Icons = {
  // Core actions / status
  emergency: AlertTriangle,
  camera: Camera,
  micTts: Mic,
  playAudio: Volume2,
  history: History,
  confirm: CheckCircle2,
  edit: Pencil,
  close: X,
  back: ArrowLeft,
  next: ArrowRight,
  fast: Zap,

  // Everyday-context categories
  hospital: Stethoscope,
  grocery: ShoppingCart,
  restaurant: UtensilsCrossed,
  transport: Bus,
  school: GraduationCap,
  other: MoreHorizontal,

  // Emergency helpers
  police: ShieldAlert,
  lost: MapPin,
  pain: Ambulance,
  ambulance: Ambulance,

  // AI / translation pipeline
  ai: Brain,
  presetPhrases: MessageSquareText,

  // Face analytics (lip / eye / smile signals)
  smile: Smile,
  eyeOpen: Eye,
  eyeClosed: EyeOff,
  mouth: Speech,
  pain2: HeartPulse,

  // Chrome
  language: Languages,
  profile: User,
  settings: Settings,

  // Landing feature grid
  featureCamera: Camera,
  featureAi: Brain,
  featureMeanings: ListChecks,
  featureTts: Volume2,
  featureEmergency: AlertTriangle,
  featureHistory: History,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof Icons;
export type { LucideIcon };
