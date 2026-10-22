import {
  ArrowLeftRight,
  Coins,
  CreditCard,
  FileText,
  Globe,
  House,
  Landmark,
  MapPin,
  MessageSquareHeart,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Opens only once the registration is verified (permanent credentials). */
  needsVerification: boolean;
}

export const MAIN_MENU: readonly MenuItem[] = [
  { id: 'home', label: 'Нүүр', icon: House, needsVerification: false },
  { id: 'transfer', label: 'Шилжүүлэг', icon: ArrowLeftRight, needsVerification: true },
  { id: 'foreign', label: 'Гадаад шилжүүлэг', icon: Globe, needsVerification: true },
  { id: 'payment', label: 'Төлбөр', icon: Receipt, needsVerification: true },
  { id: 'invoice', label: 'Нэхэмжлэх', icon: FileText, needsVerification: true },
  { id: 'merchant', label: 'Мерчант', icon: Store, needsVerification: true },
  { id: 'fx', label: 'Валют арилжаа', icon: Coins, needsVerification: true },
  { id: 'savings', label: 'Хадгаламж', icon: PiggyBank, needsVerification: true },
  { id: 'loan', label: 'Зээл', icon: Landmark, needsVerification: true },
  { id: 'bid', label: 'Тендерийн баталгаа', icon: ShieldCheck, needsVerification: true },
  { id: 'esp', label: 'Хуримтлалын хөтөлбөр', icon: Wallet, needsVerification: true },
  { id: 'card', label: 'Карт', icon: CreditCard, needsVerification: true },
];

export const FOR_YOU_MENU: readonly MenuItem[] = [
  { id: 'updates', label: 'Шинэчлэлт', icon: Sparkles, needsVerification: false },
];

export const FEEDBACK_ITEM: MenuItem = { id: 'feedback', label: 'Санал хүсэлт', icon: MessageSquareHeart, needsVerification: false };

export interface RegistrationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Filled during digital onboarding already. */
  filledAtOnboarding: boolean;
}

/** The five sections DAN can fill automatically (Figma: "Автоматаар бөглөгдөх мэдээллүүд"). */
export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [
  { id: 'business', label: 'Бизнесийн мэдээлэл', icon: Landmark, filledAtOnboarding: false },
  { id: 'personal', label: 'Хувийн мэдээлэл', icon: User, filledAtOnboarding: true },
  { id: 'address', label: 'Хаягийн мэдээлэл', icon: MapPin, filledAtOnboarding: false },
  { id: 'owners', label: 'Хувьцаа эзэмшигч, эцсийн өмчлөгчийн мэдээлэл', icon: Users, filledAtOnboarding: false },
  { id: 'director', label: 'Гүйцэтгэх захирлын мэдээлэл', icon: UserCheck, filledAtOnboarding: false },
];

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Өглөөний мэнд';
  if (h < 18) return 'Өдрийн мэнд';
  return 'Оройн мэнд';
}
