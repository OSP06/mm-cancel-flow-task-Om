// app/api/cancellation/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

// Assign or fetch variant
async function getOrAssignVariant(userId: string, subscriptionId: string): Promise<"A" | "B"> {
  const { data } = await supabase
    .from("cancellations")
    .select("downsell_variant")
    .eq("user_id", userId)
    .eq("subscription_id", subscriptionId)
    .single()

  if (data?.downsell_variant) return data.downsell_variant

  // Use crypto.randomBytes() for broader compatibility
  const buffer = crypto.randomBytes(1) // Get 1 random byte
  const randomValue = buffer.readUInt8(0) // Convert it to a number

  // 50/50 split based on odd or even number
  const variant: "A" | "B" = randomValue % 2 === 0 ? "A" : "B"

  await supabase.from("cancellations").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    downsell_variant: variant,
  })

  return variant
}

export async function POST(request: Request) {
  try {
    const { user_id, subscription_id, get_variant, accepted_downsell, reason } = await request.json()

    if (!user_id || !subscription_id) {
      return NextResponse.json({ success: false, message: "Missing user_id or subscription_id" }, { status: 400 })
    }

    if (get_variant) {
      const variant = await getOrAssignVariant(user_id, subscription_id)
      return NextResponse.json({ success: true, variant }, { status: 200 })
    }

    if (typeof accepted_downsell !== "boolean") {
      return NextResponse.json({ success: false, message: "accepted_downsell must be boolean" }, { status: 400 })
    }

    if (reason && typeof reason !== "string") {
      return NextResponse.json({ success: false, message: "reason must be string" }, { status: 400 })
    }

    await supabase
      .from("cancellations")
      .update({ accepted_downsell, reason })
      .eq("user_id", user_id)
      .eq("subscription_id", subscription_id)

    if (!accepted_downsell) {
      await supabase
        .from("subscriptions")
        .update({ status: "pending_cancellation", updated_at: new Date() })
        .eq("id", subscription_id)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
