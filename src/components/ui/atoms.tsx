'use client'

import React from 'react'
export { Chip, Avatar, ProgressBar, Badge, Divider, Button, Card, SectionTitle } from './design-system'

// 1. Аватар
interface AvatarProps {
  initials: string
  color?: string
  colorBg?: string
  size?: 'sm' | 'md' | 'lg'
}

