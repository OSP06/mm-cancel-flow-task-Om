"use client"

import { useState, useEffect } from "react"

type Variant = "A" | "B"

export function useCancellationFlow(userId: string, subscriptionId: string) {
  const [variant, setVariant] = useState<Variant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !subscriptionId) return

    async function fetchVariant() {
      try {
        setLoading(true)
        setError(null)

        console.log("[v0] Fetching variant", { userId, subscriptionId })

        const res = await fetch("/api/cancellation", {  // API path
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            subscription_id: subscriptionId,
            get_variant: true,
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        console.log("[v0] API response data:", data)

        if (data.success) setVariant(data.variant)
        else setError(data.message || "Failed to fetch variant")
      } catch (err) {
        console.error("[v0] Error fetching variant:", err)
        setError("Network error")
      } finally {
        setLoading(false)
      }
    }

    fetchVariant()
  }, [userId, subscriptionId])

  const submitCancellation = async (accepted_downsell: boolean, reason?: string) => {
    try {
      console.log("[v0] Submitting cancellation:", { accepted_downsell, reason })
      const res = await fetch("/api/cancellation", {  //  API path
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          subscription_id: subscriptionId,
          accepted_downsell,
          reason,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error("[v0] Error submitting cancellation:", err)
    }
  }

  return { variant, loading, error, submitCancellation }
}
