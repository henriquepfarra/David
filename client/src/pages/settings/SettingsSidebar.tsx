import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Zap, CreditCard, Brain, Key, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";
import { useState } from "react";

export type SettingsSection = "conta" | "uso" | "cobranca" | "personalizacao" | "avancado";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { id: "conta", label: "Minha Conta", icon: User },
  { id: "uso", label: "Uso", icon: Zap },
  { id: "cobranca", label: "Cobrança", icon: CreditCard },
];

const advancedNav: NavItem[] = [
  { id: "personalizacao", label: "Personalização", icon: Brain },
  { id: "avancado", label: "Avançado", icon: Key },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  userName?: string | null;
}

function NavItems({ items, activeSection, onSectionChange }: {
  items: NavItem[];
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            onClick={() => onSectionChange(item.id)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function SidebarContent({ activeSection, onSectionChange, userName }: SettingsSidebarProps) {
  return (
    <div className="flex flex-col h-full py-6 px-3">
      {/* User info */}
      <div className="flex items-center gap-3 px-3 mb-6">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{userName || "Usuário"}</p>
          <p className="text-xs text-muted-foreground">Configurações</p>
        </div>
      </div>

      <NavItems items={mainNav} activeSection={activeSection} onSectionChange={onSectionChange} />

      <Separator className="my-4" />

      <NavItems items={advancedNav} activeSection={activeSection} onSectionChange={onSectionChange} />
    </div>
  );
}

export default function SettingsSidebar(props: SettingsSidebarProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <div className="flex items-center p-2 border-b lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarContent
                {...props}
                onSectionChange={(section) => {
                  props.onSectionChange(section);
                  setOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  return (
    <nav className="w-60 border-r shrink-0 hidden lg:block">
      <SidebarContent {...props} />
    </nav>
  );
}
