import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import SettingsSidebar, { type SettingsSection } from "./settings/SettingsSidebar";
import SettingsMinhaConta from "./settings/SettingsMinhaConta";
import SettingsUso from "./settings/SettingsUso";
import SettingsCobranca from "./settings/SettingsCobranca";
import SettingsPersonalizacao from "./settings/SettingsPersonalizacao";
import SettingsAvancado from "./settings/SettingsAvancado";

export default function Configuracoes() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("conta");
  const { logout } = useAuth();

  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: usageData } = trpc.settings.getUsage.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: false,
  });

  if (userLoading || settingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "conta":
        return (
          <SettingsMinhaConta
            user={user}
            planLabel={usageData?.planLabel}
            onLogout={logout}
          />
        );
      case "uso":
        return <SettingsUso usageData={usageData} />;
      case "cobranca":
        return (
          <SettingsCobranca
            planLabel={usageData?.planLabel}
            plan={usageData?.plan}
          />
        );
      case "personalizacao":
        return <SettingsPersonalizacao settings={settings} />;
      case "avancado":
        return <SettingsAvancado settings={settings} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          userName={user?.name}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-6">
            {renderSection()}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
