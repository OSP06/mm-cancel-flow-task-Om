// Database type definitions for TypeScript support
export interface User {
  id: string
  email: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  monthly_price: number
  status: "active" | "pending_cancellation" | "cancelled"
  created_at: string
  updated_at: string
}

export interface Cancellation {
  id: string
  user_id: string
  subscription_id: string
  downsell_variant: "A" | "B"
  reason?: string
  accepted_downsell: boolean
  created_at: string
}
