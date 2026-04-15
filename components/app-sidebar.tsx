'use client'

import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Award,
  Building2,
  LogOut,
  ChevronUp,
  User,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  ClipboardCheck,
} from 'lucide-react'
import type { Profile } from '@/lib/types'

interface AppSidebarProps {
  profile: Profile | null
  nomeFantasia?: string
}

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Clientes',
    url: '/dashboard/clientes',
    icon: Users,
  },
  {
    title: 'Orçamentos',
    url: '/dashboard/orcamentos',
    icon: DollarSign, 
  },
  {
    title: 'Ordens de Serviço',
    url: '/dashboard/ordens',
    icon: ClipboardList,
  },
  {
    title: 'Certificados',
    url: '/dashboard/certificados',
    icon: Award,
  },
  {
    title: 'Laudos Técnicos',
    url: '/dashboard/laudos',
    icon: ClipboardCheck,
  },
  {
    title: 'Contratos',
    url: '/dashboard/contratos',
    icon: FileText,
  },
  {
    title: 'Financeiro',
    url: '/dashboard/financeiro',
    icon: DollarSign,
  },
  {
    title: 'Relatórios',
    url: '/dashboard/relatorios/mensal',
    icon: BarChart3,
  },
  {
    title: 'Configurações',
    url: '/dashboard/configuracoes',
    icon: Settings,
  },
]

export function AppSidebar({ profile, nomeFantasia }: AppSidebarProps) {
  const pathname = usePathname()

  const handleLogout = () => {
    logoutAction()
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
            <Building2 className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-sidebar-foreground truncate max-w-[160px]">{nomeFantasia || 'Sistema de Gestão'}</h2>
            <p className="text-xs text-sidebar-foreground/70">Controle de Pragas</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
                <User className="h-4 w-4 text-sidebar-accent-foreground" />
              </div>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {profile?.nome_completo || 'Usuário'}
                </span>
                <span className="text-xs text-sidebar-foreground/70 capitalize">
                  {profile?.role || 'operador'}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}