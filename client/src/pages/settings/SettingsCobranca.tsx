import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles } from "lucide-react";

interface SettingsCobrancaProps {
  planLabel?: string;
  plan?: string;
}

export default function SettingsCobranca({ planLabel, plan }: SettingsCobrancaProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cobrança</h2>
        <p className="text-muted-foreground mt-1">Gerencie seu plano e pagamentos</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{planLabel || plan || "Tester"}</Badge>
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                Ativo
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {plan === "tester" && "Você está no plano beta gratuito com 250 créditos diários e acesso a todos os provedores de IA."}
            {plan === "avancado" && "Você está usando sua própria chave de API com uso ilimitado."}
            {plan === "pro" && "Plano profissional com 2.000 créditos diários."}
            {(!plan || plan === "free") && "Plano gratuito com 100 créditos diários."}
          </p>

          <Separator />

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Planos pagos em breve</p>
              <p className="text-xs text-muted-foreground">
                Estamos preparando planos profissionais com mais créditos e recursos exclusivos.
              </p>
            </div>
            <Button size="sm" disabled>
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
