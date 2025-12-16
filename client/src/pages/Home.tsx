import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, FolderOpen, LayoutDashboard, Search, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } as const }
};

export default function Home() {
  const features = [
    {
      icon: FolderOpen,
      title: "Análise de Autos",
      description: "Importe processos para leitura profunda. O sistema classifica peças e extrai dados automaticamente.",
      href: "/processos",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "hover:border-blue-200 dark:hover:border-blue-800",
    },
    {
      icon: Sparkles,
      title: "DAVID - O Assistente Virtual",
      description: "IA treinada em Direito Brasileiro e nas peculiaridades do seu gabinete. Gera minutas personalizadas.",
      href: "/david",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "hover:border-purple-200 dark:hover:border-purple-800",
    },
    {
      icon: BookOpen,
      title: "Jurisprudência",
      description: "Gerencie sua base de conhecimento. Personalize teses e modelos para o seu gabinete.",
      href: "/base-conhecimento",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "hover:border-emerald-200 dark:hover:border-emerald-800",
    },
  ];

  const steps = [
    {
      id: "01",
      title: "Importação",
      desc: "Cadastre o número do processo ou faça upload dos autos em PDF.",
      icon: FolderOpen
    },
    {
      id: "02",
      title: "Leitura IA",
      desc: "O DAVID lê cada página, identifica peças e resume os fatos relevantes.",
      icon: Search
    },
    {
      id: "03",
      title: "Minuta",
      desc: "Solicite a decisão desejada e receba uma minuta pronta para revisão.",
      icon: CheckCircle2
    }
  ];

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-200/20 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px]" />
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/20 shadow-sm text-foreground/80 ring-1 ring-black/5 dark:ring-white/10">
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>Gabinete Virtual Inteligente</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl leading-[1.1]">
              Celeridade e Precisão, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Para o Judiciário
              </span>
            </h1>

            <p className="mt-6 text-xl leading-8 text-muted-foreground/90 max-w-2xl mx-auto font-light">
              Transforme a rotina do gabinete. Da triagem automática à minuta fundamentada,
              o DAVID atua como seu assistente sênior, permitindo foco total na decisão.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="xl" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                <Link href="/david">
                  Acessar Assistente <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all">
                <Link href="/base-conhecimento">
                  Configurar Modelos
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Feature Cards - Glassmorphism */}
        <div className="px-6 pb-20 max-w-7xl mx-auto w-full">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-6 md:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.href} variants={item}>
                  <Link href={feature.href}>
                    <div className={`group relative h-full p-8 rounded-3xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${feature.border}`}>
                      <div className={`inline-flex rounded-2xl p-4 ${feature.bg} ${feature.color} mb-6 ring-1 ring-black/5 dark:ring-white/5`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-base">
                        {feature.description}
                      </p>

                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* New "How it Works" Section */}
        <div className="bg-muted/30 dark:bg-muted/10 border-t border-border/40 py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Fluxo de Trabalho Otimizado</h2>
              <p className="text-lg text-muted-foreground">Como o DAVID acelera a produtividade do seu gabinete</p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent border-t border-dashed border-muted-foreground/30" />

              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 rounded-3xl bg-background shadow-lg border border-border flex items-center justify-center mb-6 z-10 rotate-3 transition-transform hover:rotate-0 duration-300">
                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
                      {step.id}
                    </span>
                    <step.icon className="h-10 w-10 text-primary opacity-80" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground max-w-[280px] leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
