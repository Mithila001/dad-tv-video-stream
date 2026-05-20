import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserRole = 'Network Operator' | 'Viewer'

export interface AuthUser {
  readonly username: string
  readonly email: string
  readonly role: UserRole
}

export interface LoginInput {
  readonly username: string
  readonly email: string
  readonly role: UserRole
}

export interface AuthContextValue {
  readonly currentUser: AuthUser | null
  readonly login: (user: LoginInput) => void
  readonly logout: () => void
  readonly isAuthenticated: boolean
  readonly isNetworkOperator: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const defaultUser: AuthUser = {
  username: 'Network Operator',
  email: 'ops@lobbystream.tv',
  role: 'Network Operator',
}

export interface AuthProviderProps {
  readonly children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      login: (user) => {
        setCurrentUser({
          username: user.username,
          email: user.email,
          role: user.role,
        })
      },
      logout: () => {
        setCurrentUser(null)
      },
      isAuthenticated: currentUser !== null,
      isNetworkOperator: currentUser?.role === 'Network Operator',
    }),
    [currentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export { defaultUser }