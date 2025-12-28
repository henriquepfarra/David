import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function LocalAuth() {
    const [, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);

    const loginMutation = trpc.auth.localLogin.useMutation({
        onSuccess: () => {
            // Force a hard reload to ensure auth state is picked up by all hooks
            window.location.href = "/";
        },
        onError: (error) => {
            console.error("Login failed:", error);
            setIsLoading(false);
        }
    });

    const handleLogin = async () => {
        console.log("Tentando login local...");
        setIsLoading(true);
        loginMutation.mutate();
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">DAVID</CardTitle>
                    <CardDescription>
                        Ambiente de Desenvolvimento Local
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="bg-amber-50 text-amber-900 p-4 rounded-md text-sm mb-2 border border-amber-200">
                        Este aplicativo está rodando em modo local. A autenticação externa foi desativada.
                    </div>

                    <Button
                        size="lg"
                        className="w-full"
                        onClick={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            "Entrar como Desenvolvedor"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
