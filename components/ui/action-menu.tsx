'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Eye, FileText, Download, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ActionMenuProps {
  children: React.ReactNode
  items: {
    label: string
    icon?: React.ReactNode
    onClick?: () => void
    href?: string
    variant?: 'default' | 'destructive'
  }[]
}

export function ActionMenu({ children, items }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            {item.href ? (
              <Link href={item.href}>
                <DropdownMenuItem 
                  className={item.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                >
                  {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                  {item.label}
                </DropdownMenuItem>
              </Link>
            ) : (
              <DropdownMenuItem 
                onClick={item.onClick}
                className={item.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
              >
                {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                {item.label}
              </DropdownMenuItem>
            )}
            {index < items.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
