import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Info } from "lucide-react";

interface UsageData {
  plan: string;
  role: string;
  planLabel: string;
  creditsUsed: number;
  creditsTotal: number;
  percentage: number;
  requestCount: number;
  dailyRequests?: number;
  requestsPerMinute?: number;
  allowedProviders?: string[];
  date: string;
}

interface SettingsUsoProps {
  usageData: UsageData | null | undefined;
}

const providerNames: Record<string, string> = {
  google: "Google (Gemini)",
  openai: "OpenAI (GPT)",
  anthropic: "Anthropic (Claude)",
  groq: "Groq",
  deepseek: "DeepSeek",
};

export default function SettingsUso({ usageData }: SettingsUsoProps) {
  const isAdmin = usageData?.role === "admin";
  const isAvancado = usageData?.plan === "avancado";
  const isUnlimited = isAdmin || isAvancado;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Uso</h2>
        <p className="text-muted-foreground mt-1">Acompanhe seu consumo de créditos</p>
      </div>

      {/* Créditos de Hoje */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Créditos de Hoje
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {usageData?.planLabel || "—"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!usageData ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : isUnlimited ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {usageData.creditsUsed} créditos usados hoje
              </p>
              <Badge variant="outline" className="text-xs">Ilimitado</Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {usageData.creditsUsed} de {usageData.creditsTotal} créditos
                </span>
                <span className="font-medium">{usageData.percentage}%</span>
              </div>
              <Progress value={usageData.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {usageData.requestCount} interações hoje
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes do Plano */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Detalhes do Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!usageData ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid gap-3">
              <Row
                label="Limite diário"
                value={isUnlimited ? "Ilimitado" : `${usageData.creditsTotal} créditos`}
              />
              <Row label="Provedores disponíveis">
                <div className="flex flex-wrap gap-1">
                  {(usageData.allowedProviders || []).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {providerNames[p] || p}
                    </Badge>
                  ))}
                </div>
              </Row>
              <Row label="Renovação" value="Diariamente à meia-noite" />
              <Row label="Última atualização" value={usageData.date || "—"} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {children || <span className="text-sm font-medium text-right">{value}</span>}
    </div>
  );
}
