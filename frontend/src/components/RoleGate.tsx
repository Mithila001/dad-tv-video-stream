import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { useAuth, type UserRole } from '../context/AuthContext'

export interface RoleGateProps {
  readonly requiredRole?: UserRole
  readonly allowedRoles?: ReadonlyArray<UserRole>
  readonly children: ReactNode
  readonly mode?: 'hide' | 'disable'
  readonly fallback?: ReactNode
  readonly className?: string
}

export function RoleGate({
  requiredRole,
  allowedRoles,
  children,
  mode = 'hide',
  fallback = null,
  className,
}: RoleGateProps) {
  const { currentUser } = useAuth()

  const hasAccess = allowedRoles
    ? allowedRoles.includes(currentUser?.role ?? 'Viewer')
    : currentUser?.role === requiredRole

  if (hasAccess) {
    return <>{children}</>
  }

  if (mode === 'disable' && isValidElement(children)) {
    const childElement = children as ReactElement<{
      readonly className?: string
      readonly disabled?: boolean
      readonly 'aria-disabled'?: boolean
      readonly tabIndex?: number
    }>

    return cloneElement(childElement, {
      disabled: true,
      'aria-disabled': true,
      tabIndex: -1,
      className: [childElement.props.className, className]
        .filter(Boolean)
        .join(' '),
    })
  }

  return <>{fallback}</>
}