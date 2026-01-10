import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 🐛 DEBUG: Helper para logs com timestamp
const debugLog = (source: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString().split('T')[1];
  console.log(`[${timestamp}] 🔍 [${source}]`, message, data || '');
};
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LogOut, PanelLeft, Plus, Search, Settings, MessageSquare, Pin, MoreVertical,
  Pencil, Trash2, FolderOpen, Menu, ChevronLeft, ChevronRight, CheckSquare, X, SquarePen, GraduationCap
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { MemoriaJuridicaMenuItem } from './MemoriaJuridicaMenuItem';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-xl object-cover shadow"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">
                Please sign in to continue
              </p>
              {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations for sidebar
  const { data: conversations, refetch: refetchConversations } = trpc.david.listConversations.useQuery();
  const createConversationMutation = trpc.david.createConversation.useMutation({
    onSuccess: (data) => {
      debugLog('DashboardLayout - createConversation', 'SUCCESS', { newConversationId: data.id });
      debugLog('DashboardLayout - setLocation', 'Setting location', { newLocation: `/david?c=${data.id}` });
      setLocation(`/david?c=${data.id}`);
      refetchConversations();
    },
  });

  // Mutations for conversation actions
  const renameConversationMutation = trpc.david.renameConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      setRenameDialogOpen(false);
    },
  });

  const deleteConversationMutation = trpc.david.deleteConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      setLocation("/david");
    },
  });

  const togglePinMutation = trpc.david.togglePin.useMutation({
    onSuccess: () => refetchConversations(),
  });

  // States for rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingConvId, setRenamingConvId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // States for selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Selection mode functions
  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} conversa(s)?`)) return;

    for (const id of Array.from(selectedIds)) {
      await deleteConversationMutation.mutateAsync({ id });
    }
    exitSelectionMode();
    toast.success(`${selectedIds.size} conversa(s) excluída(s)`);
  };

  // Filter conversations by search
  const filteredConversations = conversations?.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const groupedConversations = filteredConversations?.reduce((acc, conv) => {
    const date = new Date(conv.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let group = "Mais antigas";
    if (diffDays === 0) group = "Hoje";
    else if (diffDays === 1) group = "Ontem";
    else if (diffDays <= 7) group = "Últimos 7 dias";
    else if (diffDays <= 30) group = "Últimos 30 dias";

    if (!acc[group]) acc[group] = [];
    acc[group]!.push(conv);
    return acc;
  }, {} as Record<string, NonNullable<typeof filteredConversations>>);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]); // setSidebarWidth é estável (função setter do useState)

  const handleNewChat = () => {
    debugLog('DashboardLayout - handleNewChat', 'Called');
    // Navega para a Home - a conversa será criada quando o usuário enviar uma mensagem
    debugLog('DashboardLayout - setLocation', 'Setting location', { newLocation: '/david' });
    setLocation("/david");
  };

  // Estado para ID da conversa atual - precisa reagir a mudanças na query string
  // O location do wouter não inclui query string, então usamos um estado + event listeners
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cParam = urlParams.get("c");
    return cParam ? parseInt(cParam, 10) : null;
  });

  // Ref para rastrear o último ID da URL (evita problemas de closure)
  const lastUrlIdRef = useRef<number | null>(currentConversationId);

  // Atualizar currentConversationId quando URL muda (via popstate ou clique na sidebar)
  useEffect(() => {
    debugLog('DashboardLayout - useEffect[location]', 'Effect triggered', { location });

    const updateConversationId = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const cParam = urlParams.get("c");
      const newId = cParam ? parseInt(cParam, 10) : null;

      debugLog('DashboardLayout - updateConversationId', 'URL read', {
        lastUrlId: lastUrlIdRef.current,
        newId,
        willUpdate: newId !== lastUrlIdRef.current
      });

      // Comparar com ref para evitar problemas de closure
      if (newId !== lastUrlIdRef.current) {
        lastUrlIdRef.current = newId;
        debugLog('DashboardLayout - setCurrentConversationId', 'Setting state', {
          from: 'updateConversationId',
          newValue: newId
        });
        setCurrentConversationId(newId);
      }
    };

    // Escutar popstate (navegação via botões voltar/avançar)
    window.addEventListener('popstate', updateConversationId);

    // Atualizar imediatamente quando location muda
    updateConversationId();

    return () => {
      window.removeEventListener('popstate', updateConversationId);
    };
  }, [location]); // Reagir a mudanças de location do wouter

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="p-3 space-y-3">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {isCollapsed ? (
                <div className="relative h-8 w-8 shrink-0 group">
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
                    alt="Logo"
                  />
                  <button
                    onClick={toggleSidebar}
                    className="absolute inset-0 flex items-center justify-center bg-accent rounded-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PanelLeft className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={APP_LOGO}
                      className="h-8 w-8 rounded-md object-cover ring-1 ring-border shrink-0"
                      alt="Logo"
                    />
                    <button
                      onClick={() => setLocation("/david")}
                      className="font-semibold tracking-tight truncate hover:text-primary transition-colors cursor-pointer"
                    >
                      {APP_TITLE}
                    </button>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>

            {/* Novo chat - estilo ChatGPT */}
            {!isCollapsed && (
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <SquarePen className="h-4 w-4" />
                <span className="text-sm">Novo chat</span>
              </button>
            )}

            {/* Buscar em chats */}
            {!isCollapsed && !isSearchOpen && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left text-muted-foreground"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Buscar em chats</span>
              </button>
            )}

            {/* Input de busca */}
            {!isCollapsed && isSearchOpen && (
              <div className="relative px-2">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Buscar em chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setIsSearchOpen(false);
                  }}
                  className="pl-9 h-9"
                />
              </div>
            )}

            {/* 🎓 Memória Jurídica - Novo item com badge */}
            {!isCollapsed && (
              <MemoriaJuridicaMenuItem />
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {isCollapsed ? (
              <SidebarMenu className="px-2 py-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleNewChat}
                    tooltip="Nova conversa"
                    className="h-10"
                  >
                    <Plus className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <>
                {/* Barra de ações do modo de seleção */}
                {isSelectionMode && (
                  <div className="flex items-center gap-2 px-3 py-3 mx-2 mb-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <button
                      onClick={exitSelectionMode}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-muted-foreground flex-1 text-center">
                      {selectedIds.size > 0 ? `${selectedIds.size} selecionada(s)` : "Selecione"}
                    </span>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.size === 0}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                )}
                <ScrollArea className="flex-1 px-2">
                  {groupedConversations && Object.entries(groupedConversations).map(([group, convs]) => (
                    <div key={group} className="mb-4 overflow-hidden">
                      <p className="text-xs text-muted-foreground font-medium px-2 py-1">
                        {group}
                      </p>
                      {convs?.map((conv) => (
                        <div
                          key={conv.id}
                          className={`group/item max-w-full flex items-center gap-1 px-2 py-2 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer ${isSelectionMode && selectedIds.has(conv.id) ? "bg-accent" :
                            currentConversationId === conv.id ? "bg-accent" : ""
                            }`}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelection(conv.id);
                            } else {
                              debugLog('DashboardLayout - conversationClick', 'User clicked conversation', { conversationId: conv.id });
                              debugLog('DashboardLayout - setLocation', 'Setting location', { newLocation: `/david?c=${conv.id}` });
                              setLocation(`/david?c=${conv.id}`);
                            }
                          }}
                        >
                          {/* Checkbox (modo seleção) ou Pin (se fixado) */}
                          {isSelectionMode ? (
                            <Checkbox
                              checked={selectedIds.has(conv.id)}
                              onCheckedChange={() => toggleSelection(conv.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                          ) : conv.isPinned ? (
                            <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : null}

                          {/* Título - trunca com ... */}
                          <span className="truncate flex-1 min-w-0">{conv.title}</span>

                          {/* Menu - aparece SÓ no hover deste item, esconde em modo seleção */}
                          {!isSelectionMode && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    enterSelectionMode();
                                  }}
                                >
                                  <CheckSquare className="h-4 w-4 mr-2" />
                                  Selecionar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePinMutation.mutate({ id: conv.id });
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" />
                                  {conv.isPinned ? "Desafixar" : "Fixar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingConvId(conv.id);
                                    setNewTitle(conv.title);
                                    setRenameDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Renomear
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Excluir esta conversa?")) {
                                      deleteConversationMutation.mutate({ id: conv.id });
                                    }
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </ScrollArea>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-2">
            {/* Settings */}
            {!isCollapsed && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => setLocation("/configuracoes")}
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
            )}

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isCollapsed && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/configuracoes")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="h-screen overflow-auto flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
      </SidebarInset>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Novo título..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim() && renamingConvId) {
                  renameConversationMutation.mutate({
                    conversationId: renamingConvId,
                    title: newTitle.trim(),
                  });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (newTitle.trim() && renamingConvId) {
                  renameConversationMutation.mutate({
                    conversationId: renamingConvId,
                    title: newTitle.trim(),
                  });
                }
              }}
              disabled={!newTitle.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
