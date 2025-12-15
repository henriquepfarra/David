```
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, FolderOpen, Search, Sparkles, Brain, MoveRight } from "lucide-react";
import { Link } from "wouter";
import { motion, Variants, AnimatePresence } from "framer-motion";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
};

export default function HomeCompact() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 3);
    }, 2000); 
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: FolderOpen,
      title: "Análise de Autos",
      description: "Leitura profunda e extração de dados.",
      href: "/processos",
      // Blue Theme
      color: "text-blue-600 dark:text-blue-400",
      bgIcon: "bg-blue-100 dark:bg-blue-900/40",
      cardBorder: "border-blue-200 dark:border-blue-800",
      cardBg: "bg-blue-50/50 dark:bg-blue-950/10",
      hoverShadow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/20",
    },
    {
      icon: Sparkles,
      title: "DAVID Virtual",
      description: "IA treinada no estilo do seu gabinete.",
      href: "/david",
      // Purple Theme
      color: "text-purple-600 dark:text-purple-400",
      bgIcon: "bg-purple-100 dark:bg-purple-900/40",
      cardBorder: "border-purple-200 dark:border-purple-800",
      cardBg: "bg-purple-50/50 dark:bg-purple-950/10",
      hoverShadow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/20",
    },
  ];

  const knowledgeBase = {
      icon: Brain,
      title: "Base de Conhecimento",
      description: "Gestão de modelos, teses e configurações do cérebro.",
      href: "/base-conhecimento",
      // Green Theme
      color: "text-emerald-600 dark:text-emerald-400",
      bgIcon: "bg-emerald-100 dark:bg-emerald-900/40",
      cardBorder: "border-emerald-200 dark:border-emerald-800",
      cardBg: "bg-emerald-50/50 dark:bg-emerald-950/10",
      hoverShadow: "hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/20",
  };

  const steps = [
    { id: 0, title: "Importar", icon: FolderOpen },
    { id: 1, title: "Analisar", icon: Search },
    { id: 2, title: "Minutar", icon: CheckCircle2 }
  ];

  // Curry arrow SVG to avoid repetitive code
  const ArrowConnector = ({ active }: { active: boolean }) => (
    <div className={`hidden lg:flex items - center justify - center px - 2 transition - opacity duration - 500 ${ active ? 'opacity-100' : 'opacity-20' } `}>
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 6C10 6 10 1 19 1C28 1 28 11 39 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"/>
            <path d="M35 11L39 11L37.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
        </svg>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="relative h-[calc(100vh-3rem)] overflow-hidden flex flex-col md:flex-row gap-6 p-6">
        {/* Background - Subtle */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-50">
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-[100px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-100/30 dark:bg-purple-900/10 blur-[100px]" />
        </div>

        {/* LEFT COLUMN: Hero & Actions (40%) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center space-y-10 p-8 md:p-12 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/20 backdrop-blur-md shadow-sm relative"
        >
          <div className="space-y-6 z-10">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary ring-1 ring-primary/20 w-fit">
              <Sparkles className="h-3 w-3" />
              <span>Gabinete Virtual</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Celeridade <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                para o Judiciário
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground/90 font-light max-w-md">
              Transforme a rotina do gabinete. Da triagem automática à minuta fundamentada, 
              o DAVID atua como seu assistente sênior.
            </p>
          </div>

          <div className="flex items-center gap-4 z-10 w-full flex-wrap">
            <Button asChild size="xl" className="rounded-full shadow-lg hover:shadow-primary/25 h-12 text-base px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/david">
                Acessar Assistente <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="rounded-full h-12 text-base px-6 border-2 hover:bg-muted/50">
              <Link href="/base-conhecimento">
                Configurar Cérebro
              </Link>
            </Button>
          </div>

          {/* Animated Flow Indicator */}
          <div className="pt-10 border-t border-border/50 w-full z-10">
             <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Fluxo de Trabalho</p>
             <div className="flex items-center justify-start gap-2">
                {steps.map((step, i) => {
                  const isActive = i === activeStep;
                  const isPast = i < activeStep;
                  
                  return (
                    <div key={step.id} className="flex items-center">
                        <motion.div 
                            className={`flex items - center gap - 3 px - 4 py - 2 rounded - xl border transition - all duration - 500
                                ${ isActive ? 'bg-primary/10 border-primary/20 shadow-sm shadow-primary/10' : 'bg-transparent border-transparent opacity-50' }
`}
                        >
                            <div className={`w - 8 h - 8 rounded - full flex items - center justify - center transition - colors duration - 500 ${ isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground' } `}>
                                <step.icon className="h-4 w-4" />
                            </div>
                            <span className={`font - medium text - sm transition - colors duration - 500 ${ isActive ? 'text-primary' : 'text-muted-foreground' } `}>{step.title}</span>
                        </motion.div>
                        
                        {i < steps.length - 1 && (
                            <ArrowConnector active={isActive || (activeStep > i)} />
                        )}
                    </div>
                  );
                })}
             </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Bento Grid (60%) */}
        <div className="hidden md:flex flex-[1.4] h-full overflow-hidden flex-col justify-center">
           <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-rows-3 gap-4 h-full max-h-[600px]"
          >
            {/* Top Row: Main Workflow Actions */}
            <motion.div variants={item} className="row-span-2 grid grid-cols-2 gap-4">
               {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link key={feature.href} href={feature.href} className="flex-1">
                      <div className={`h - full p - 6 lg: p - 8 rounded - 3xl ${ feature.cardBg } backdrop - blur - xl border ${ feature.cardBorder } hover: shadow - xl ${ feature.hoverShadow } transition - all duration - 300 group flex flex - col justify - between cursor - pointer`}>
                        <div className={`w - 12 h - 12 rounded - 2xl ${ feature.bgIcon } ${ feature.color } flex items - center justify - center mb - 4 ring - 1 ring - inset ring - black / 5`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="p-2 rounded-full bg-background/50 border shadow-sm text-foreground/70">
                             <ChevronRight className="h-4 w-4" />
                           </div>
                        </div>
                      </div>
                    </Link>
                  );
               })}
            </motion.div>

            {/* Bottom Row: Knowledge Base (Full Width) */}
            <motion.div variants={item} className="row-span-1">
               <Link href={knowledgeBase.href}>
                 <div className={`h - full w - full p - 6 rounded - 3xl ${ knowledgeBase.cardBg } backdrop - blur - xl border ${ knowledgeBase.cardBorder } hover: shadow - lg ${ knowledgeBase.hoverShadow } transition - all flex items - center justify - between cursor - pointer group px - 8`}>
                    <div className="flex items-center gap-6">
                       <div className={`w - 12 h - 12 rounded - 2xl ${ knowledgeBase.bgIcon } ${ knowledgeBase.color } flex items - center justify - center ring - 1 ring - inset ring - black / 5`}>
                         <knowledgeBase.icon className="h-6 w-6" />
                       </div>
                       <div>
                         <h3 className="text-lg font-bold text-foreground">{knowledgeBase.title}</h3>
                         <p className="text-sm text-muted-foreground">{knowledgeBase.description}</p>
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                       Acessar Base <ArrowRight className="h-4 w-4" />
                    </div>
                 </div>
               </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
```
