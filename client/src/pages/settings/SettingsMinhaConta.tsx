import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SettingsMinhaContaProps {
  user: {
    name?: string | null;
    email?: string | null;
    loginMethod?: string | null;
    role?: string | null;
    plan?: string | null;
    createdAt?: Date | string | null;
    lastSignedIn?: Date | string | null;
  } | null | undefined;
  planLabel?: string;
  onLogout: () => void;
}

export default function SettingsMinhaConta({ user, planLabel, onLogout }: SettingsMinhaContaProps) {
  if (!user) return null;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatRelative = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Minha Conta</h2>
        <p className="text-muted-foreground mt-1">Informações da sua conta e sessão</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Row label="Nome" value={user.name || "—"} />
            <Row label="Email" value={user.email || "—"} />
            <Row label="Login via">
              <Badge variant="secondary" className="text-xs">
                {user.loginMethod === "google" ? "Google" : user.loginMethod || "—"}
              </Badge>
            </Row>
            <Row label="Plano">
              <Badge variant="outline" className="text-xs">
                {planLabel || user.plan || "tester"}
              </Badge>
            </Row>
            <Row label="Membro desde" value={formatDate(user.createdAt)} />
            <Row label="Último acesso" value={formatRelative(user.lastSignedIn)} />
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children || <span className="text-sm font-medium">{value}</span>}
    </div>
  );
}
