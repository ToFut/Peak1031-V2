# Peak 1031 - Next-Gen Frontend Architecture Plan

## 🎯 GOAL: Transform to Modern React Architecture

### Current Problems:
- 82 files with massive duplication
- Mixed concerns (UI + Logic + Data)
- Monolithic components (58KB files)
- No clear boundaries
- Hard to test/maintain

### Target Architecture: Feature-Based + Atomic Design

## 📁 NEW DIRECTORY STRUCTURE

```
src/
├── 📁 app/                          # App-level configuration
│   ├── store.ts                     # Redux/Zustand store
│   ├── router.tsx                   # App routing
│   └── providers.tsx                # Context providers
│
├── 📁 shared/                       # Shared across entire app
│   ├── ui/                          # Design system components
│   │   ├── atoms/                   # Button, Input, Badge
│   │   ├── molecules/               # SearchBox, Card, Modal
│   │   └── organisms/               # Table, Form, Layout
│   ├── hooks/                       # Reusable hooks
│   ├── utils/                       # Pure functions
│   ├── types/                       # TypeScript definitions
│   └── constants/                   # App constants
│
├── 📁 entities/                     # Business entities (Domain Layer)
│   ├── user/                        # User domain
│   │   ├── api.ts                   # User API calls
│   │   ├── types.ts                 # User types
│   │   ├── hooks.ts                 # useUser, useAuth
│   │   └── utils.ts                 # User utilities
│   ├── exchange/                    # Exchange domain
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── hooks.ts                 # useExchange, useExchanges
│   │   └── components/              # Exchange-specific components
│   │       ├── ExchangeCard.tsx
│   │       ├── ExchangeStatus.tsx
│   │       └── ExchangeForm.tsx
│   ├── document/                    # Document domain
│   ├── task/                        # Task domain
│   └── message/                     # Message domain
│
├── 📁 features/                     # Feature-based organization
│   ├── auth/                        # Authentication feature
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   └── pages/
│   │       └── LoginPage.tsx
│   │
│   ├── dashboard/                   # Dashboard feature
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── RoleBasedContent.tsx
│   │   ├── hooks/
│   │   │   └── useDashboard.ts
│   │   └── pages/
│   │       └── DashboardPage.tsx    # SINGLE dashboard
│   │
│   ├── exchanges/                   # Exchange management feature
│   │   ├── components/
│   │   │   ├── ExchangeList.tsx
│   │   │   ├── ExchangeDetails.tsx
│   │   │   └── ExchangeActions.tsx
│   │   ├── hooks/
│   │   │   ├── useExchangeList.ts
│   │   │   └── useExchangeDetails.ts
│   │   └── pages/
│   │       ├── ExchangesPage.tsx
│   │       └── ExchangeDetailsPage.tsx
│   │
│   ├── documents/                   # Document management
│   ├── tasks/                       # Task management
│   └── contacts/                    # Contact management
│
└── 📁 pages/                        # Only route components
    ├── DashboardPage.tsx            # Route wrapper only
    ├── ExchangesPage.tsx            # Route wrapper only
    └── NotFoundPage.tsx
```

## 🎯 KEY PRINCIPLES

### 1. Single Responsibility Principle
```typescript
// ❌ BEFORE: Giant component doing everything
const AdminDashboard = () => {
  // 500+ lines mixing UI, logic, API calls, state management
}

// ✅ AFTER: Composed components with single responsibilities
const DashboardPage = () => {
  return (
    <DashboardLayout>
      <DashboardHeader />
      <RoleBasedContent />
      <DashboardStats />
    </DashboardLayout>
  )
}
```

### 2. Atomic Design System
```typescript
// Design System Hierarchy
atoms/     → Button, Input, Badge, Icon
molecules/ → SearchBox, Card, Dropdown
organisms/ → Table, Form, Navigation
templates/ → PageLayout, DashboardLayout
pages/     → Complete pages composed from templates
```

### 3. Feature-Based Architecture
```typescript
// ❌ BEFORE: Technical separation
components/ExchangeCard.tsx
components/ExchangeList.tsx
pages/ExchangePage.tsx
hooks/useExchange.ts

// ✅ AFTER: Feature-based grouping
features/exchanges/
  components/ExchangeCard.tsx
  components/ExchangeList.tsx
  hooks/useExchange.ts
  pages/ExchangePage.tsx
```

### 4. Entity-Driven Development
```typescript
// Business entities with clear boundaries
entities/exchange/
  api.ts          // All exchange API calls
  types.ts        // Exchange TypeScript types
  hooks.ts        // Exchange-specific hooks
  utils.ts        // Exchange business logic
  components/     // Exchange UI components
```

## 📊 IMPACT ANALYSIS

### Current State:
- 82 files total
- 42 components (many duplicate)
- 32 pages (massive overlap)
- Mixed concerns everywhere

### After Restructure:
- ~35-40 files total (50% reduction)
- Clear separation of concerns
- Single source of truth per feature
- Highly testable and maintainable
- Modern React patterns

## 🚀 MIGRATION STRATEGY

### Phase 1: Create New Structure
1. Set up new directory structure
2. Create shared/ui design system
3. Extract reusable hooks

### Phase 2: Migrate Features
1. Start with auth feature (simplest)
2. Migrate dashboard (most complex)
3. Migrate exchanges, documents, etc.

### Phase 3: Cleanup
1. Remove old files
2. Update imports
3. Clean up unused code

## 💡 MODERN PATTERNS TO IMPLEMENT

### 1. Custom Hooks for Data Fetching
```typescript
// entities/exchange/hooks.ts
export const useExchanges = () => {
  return useQuery(['exchanges'], exchangeApi.getAll)
}

export const useExchange = (id: string) => {
  return useQuery(['exchange', id], () => exchangeApi.getById(id))
}
```

### 2. Compound Components
```typescript
// shared/ui/organisms/Table.tsx
export const Table = {
  Root: TableRoot,
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
}

// Usage
<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Cell>Name</Table.Cell>
    </Table.Row>
  </Table.Header>
</Table.Root>
```

### 3. Role-Based Rendering
```typescript
// shared/components/RoleGuard.tsx
export const RoleGuard = ({ roles, children }) => {
  const { user } = useAuth()
  return roles.includes(user.role) ? children : null
}

// Usage
<RoleGuard roles={['admin', 'coordinator']}>
  <AdminOnlyFeature />
</RoleGuard>
```

## 🎯 BENEFITS

1. **50% fewer files** - Eliminate duplication
2. **Faster development** - Clear patterns to follow
3. **Better testing** - Isolated, focused components
4. **Easier maintenance** - Single source of truth
5. **Better performance** - Optimized component structure
6. **Team scalability** - Clear boundaries and patterns