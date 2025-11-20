import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import BaseConhecimento from "./pages/BaseConhecimento";
import Processos from "./pages/Processos";
import Ghostwriter from "./pages/Ghostwriter";
import Configuracoes from "./pages/Configuracoes";
import Jurisprudencia from "./pages/Jurisprudencia";
import Minutas from "./pages/Minutas";
import ProcessoDetalhes from "./pages/ProcessoDetalhes";
import David from "./pages/David";
import DavidConfig from "./pages/DavidConfig";
import DavidPrompts from "./pages/DavidPrompts";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/processos"} component={Processos} />
      <Route path={"/processo/:id"} component={ProcessoDetalhes} />
      <Route path={"/minutas"} component={Minutas} />
      <Route path={"/ghostwriter"} component={Ghostwriter} />
      <Route path={"/david"} component={David} />
      <Route path={"/david/config"} component={DavidConfig} />
      <Route path={"/david/prompts"} component={DavidPrompts} />
      <Route path={"/jurisprudencia"} component={Jurisprudencia} />
      <Route path={"/base-conhecimento"} component={BaseConhecimento} />
      <Route path={"/configuracoes"} component={Configuracoes} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
