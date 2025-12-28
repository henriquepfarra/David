import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Processos from "./pages/Processos";
import Configuracoes from "./pages/Configuracoes";
import Jurisprudencia from "./pages/Jurisprudencia";
import Minutas from "./pages/Minutas";
import ProcessoDetalhes from "./pages/ProcessoDetalhes";
import David from "./pages/David";
import DavidPrompts from "./pages/DavidPrompts";
import MemoriaDavid from "./pages/MemoriaDavid";
import LocalAuth from "./pages/LocalAuth";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={LocalAuth} />
      <Route path={"/"} component={Home} />
      <Route path={"/processos"} component={Processos} />
      <Route path={"/processo/:id"} component={ProcessoDetalhes} />
      <Route path={"/minutas"} component={Minutas} />
      <Route path={"/david"} component={David} />
      <Route path={"/david/prompts"} component={DavidPrompts} />
      <Route path={"/david/memoria"} component={MemoriaDavid} />
      <Route path={"/jurisprudencia"} component={Jurisprudencia} />
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
