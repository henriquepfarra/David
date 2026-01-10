/**
 * Página: Memória Jurídica (Intelligence)
 * 
 * Sistema de Active Learning - Quality Gate para teses aprendidas
 * 
 * Estrutura:
 * - Tab 1: Caixa de Entrada (Pending Theses)
 * - Tab 2: Biblioteca (Active Theses + Stats)
 */

export default function IntelligencePage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-bold">🎓 Memória Jurídica</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Sistema de aprendizado contínuo - Teses e padrões do gabinete
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-lg text-center space-y-4">
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-xl font-semibold">Página em Construção</h2>
                    <p className="text-muted-foreground">
                        A interface de curadoria de teses está sendo desenvolvida.
                    </p>
                    <div className="bg-muted rounded-lg p-4 text-sm text-left mt-6">
                        <p className="font-semibold mb-2">✅ Backend já implementado:</p>
                        <ul className="space-y-1 text-muted-foreground">
                            <li>• Sistema de extração dual (tese + estilo)</li>
                            <li>• Quality Gate (PENDING_REVIEW → ACTIVE)</li>
                            <li>• 8 endpoints TRPC prontos</li>
                            <li>• Integração com Motor B completa</li>
                        </ul>
                        <p className="font-semibold mt-4 mb-2">🚧 Em desenvolvimento:</p>
                        <ul className="space-y-1 text-muted-foreground">
                            <li>• Interface de aprovação de teses</li>
                            <li>• Biblioteca de conhecimento</li>
                            <li>• Dashboard de métricas</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
